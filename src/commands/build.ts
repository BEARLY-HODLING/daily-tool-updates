/**
 * Build command - Install and test tools in sandbox
 */

import chalk from "chalk";
import ora from "ora";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { ToolResearch, ToolScore } from "../models/types";

const DATA_DIR = join(import.meta.dir, "../../data");
const SANDBOX_DIR = join(import.meta.dir, "../../sandbox");

interface BuildOptions {
  tool: string;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const spinner = ora(`Looking for tool: ${options.tool}...`).start();

  try {
    const toolsDir = join(DATA_DIR, "tools");

    if (!existsSync(toolsDir)) {
      spinner.fail("No researched tools found");
      console.log(chalk.yellow("  Run 'bun run research' first"));
      return;
    }

    // Find the tool
    const files = await readdir(toolsDir);
    const toolFile = files.find(
      (f) =>
        f.endsWith(".json") &&
        (f.replace(".json", "") === options.tool ||
          f.toLowerCase().includes(options.tool.toLowerCase())),
    );

    if (!toolFile) {
      spinner.fail(`Tool '${options.tool}' not found`);
      console.log(chalk.yellow("\n  Available tools:"));
      files
        .filter((f) => f.endsWith(".json"))
        .forEach((f) =>
          console.log(chalk.gray(`    - ${f.replace(".json", "")}`)),
        );
      return;
    }

    const research: ToolResearch = JSON.parse(
      await readFile(join(toolsDir, toolFile), "utf-8"),
    );

    spinner.succeed(`Found: ${research.tool.name}`);
    console.log(chalk.gray(`  ${research.tool.description.slice(0, 80)}...`));

    // Create sandbox directory for this tool
    const toolSandbox = join(SANDBOX_DIR, research.tool.slug);
    await mkdir(toolSandbox, { recursive: true });

    console.log(chalk.cyan(`\n📦 Building in sandbox: ${toolSandbox}\n`));

    // Determine install method
    if (research.tool.installCommand) {
      const cmd = research.tool.installCommand;

      // Security: Validate install command against safe patterns
      const safePatterns = [
        /^npm\s+i(nstall)?\s+(-g\s+)?[\w@\-\/\.]+$/i,
        /^bun\s+(add|install)\s+(-g\s+)?[\w@\-\/\.]+$/i,
        /^yarn\s+add\s+(-g\s+)?[\w@\-\/\.]+$/i,
        /^pip\s+install\s+[\w\-\.]+$/i,
        /^docker\s+pull\s+[\w\-\.\/\:]+$/i,
        /^git\s+clone\s+https?:\/\/[\w\-\.\/]+$/i,
      ];

      const isSafeCommand = safePatterns.some((pattern) => pattern.test(cmd));

      if (!isSafeCommand) {
        console.log(
          chalk.yellow(`\n⚠️  Install command requires confirmation:`),
        );
        console.log(chalk.white(`    ${cmd}`));
        console.log(
          chalk.gray(`\n  This command doesn't match safe patterns.`),
        );
        console.log(chalk.gray(`  Run manually in: ${toolSandbox}`));
      } else {
        const installSpinner = ora("Installing...").start();

        try {
          // Parse safe command into arguments (avoid shell interpretation)
          const args = cmd.split(/\s+/);
          const executable = args[0];
          const execArgs = args.slice(1);

          const proc = Bun.spawn([executable, ...execArgs], {
            cwd: toolSandbox,
            stdout: "pipe",
            stderr: "pipe",
          });

          const exitCode = await proc.exited;

          if (exitCode === 0) {
            installSpinner.succeed("Installed successfully");
          } else {
            const stderr = await new Response(proc.stderr).text();
            installSpinner.fail(`Install failed (exit code ${exitCode})`);
            console.log(chalk.red(stderr));
          }
        } catch (error) {
          installSpinner.fail("Install failed");
          console.log(
            chalk.red(error instanceof Error ? error.message : String(error)),
          );
        }
      }
    } else if (research.github) {
      // Clone from GitHub
      const cloneSpinner = ora("Cloning from GitHub...").start();

      try {
        const proc = Bun.spawn(
          ["git", "clone", "--depth", "1", research.github.repoUrl, "."],
          {
            cwd: toolSandbox,
            stdout: "pipe",
            stderr: "pipe",
          },
        );

        const exitCode = await proc.exited;

        if (exitCode === 0) {
          cloneSpinner.succeed("Cloned successfully");

          // Try to install dependencies
          const installSpinner = ora("Installing dependencies...").start();

          // Check for package.json
          if (existsSync(join(toolSandbox, "package.json"))) {
            const installProc = Bun.spawn(["bun", "install"], {
              cwd: toolSandbox,
              stdout: "pipe",
              stderr: "pipe",
            });
            await installProc.exited;
            installSpinner.succeed("Dependencies installed");
          } else {
            installSpinner.info("No package.json found");
          }
        } else {
          const stderr = await new Response(proc.stderr).text();
          cloneSpinner.fail("Clone failed");
          console.log(chalk.red(stderr));
        }
      } catch (error) {
        cloneSpinner.fail("Clone failed");
        console.log(
          chalk.red(error instanceof Error ? error.message : String(error)),
        );
      }
    } else {
      console.log(chalk.yellow("  No install method available"));
      console.log(chalk.gray("  Manually install from the source."));
    }

    // Generate build report
    const report = `# Build Report: ${research.tool.name}

## Tool Info
- **Name:** ${research.tool.name}
- **Category:** ${research.tool.category}
- **Source:** ${research.tool.source || "Unknown"}

## Installation
- **Command:** ${research.tool.installCommand || "N/A"}
- **GitHub:** ${research.github?.repoUrl || "N/A"}
- **Sandbox:** ${toolSandbox}

## Build Status
- **Built at:** ${new Date().toISOString()}
- **Status:** Attempted

## Next Steps
1. Check the sandbox directory for the installed tool
2. Run any tests or examples
3. Integrate into your project if useful

---
*Built by Daily Tool Updates CLI*
`;

    const reportPath = join(toolSandbox, "BUILD_REPORT.md");
    await writeFile(reportPath, report);

    console.log(chalk.green(`\n✅ Build complete!`));
    console.log(chalk.gray(`  Sandbox: ${toolSandbox}`));
    console.log(chalk.gray(`  Report: ${reportPath}`));
  } catch (error) {
    spinner.fail("Build failed");
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  }
}
