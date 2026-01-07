/**
 * Daily command - Full pipeline execution
 */

import chalk from "chalk";
import { captureCommand } from "./capture";
import { parseCommand } from "./parse";
import { researchCommand } from "./research";
import { scoreCommand } from "./score";
import { reportCommand } from "./report";

interface DailyOptions {
  clipboard?: boolean;
}

export async function dailyCommand(options: DailyOptions): Promise<void> {
  const date = new Date().toISOString().split("T")[0];

  console.log(chalk.cyan.bold("\n🔄 Running Daily Pipeline\n"));
  console.log(chalk.gray(`  Date: ${date}`));
  console.log(
    chalk.gray(`  Mode: ${options.clipboard ? "Clipboard" : "Browser"}\n`),
  );

  console.log(chalk.cyan("─".repeat(50)));

  // Step 1: Capture
  console.log(chalk.yellow("\n📥 Step 1: Capture\n"));
  await captureCommand({ clipboard: options.clipboard, date });

  console.log(chalk.cyan("\n" + "─".repeat(50)));

  // Step 2: Parse
  console.log(chalk.yellow("\n📝 Step 2: Parse\n"));
  await parseCommand({ date });

  console.log(chalk.cyan("\n" + "─".repeat(50)));

  // Step 3: Research
  console.log(chalk.yellow("\n🔍 Step 3: Research\n"));
  await researchCommand({ date });

  console.log(chalk.cyan("\n" + "─".repeat(50)));

  // Step 4: Score
  console.log(chalk.yellow("\n📊 Step 4: Score\n"));
  await scoreCommand({ date });

  console.log(chalk.cyan("\n" + "─".repeat(50)));

  // Step 5: Report
  console.log(chalk.yellow("\n📋 Step 5: Report\n"));
  await reportCommand({ date });

  console.log(chalk.cyan("\n" + "─".repeat(50)));

  console.log(chalk.green.bold("\n✅ Daily pipeline complete!\n"));
  console.log(chalk.gray(`  Reports saved to: data/reports/${date}-report.md`));
  console.log(
    chalk.gray(
      `  Run 'bun run build <tool-name>' to build a recommended tool\n`,
    ),
  );
}
