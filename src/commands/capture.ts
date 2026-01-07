/**
 * Capture command - Get daily update from Grok Tasks
 */

import chalk from "chalk";
import ora from "ora";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { DailyUpdate } from "../models/types";

const DATA_DIR = join(import.meta.dir, "../../data");

interface CaptureOptions {
  clipboard?: boolean;
  date: string;
}

export async function captureCommand(options: CaptureOptions): Promise<void> {
  const spinner = ora("Capturing daily update...").start();

  try {
    const { clipboard, date } = options;
    let content: string;

    if (clipboard) {
      // Read from clipboard (user pasted content)
      spinner.text = "Reading from clipboard...";
      content = await readFromClipboard();
    } else {
      // TODO: Browser automation with Puppeteer
      spinner.fail("Browser automation not yet implemented");
      console.log(
        chalk.yellow("\nUse --clipboard flag to paste content manually:"),
      );
      console.log(chalk.gray("  bun run capture --clipboard"));
      console.log(
        chalk.gray("\nThen paste your Grok Tasks content when prompted."),
      );
      return;
    }

    if (!content || content.trim().length === 0) {
      spinner.fail("No content captured");
      return;
    }

    // Ensure data directory exists
    const updatesDir = join(DATA_DIR, "updates");
    await mkdir(updatesDir, { recursive: true });

    // Save raw content
    const filename = `${date}.md`;
    const filepath = join(updatesDir, filename);
    await writeFile(filepath, content);

    spinner.succeed(`Captured update for ${date}`);
    console.log(chalk.gray(`  Saved to: ${filepath}`));
    console.log(chalk.gray(`  Size: ${content.length} characters`));

    // Quick preview
    const lines = content.split("\n").slice(0, 5);
    console.log(chalk.gray("\n  Preview:"));
    lines.forEach((line) =>
      console.log(chalk.gray(`    ${line.slice(0, 60)}...`)),
    );
  } catch (error) {
    spinner.fail("Failed to capture update");
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  }
}

async function readFromClipboard(): Promise<string> {
  // For Bun, we can use the native clipboard API or prompt for input
  // Since clipboard access requires special permissions, let's prompt for input

  console.log(chalk.cyan("\n📋 Paste your Grok Tasks content below."));
  console.log(chalk.gray("   Press Ctrl+D (or Cmd+D on Mac) when done:\n"));

  const chunks: string[] = [];

  // Read from stdin until EOF
  const reader = Bun.stdin.stream().getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }
  } finally {
    reader.releaseLock();
  }

  return chunks.join("");
}

/**
 * Parse raw content into structured DailyUpdate
 * (Used internally, main parsing is in parse.ts)
 */
export function quickParse(
  content: string,
  date: string,
): Partial<DailyUpdate> {
  // Count sources if mentioned
  const xPostsMatch = content.match(/(\d+)\s*X\s*posts?/i);
  const webPagesMatch = content.match(/(\d+)\s*web\s*pages?/i);

  return {
    date,
    rawContent: content,
    sourcesSearched: {
      xPosts: xPostsMatch ? parseInt(xPostsMatch[1]) : 0,
      webPages: webPagesMatch ? parseInt(webPagesMatch[1]) : 0,
    },
    capturedAt: new Date().toISOString(),
  };
}
