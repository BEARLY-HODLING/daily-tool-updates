# Daily Tool Updates - CLI Tool

## Overview

Bun CLI tool that captures, researches, scores, and builds Claude-related tools from Grok Tasks daily updates.

**Tech Stack:** Bun, TypeScript, Commander CLI, Puppeteer

## Quick Start

### Recommended: `/dtu` Skill (Claude in Chrome)

The easiest way to run the pipeline - uses Claude in Chrome extension to capture from an already-open Grok Tasks tab (bypasses CAPTCHA):

```
/dtu
```

Requires: Grok Tasks open in Brave browser + Claude in Chrome extension connected.

### Alternative: `dtu` Global CLI

```bash
# Link the CLI globally (one-time setup)
cd /Users/bhal/Downloads/claude/daily-tool-updates && bun link

# Run from anywhere
dtu daily --clipboard    # Full pipeline with manual paste
dtu capture              # Just capture
dtu report               # Just regenerate report
```

### Manual Steps

```bash
bun install
bun run daily --clipboard
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

| Variable       | Description                                           |
| -------------- | ----------------------------------------------------- |
| `GITHUB_TOKEN` | Optional: GitHub API token for higher rate limits     |
| `BROWSER_PATH` | Optional: Path to browser executable (default: Brave) |

## Daily Automation (launchd)

Automated daily runs at 7pm via macOS LaunchAgent:

```bash
# Install schedule
./scripts/install-schedule.sh

# Check status
launchctl list | grep dailytoolsupdates

# Manual run
./scripts/daily-run.sh

# View logs
cat logs/$(date +%Y-%m-%d).log

# Uninstall
launchctl unload ~/Library/LaunchAgents/com.dailytoolsupdates.plist
```

Note: Browser automation (Puppeteer) gets blocked by CAPTCHA. Use `/dtu` skill or `--clipboard` flag instead.

## Security Notes

- **Build command**: Validates install commands against whitelist patterns before execution
- **Date validation**: Prevents path traversal via date parameter
- **Safe patterns**: Only npm/bun/yarn/pip/docker/git commands with validated syntax are auto-executed
- **Unsafe commands**: Require manual confirmation before running

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
