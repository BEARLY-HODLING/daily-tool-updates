#!/usr/bin/env bun
/**
 * Daily Tool Updates CLI
 *
 * Captures, researches, scores, and builds Claude-related tools
 * from Grok Tasks daily updates.
 */

import { Command } from "commander";
import chalk from "chalk";
import { captureCommand } from "./commands/capture";
import { parseCommand } from "./commands/parse";
import { researchCommand } from "./commands/research";
import { scoreCommand } from "./commands/score";
import { reportCommand } from "./commands/report";
import { dailyCommand } from "./commands/daily";
import { buildCommand } from "./commands/build";

const program = new Command();

program
  .name("dtu")
  .description(
    "Daily Tool Updates - Capture, research, score, and build Claude tools from Grok Tasks",
  )
  .version("1.0.0");

// Capture command - get today's update from Grok Tasks
program
  .command("capture")
  .description("Capture today's update from Grok Tasks")
  .option("-c, --clipboard", "Capture from clipboard (manual paste)")
  .option("-d, --date <date>", "Specify date (YYYY-MM-DD)", getTodayDate())
  .action(captureCommand);

// Parse command - extract tools from captured update
program
  .command("parse")
  .description("Parse tools from the latest captured update")
  .option("-d, --date <date>", "Specify date (YYYY-MM-DD)", getTodayDate())
  .action(parseCommand);

// Research command - gather data on each tool
program
  .command("research")
  .description("Research all parsed tools (GitHub, npm, web)")
  .option("-d, --date <date>", "Specify date (YYYY-MM-DD)", getTodayDate())
  .option("-t, --tool <name>", "Research a specific tool only")
  .action(researchCommand);

// Score command - evaluate and rank tools
program
  .command("score")
  .description("Score all researched tools")
  .option("-d, --date <date>", "Specify date (YYYY-MM-DD)", getTodayDate())
  .action(scoreCommand);

// Report command - generate daily summary
program
  .command("report")
  .description("Generate daily summary report")
  .option("-d, --date <date>", "Specify date (YYYY-MM-DD)", getTodayDate())
  .action(reportCommand);

// Daily command - full pipeline
program
  .command("daily")
  .description("Run full pipeline: capture → parse → research → score → report")
  .option("-c, --clipboard", "Capture from clipboard instead of browser")
  .action(dailyCommand);

// Build command - install and test a tool
program
  .command("build <tool>")
  .description("Install and test a tool in the sandbox")
  .action((tool: string) => buildCommand({ tool }));

// Helper function
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Run CLI
console.log(
  chalk.cyan(`
╔═══════════════════════════════════════════════════╗
║     Daily Tool Updates - Grok Tasks Pipeline      ║
╚═══════════════════════════════════════════════════╝
`),
);

program.parse(process.argv);
