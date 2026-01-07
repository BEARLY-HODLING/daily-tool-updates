/**
 * Score command - Evaluate and rank tools
 */

import chalk from "chalk";
import ora from "ora";
import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type {
  ToolResearch,
  ToolScore,
  Recommendation,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
} from "../models/types";

const DATA_DIR = join(import.meta.dir, "../../data");

interface ScoreOptions {
  date: string;
}

export async function scoreCommand(options: ScoreOptions): Promise<void> {
  const spinner = ora("Loading researched tools...").start();

  try {
    const { date } = options;
    const toolsDir = join(DATA_DIR, "tools");
    const scoresDir = join(DATA_DIR, "scores");

    if (!existsSync(toolsDir)) {
      spinner.fail("No researched tools found");
      console.log(chalk.yellow(`  Run 'bun run research' first`));
      return;
    }

    // Find all tool research JSON files
    const files = await readdir(toolsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
      spinner.fail("No tool research data found");
      return;
    }

    spinner.succeed(`Found ${jsonFiles.length} tools to score`);

    // Score each tool
    const scores: ToolScore[] = [];

    for (const file of jsonFiles) {
      const toolSpinner = ora(
        `Scoring ${file.replace(".json", "")}...`,
      ).start();

      try {
        const research: ToolResearch = JSON.parse(
          await readFile(join(toolsDir, file), "utf-8"),
        );

        const score = scoreTool(research);
        scores.push(score);

        const emoji =
          score.recommendation === "BUILD"
            ? "🚀"
            : score.recommendation === "WATCH"
              ? "👀"
              : "⏭️";

        toolSpinner.succeed(
          `${research.tool.name}: ${score.totalScore}/100 ${emoji} ${score.recommendation}`,
        );
      } catch (error) {
        toolSpinner.fail(`Failed to score ${file}`);
      }
    }

    // Sort by score
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // Save scores
    await mkdir(scoresDir, { recursive: true });
    const scoresPath = join(scoresDir, `${date}.json`);
    await writeFile(scoresPath, JSON.stringify(scores, null, 2));

    // Summary
    console.log(chalk.cyan("\n📊 Score Summary:\n"));

    const builds = scores.filter((s) => s.recommendation === "BUILD");
    const watches = scores.filter((s) => s.recommendation === "WATCH");
    const skips = scores.filter((s) => s.recommendation === "SKIP");

    if (builds.length > 0) {
      console.log(chalk.green(`  🚀 BUILD (${builds.length}):`));
      builds.forEach((s) =>
        console.log(chalk.white(`     ${s.tool.name} (${s.totalScore}/100)`)),
      );
    }

    if (watches.length > 0) {
      console.log(chalk.yellow(`\n  👀 WATCH (${watches.length}):`));
      watches.forEach((s) =>
        console.log(chalk.gray(`     ${s.tool.name} (${s.totalScore}/100)`)),
      );
    }

    if (skips.length > 0) {
      console.log(chalk.gray(`\n  ⏭️  SKIP (${skips.length}):`));
      skips.forEach((s) =>
        console.log(chalk.gray(`     ${s.tool.name} (${s.totalScore}/100)`)),
      );
    }

    console.log(chalk.gray(`\n  Saved to: ${scoresPath}`));
  } catch (error) {
    spinner.fail("Failed to score tools");
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error)),
    );
  }
}

/**
 * Score a tool based on research data
 */
function scoreTool(research: ToolResearch): ToolScore {
  const config = {
    weights: { usefulness: 0.3, quality: 0.3, innovation: 0.2, momentum: 0.2 },
    thresholds: { build: 70, watch: 40 },
  };

  const notes: string[] = [];

  // Calculate usefulness score (0-100)
  const usefulnessScore = calculateUsefulnessScore(research, notes);

  // Calculate quality score (0-100)
  const qualityScore = calculateQualityScore(research, notes);

  // Calculate innovation score (0-100)
  const innovationScore = calculateInnovationScore(research, notes);

  // Calculate momentum score (0-100)
  const momentumScore = calculateMomentumScore(research, notes);

  // Weighted total
  const totalScore = Math.round(
    usefulnessScore * config.weights.usefulness +
      qualityScore * config.weights.quality +
      innovationScore * config.weights.innovation +
      momentumScore * config.weights.momentum,
  );

  // Determine recommendation
  let recommendation: Recommendation;
  if (totalScore >= config.thresholds.build) {
    recommendation = "BUILD";
  } else if (totalScore >= config.thresholds.watch) {
    recommendation = "WATCH";
  } else {
    recommendation = "SKIP";
  }

  return {
    tool: research.tool,
    research,
    usefulnessScore,
    qualityScore,
    innovationScore,
    momentumScore,
    totalScore,
    recommendation,
    notes,
    scoredAt: new Date().toISOString(),
  };
}

