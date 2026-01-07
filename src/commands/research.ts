/**
 * Research command - Gather data on each tool
 */

import chalk from "chalk";
import ora from "ora";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type {
  Tool,
  ToolResearch,
  GitHubData,
  NpmData,
  DailyUpdate,
} from "../models/types";
import { fetchGitHubData } from "../services/github";
import { fetchNpmData } from "../services/npm";

const DATA_DIR = join(import.meta.dir, "../../data");

interface ResearchOptions {
  date: string;
  tool?: string;
}

export async function researchCommand(options: ResearchOptions): Promise<void> {
  const spinner = ora("Loading parsed update...").start();

  try {
    const { date, tool: specificTool } = options;
    const parsedPath = join(DATA_DIR, "updates", `${date}.json`);

    if (!existsSync(parsedPath)) {
      spinner.fail(`No parsed update found for ${date}`);
      console.log(chalk.yellow(`  Run 'bun run parse' first`));
      return;
    }

    const dailyUpdate: DailyUpdate = JSON.parse(
      await readFile(parsedPath, "utf-8"),
    );
    let toolsToResearch = dailyUpdate.tools;

    // Filter to specific tool if requested
    if (specificTool) {
      toolsToResearch = toolsToResearch.filter(
        (t) =>
          t.slug === specificTool ||
          t.name.toLowerCase().includes(specificTool.toLowerCase()),
      );
      if (toolsToResearch.length === 0) {
        spinner.fail(`Tool '${specificTool}' not found`);
        return;
      }
    }

    spinner.succeed(`Found ${toolsToResearch.length} tools to research`);

    // Research each tool
    const toolsDir = join(DATA_DIR, "tools");
    await mkdir(toolsDir, { recursive: true });

    for (const tool of toolsToResearch) {
      const toolSpinner = ora(`Researching ${tool.name}...`).start();

      try {
        const research = await researchTool(tool);

        // Save research to markdown file
        const mdContent = generateResearchMarkdown(research);
        const mdPath = join(toolsDir, `${tool.slug}.md`);
        await writeFile(mdPath, mdContent);

        // Also save JSON for scoring
        const jsonPath = join(toolsDir, `${tool.slug}.json`);
        await writeFile(jsonPath, JSON.stringify(research, null, 2));

        toolSpinner.succeed(`${tool.name} - researched`);

        // Show summary
        if (research.github) {
          console.log(
            chalk.gray(
              `    ⭐ ${research.github.stars} stars, ${research.github.forks} forks`,
            ),
          );
        }
        if (research.npm) {
          console.log(
            chalk.gray(
              `    📦 ${research.npm.weeklyDownloads.toLocaleString()} weekly downloads`,
            ),
          );
        }
      } catch (error) {
        toolSpinner.fail(`${tool.name} - failed`);
        console.log(
          chalk.red(
            `    ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    }

    console.log(
      chalk.green(`\n✅ Research complete for ${toolsToResearch.length} tools`),
    );
  } catch (error) {
    spinner.fail("Failed to research tools");
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  }
}

async function researchTool(tool: Tool): Promise<ToolResearch> {
  const research: ToolResearch = {
    tool,
    webSources: [],
    researchedAt: new Date().toISOString(),
  };

  // Try to find GitHub repo
  const githubUrl = extractGitHubUrl(tool);
  if (githubUrl) {
    try {
      research.github = await fetchGitHubData(githubUrl);
    } catch (e) {
      console.log(chalk.gray(`    No GitHub data: ${e}`));
    }
  }

  // Try to find npm package
  const npmPackage = extractNpmPackage(tool);
  if (npmPackage) {
    try {
      research.npm = await fetchNpmData(npmPackage);
    } catch (e) {
      console.log(chalk.gray(`    No npm data: ${e}`));
    }
  }

  return research;
}

function extractGitHubUrl(tool: Tool): string | null {
  // First check if we already have a GitHub URL from parsing
  if (tool.githubUrl && tool.githubUrl.includes("github.com/")) {
    return tool.githubUrl;
  }

  const text = `${tool.description} ${tool.installCommand || ""} ${tool.source || ""}`;

  // Look for GitHub URLs in text
  const githubMatch = text.match(/github\.com\/([^\/\s]+\/[^\/\s]+)/i);
  if (githubMatch) {
    return `https://github.com/${githubMatch[1].replace(/[^\w\-\/]/g, "")}`;
  }

  return null;
}

function extractNpmPackage(tool: Tool): string | null {
  const text = `${tool.installCommand || ""} ${tool.description}`;

  // Look for npm install commands
  const npmMatch = text.match(/npm\s+i(?:nstall)?\s+(?:-g\s+)?([^\s]+)/i);
  if (npmMatch) {
    return npmMatch[1].replace(/['"]/g, "");
  }

  // Look for bun add
  const bunMatch = text.match(/bun\s+add\s+([^\s]+)/i);
  if (bunMatch) {
    return bunMatch[1].replace(/['"]/g, "");
  }

  return null;
}

function generateResearchMarkdown(research: ToolResearch): string {
  const { tool, github, npm } = research;

  let md = `# ${tool.name}\n\n`;
  md += `> ${tool.description}\n\n`;

  md += `## Overview\n\n`;
  md += `- **Category:** ${tool.category}\n`;
  md += `- **Source:** ${tool.source || "Unknown"}\n`;
  if (tool.installCommand) {
    md += `- **Install:** \`${tool.installCommand}\`\n`;
  }
  md += `- **Researched:** ${research.researchedAt}\n\n`;

  if (github) {
    md += `## GitHub Stats\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Stars | ${github.stars.toLocaleString()} |\n`;
    md += `| Forks | ${github.forks.toLocaleString()} |\n`;
    md += `| Open Issues | ${github.openIssues} |\n`;
    md += `| Last Commit | ${github.lastCommitDate} |\n`;
    md += `| Language | ${github.language} |\n`;
    md += `| License | ${github.license || "None"} |\n`;
    md += `| Has Tests | ${github.hasTests ? "Yes" : "No"} |\n`;
    md += `| Has CI | ${github.hasCI ? "Yes" : "No"} |\n\n`;
  }

  if (npm) {
    md += `## npm Stats\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Package | ${npm.packageName} |\n`;
    md += `| Version | ${npm.version} |\n`;
    md += `| Weekly Downloads | ${npm.weeklyDownloads.toLocaleString()} |\n`;
    md += `| Last Published | ${npm.lastPublished} |\n`;
    md += `| Dependencies | ${npm.dependencies} |\n\n`;
  }

  return md;
}

export { researchTool };
