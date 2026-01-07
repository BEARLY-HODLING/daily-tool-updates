# Daily Tool Updates - CLI Tool

## Overview

Bun CLI tool that captures, researches, scores, and builds Claude-related tools from Grok Tasks daily updates.

**Tech Stack:** Bun, TypeScript, Commander CLI

## Quick Start

```bash
# Install dependencies
bun install

# Run full daily pipeline (with manual clipboard input)
bun run daily --clipboard

# Or run individual steps
bun run capture --clipboard
bun run parse
bun run research
bun run score
bun run report
```

## Project Structure

```
daily-tool-updates/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # CLI commands
│   │   ├── capture.ts     # Capture from Grok Tasks
│   │   ├── parse.ts       # Parse tools from markdown
│   │   ├── research.ts    # Research tools (GitHub, npm)
│   │   ├── score.ts       # Score and rank tools
│   │   ├── report.ts      # Generate summary reports
│   │   └── daily.ts       # Full pipeline
│   ├── services/          # External API integrations
│   │   ├── github.ts      # GitHub API
│   │   └── npm.ts         # npm Registry API
│   └── models/
│       └── types.ts       # TypeScript interfaces
├── data/                  # Generated data (git-ignored)
│   ├── updates/           # Raw daily updates
│   ├── tools/             # Tool research files
│   ├── scores/            # Scoring results
│   └── reports/           # Final reports
└── sandbox/               # Tool testing area
```

## Pipeline Flow

```
Capture → Parse → Research → Score → Report
   │         │         │         │        │
   ▼         ▼         ▼         ▼        ▼
 .md      tools[]   GitHub    0-100   markdown
 file     objects    npm     ratings   report
```

## Scoring Algorithm

| Dimension  | Weight | Description                          |
| ---------- | ------ | ------------------------------------ |
| Usefulness | 30%    | Relevance to Claude/iOS/web projects |
| Quality    | 30%    | GitHub stars, tests, CI, license     |
| Innovation | 20%    | Novel approach, AI/LLM related       |
| Momentum   | 20%    | Recent commits, npm downloads        |

**Recommendations:**

- BUILD (≥70): Worth integrating
- WATCH (40-69): Monitor for future
- SKIP (<40): Not relevant

## Environment Variables

| Variable       | Description                                       |
| -------------- | ------------------------------------------------- |
| `GITHUB_TOKEN` | Optional: GitHub API token for higher rate limits |

## Bun Conventions

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>`
- Use `bun test` instead of `jest`
- Use `bun install` instead of `npm install`
- Bun automatically loads .env

## Commands Reference

```bash
# Capture today's update
bun run capture --clipboard    # Manual paste
bun run capture                # Browser automation (TODO)

# Parse tools from update
bun run parse
bun run parse --date 2026-01-07

# Research tools
bun run research               # All tools
bun run research --tool name   # Specific tool

# Score tools
bun run score

# Generate report
bun run report

# Full pipeline
bun run daily --clipboard
```

## Data Files

All generated data is in `data/`:

- `data/updates/YYYY-MM-DD.md` - Raw Grok Tasks content
- `data/updates/YYYY-MM-DD.json` - Parsed update with tools
- `data/tools/{slug}.md` - Tool research markdown
- `data/tools/{slug}.json` - Tool research data
- `data/scores/YYYY-MM-DD.json` - All tool scores
- `data/reports/YYYY-MM-DD-report.md` - Daily summary

## Adding Features

### New Scoring Criteria

Edit `src/commands/score.ts`:

- Add calculation in `calculate*Score()` functions
- Update weights in `scoreTool()`

### New Research Sources

Add new service in `src/services/`:

- Create async fetch function
- Add to `researchTool()` in `src/commands/research.ts`
- Update `ToolResearch` type in `src/models/types.ts`
