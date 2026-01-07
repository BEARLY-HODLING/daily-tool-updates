/**
 * Capture command - Get daily update from Grok Tasks
 *
 * Supports:
 * - --clipboard: Manual paste from clipboard
 * - --browser: Automated browser capture (default)
 */

import chalk from "chalk";
import ora from "ora";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { DailyUpdate } from "../models/types";

const DATA_DIR = join(import.meta.dir, "../../data");
const COOKIES_PATH = join(DATA_DIR, ".grok-cookies.json");

interface CaptureOptions {
  clipboard?: boolean;
  browser?: boolean;
  login?: boolean;
  date: string;
}

export async function captureCommand(options: CaptureOptions): Promise<void> {
  const spinner = ora("Capturing daily update...").start();

  try {
    const { clipboard, login, date } = options;
    let content: string;

    if (login) {
      // Interactive login mode - opens visible browser
      spinner.text = "Opening browser for login...";
      content = await captureFromBrowser(spinner, true);
    } else if (clipboard) {
      // Read from clipboard (user pasted content)
      spinner.text = "Reading from clipboard...";
      content = await readFromClipboard();
    } else {
      // Browser automation with Puppeteer (headless)
      spinner.text = "Launching browser...";
      content = await captureFromBrowser(spinner, false);
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

/**
 * Capture from Grok Tasks using Puppeteer browser automation
 * @param spinner - ora spinner instance
 * @param interactive - if true, opens visible browser for login
 */
async function captureFromBrowser(
  spinner: ReturnType<typeof ora>,
  interactive: boolean = false,
): Promise<string> {
  const puppeteer = await import("puppeteer");

  // Launch browser (headless unless interactive login mode)
  const browser = await puppeteer.default.launch({
    headless: !interactive,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: interactive ? null : { width: 1280, height: 800 },
  });

  if (interactive) {
    spinner.info("Browser opened - please login to your X account");
    console.log(
      chalk.yellow(
        "\n  After logging in, the page will navigate to Grok Tasks.",
      ),
    );
    console.log(
      chalk.yellow("  Cookies will be saved automatically for future runs."),
    );
    console.log(
      chalk.gray("  Close the browser when done, or wait for auto-capture.\n"),
    );
  }

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Load cookies if they exist (for authentication)
    if (existsSync(COOKIES_PATH)) {
      spinner.text = "Loading saved cookies...";
      try {
        const cookiesJson = await readFile(COOKIES_PATH, "utf-8");
        const cookies = JSON.parse(cookiesJson);
        await page.setCookie(...cookies);
      } catch (e) {
        console.log(
          chalk.yellow("  Could not load cookies, may need to login"),
        );
      }
    }

    // Navigate to Grok Tasks
    spinner.text = "Navigating to Grok Tasks...";
    await page.goto("https://grok.com/tasks", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for content to load
    spinner.text = "Waiting for content...";
    await page.waitForSelector("body", { timeout: 10000 });

    // Check if we need to login
    const currentUrl = page.url();
    if (currentUrl.includes("login") || currentUrl.includes("auth")) {
      if (interactive) {
        // Wait for user to login manually
        spinner.info("Waiting for login... (complete login in browser)");

        // Wait up to 5 minutes for login
        const maxWait = 5 * 60 * 1000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
          await new Promise((r) => setTimeout(r, 2000));
          const url = page.url();
          if (!url.includes("login") && !url.includes("auth")) {
            spinner.succeed("Login successful!");
            break;
          }
        }

        // Re-navigate to tasks after login
        spinner.text = "Navigating to Grok Tasks...";
        await page.goto("https://grok.com/tasks", {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
      } else {
        spinner.warn("Login required for Grok Tasks");
        console.log(chalk.yellow("\n  To set up automated capture:"));
        console.log(chalk.gray("  1. Run: bun run capture --login"));
        console.log(chalk.gray("  2. Login to your X account in the browser"));
        console.log(chalk.gray("  3. Cookies will be saved for future runs"));
        console.log(chalk.yellow("\n  For now, use clipboard mode:"));
        console.log(chalk.gray("  bun run capture --clipboard"));
        await browser.close();
        return "";
      }
    }

    // Try to find and click on the daily Claude update task
    spinner.text = "Looking for daily update task...";

    // Wait for task list to appear
    await page.waitForSelector('[role="main"], main, .task-list, article', {
      timeout: 10000,
    });

    // Look for the Claude update task and extract content
    const content = await page.evaluate(() => {
      // Try multiple selectors to find the update content
      const selectors = [
        // Task content area
        '[data-testid="task-content"]',
        ".task-content",
        "article",
        '[role="article"]',
        // Main content area
        "main",
        '[role="main"]',
        // Fallback to body
        "body",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Get text content, clean it up
          const text = element.innerText || element.textContent || "";
          // Only return if it looks like a Claude update
          if (
            text.includes("Claude") ||
            text.includes("Tool") ||
            text.includes("Daily")
          ) {
            return text.trim();
          }
        }
      }

      // Fallback: get all visible text
      return document.body.innerText || "";
    });

    // Save cookies for next time
    spinner.text = "Saving cookies...";
    const cookies = await page.cookies();
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));

    await browser.close();
    return content;
  } catch (error) {
    await browser.close();
    throw error;
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
