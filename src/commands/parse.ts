/**
 * Parse command - Extract tools from captured update
 */

import chalk from "chalk";
import ora from "ora";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type {
  Tool,
  DailyUpdate,
  NewsItem,
  ToolCategory,
} from "../models/types";

const DATA_DIR = join(import.meta.dir, "../../data");

interface ParseOptions {
  date: string;
}

export async function parseCommand(options: ParseOptions): Promise<void> {
  const spinner = ora("Parsing daily update...").start();

  try {
    const { date } = options;
    const updatePath = join(DATA_DIR, "updates", `${date}.md`);

    if (!existsSync(updatePath)) {
      spinner.fail(`No update found for ${date}`);
      console.log(chalk.yellow(`  Run 'bun run capture --clipboard' first`));
      return;
    }

    spinner.text = "Reading update file...";
    const content = await readFile(updatePath, "utf-8");

    spinner.text = "Extracting tools...";
    const tools = extractTools(content);
    const news = extractNews(content);

    // Create DailyUpdate object
    const dailyUpdate: DailyUpdate = {
      date,
      rawContent: content,
      news,
      tools,
      sourcesSearched: extractSources(content),
      capturedAt: new Date().toISOString(),
    };

    // Save parsed data as JSON
    const toolsDir = join(DATA_DIR, "tools");
    await mkdir(toolsDir, { recursive: true });

    const parsedPath = join(DATA_DIR, "updates", `${date}.json`);
    await writeFile(parsedPath, JSON.stringify(dailyUpdate, null, 2));

    spinner.succeed(`Parsed ${tools.length} tools from ${date}`);
    console.log(chalk.gray(`  News items: ${news.length}`));
    console.log(chalk.gray(`  Saved to: ${parsedPath}`));

    // List tools found
    if (tools.length > 0) {
      console.log(chalk.cyan("\n  Tools found:"));
      tools.forEach((tool, i) => {
        console.log(chalk.white(`    ${i + 1}. ${tool.name}`));
        console.log(chalk.gray(`       ${tool.description.slice(0, 60)}...`));
      });
    }
  } catch (error) {
    spinner.fail("Failed to parse update");
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  }
}

/**
 * Extract tool entries from markdown content
 * Handles formats:
 * 1. H3 headers: ### Tool Name
 * 2. Bullet format: - **Tool Name**: Description
 */