function calculateUsefulnessScore(
  research: ToolResearch,
  notes: string[],
): number {
  let score = 50; // Base score

  const { tool } = research;
  const text =
    `${tool.name} ${tool.description} ${tool.category}`.toLowerCase();

  // Boost for Claude-related tools
  if (text.includes("claude") || text.includes("anthropic")) {
    score += 20;
    notes.push("Claude-related tool (+20)");
  }

  // Boost for CLI/plugin tools (matches user's patterns)
  if (tool.category === "claude-plugin" || tool.category === "claude-skill") {
    score += 15;
    notes.push("Claude plugin/skill (+15)");
  }

  if (tool.category === "cli-tool") {
    score += 10;
    notes.push("CLI tool (+10)");
  }

  // Boost if has install command (easy to try)
  if (tool.installCommand) {
    score += 5;
    notes.push("Has install command (+5)");
  }

  return Math.min(100, Math.max(0, score));
}

function calculateQualityScore(
  research: ToolResearch,
  notes: string[],
): number {
  let score = 30; // Base score

  const { github, npm } = research;

  if (github) {
    // Stars
    if (github.stars > 1000) {
      score += 25;
      notes.push(`High stars: ${github.stars} (+25)`);
    } else if (github.stars > 100) {
      score += 15;
      notes.push(`Good stars: ${github.stars} (+15)`);
    } else if (github.stars > 10) {
      score += 5;
      notes.push(`Some stars: ${github.stars} (+5)`);
    }

    // Has tests
    if (github.hasTests) {
      score += 10;
      notes.push("Has tests (+10)");
    }

    // Has CI
    if (github.hasCI) {
      score += 5;
      notes.push("Has CI (+5)");
    }

    // Has license
    if (github.license) {
      score += 5;
      notes.push("Has license (+5)");
    }
  }

  if (npm) {
    // Downloads
    if (npm.weeklyDownloads > 10000) {
      score += 15;
      notes.push(`High npm downloads (+15)`);
    } else if (npm.weeklyDownloads > 1000) {
      score += 10;
      notes.push(`Good npm downloads (+10)`);
    }
  }

  return Math.min(100, Math.max(0, score));
}

function calculateInnovationScore(
  research: ToolResearch,
  notes: string[],
): number {
  let score = 50; // Base score

  const text =
    `${research.tool.name} ${research.tool.description}`.toLowerCase();

  // Look for innovative keywords
  const innovativeTerms = [
    "novel",
    "first",
    "unique",
    "new approach",
    "revolutionary",
    "breakthrough",
  ];
  for (const term of innovativeTerms) {
    if (text.includes(term)) {
      score += 15;
      notes.push(`Innovative term: "${term}" (+15)`);
      break;
    }
  }

  // Boost for AI/LLM related
  if (text.includes("ai") || text.includes("llm") || text.includes("agent")) {
    score += 10;
    notes.push("AI/LLM related (+10)");
  }

  return Math.min(100, Math.max(0, score));
}

function calculateMomentumScore(
  research: ToolResearch,
  notes: string[],
): number {
  let score = 40; // Base score

  const { github, npm } = research;

  if (github) {
    // Recent commits
    const lastCommit = new Date(github.lastCommitDate);
    const daysSinceCommit =
      (Date.now() - lastCommit.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCommit < 7) {
      score += 30;
      notes.push("Very recent activity (<7 days) (+30)");
    } else if (daysSinceCommit < 30) {
      score += 20;
      notes.push("Recent activity (<30 days) (+20)");
    } else if (daysSinceCommit < 90) {
      score += 10;
      notes.push("Some activity (<90 days) (+10)");
    }
  }

  if (npm) {
    // Recent publish
    const lastPublish = new Date(npm.lastPublished);
    const daysSincePublish =
      (Date.now() - lastPublish.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSincePublish < 30) {
      score += 15;
      notes.push("Recently published (+15)");
    }
  }

  return Math.min(100, Math.max(0, score));
}

export { scoreTool };