function extractTools(content: string): Tool[] {
  const tools: Tool[] = [];
  const lines = content.split("\n");

  // H3 header pattern: ### Tool Name - Optional Subtitle
  const h3Pattern = /^###\s+(.+?)(?:\s*[-–—]\s*(.+))?$/;
  // Bullet with bold name: - **Name**: Description (but NOT metadata fields)
  const bulletPattern = /^[\s•\-\*]+\*\*([^*]+)\*\*[:\s]+(.+)/;
  // Metadata field names to skip
  const metadataFields = [
    "installation",
    "github",
    "application",
    "source",
    "npm",
    "usage",
    "docs",
    "license",
  ];
  // Metadata extraction patterns
  const installPattern = /\*\*Installation:\*\*\s*`?([^`\n]+)`?/i;
  const githubPattern = /\*\*GitHub:\*\*\s*(https?:\/\/[^\s\n]+)/i;
  const applicationPattern = /\*\*Application:\*\*\s*([^\n]+)/i;
  const sourcePattern = /\*\*Source:\*\*\s*(@[\w_]+)/i;

  let currentTool: Partial<Tool> | null = null;
  let currentDescription: string[] = [];
  let currentBlock: string[] = [];

  const saveTool = () => {
    if (currentTool && currentTool.name) {
      const blockText = currentBlock.join("\n");

      // Extract metadata from block
      const installMatch = blockText.match(installPattern);
      if (installMatch) currentTool.installCommand = installMatch[1].trim();

      const githubMatch = blockText.match(githubPattern);
      if (githubMatch) currentTool.githubUrl = githubMatch[1].trim();

      const appMatch = blockText.match(applicationPattern);
      if (appMatch && !currentDescription.length) {
        currentDescription.push(appMatch[1].trim());
      }

      const sourceMatch = blockText.match(sourcePattern);
      if (sourceMatch) currentTool.source = sourceMatch[1].trim();

      tools.push(finalizeTool(currentTool, currentDescription.join(" ")));
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for H3 header (tool name)
    const h3Match = trimmed.match(h3Pattern);
    if (h3Match) {
      saveTool();
      currentTool = {
        name: h3Match[1].trim(),
        slug: slugify(h3Match[1].trim()),
        extractedAt: new Date().toISOString(),
      };
      currentDescription = h3Match[2] ? [h3Match[2].trim()] : [];
      currentBlock = [];
      continue;
    }

    // Check for bullet with bold name (but skip metadata fields)
    const bulletMatch = trimmed.match(bulletPattern);
    if (bulletMatch) {
      const fieldName = bulletMatch[1].trim().toLowerCase();
      // Skip if this is a metadata field, not a tool name
      if (!metadataFields.includes(fieldName.replace(":", ""))) {
        saveTool();
        currentTool = {
          name: bulletMatch[1].trim(),
          slug: slugify(bulletMatch[1].trim()),
          extractedAt: new Date().toISOString(),
        };
        currentDescription = [bulletMatch[2].trim()];
        currentBlock = [];
        continue;
      }
    }

    // Collect lines for current tool
    if (currentTool) {
      currentBlock.push(line);

      // Non-metadata description lines (first paragraph after header)
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("#") &&
        currentDescription.length === 0
      ) {
        currentDescription.push(trimmed);
      }
    }
  }

  // Don't forget the last tool
  saveTool();

  return tools;
}

function finalizeTool(partial: Partial<Tool>, description: string): Tool {
  return {
    name: partial.name || "Unknown",
    slug: partial.slug || slugify(partial.name || "unknown"),
    description: description.slice(0, 500), // Truncate long descriptions
    installCommand: partial.installCommand,
    githubUrl: partial.githubUrl,
    source: partial.source,
    category: detectCategory(partial.name || "", description),
    extractedAt: partial.extractedAt || new Date().toISOString(),
  };
}

function detectCategory(name: string, description: string): ToolCategory {
  const text = `${name} ${description}`.toLowerCase();

  if (text.includes("plugin") || text.includes("claude code"))
    return "claude-plugin";
  if (text.includes("skill")) return "claude-skill";
  if (text.includes("cli") || text.includes("command")) return "cli-tool";
  if (text.includes("framework")) return "framework";
  if (text.includes("npm") || text.includes("package")) return "npm-package";

  return "other";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractNews(content: string): NewsItem[] {
  const news: NewsItem[] = [];
  // Look for section 1 content (Key News & Announcements)
  const newsSection = content.match(/1\.\s*Key\s*News[^]*?(?=2\.|$)/i);

  if (newsSection) {
    const bullets = newsSection[0].match(/[•\-\*]\s*([^•\-\*\n]+)/g);
    if (bullets) {
      bullets.forEach((bullet) => {
        const text = bullet.replace(/^[•\-\*]\s*/, "").trim();
        if (text.length > 20) {
          news.push({
            headline: text.split(":")[0] || text.slice(0, 50),
            summary: text,
          });
        }
      });
    }
  }

  return news;
}

function extractSources(content: string): { xPosts: number; webPages: number } {
  const xMatch = content.match(/(\d+)\s*X\s*posts?/i);
  const webMatch = content.match(/(\d+)\s*web\s*pages?/i);

  return {
    xPosts: xMatch ? parseInt(xMatch[1]) : 0,
    webPages: webMatch ? parseInt(webMatch[1]) : 0,
  };
}

export { extractTools, extractNews };
