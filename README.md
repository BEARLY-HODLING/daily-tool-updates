# Daily Tool Updates

CLI tool that captures, researches, scores, and builds Claude-related tools from Grok Tasks daily updates.

## What It Does

Every day, Grok Tasks generates a summary of new Claude/AI coding tools from X posts and web sources. This CLI helps you:

1. **Capture** - Save the daily update from clipboard
2. **Parse** - Extract individual tools from the markdown
3. **Research** - Fetch GitHub stats (stars, forks, activity) and npm data
4. **Score** - Evaluate tools using a weighted algorithm
5. **Report** - Generate a summary with BUILD/WATCH/SKIP recommendations
6. **Build** - Test high-potential tools in a sandbox

## Installation

```bash
# Clone the repo
git clone https://github.com/BEARLY-HODLING/daily-tool-updates.git
cd daily-tool-updates

# Install dependencies
bun install
```

Requires [Bun](https://bun.sh) runtime.

## Usage

### Full Pipeline

```bash
# Run complete pipeline with clipboard input
bun run daily --clipboard
```

This will prompt you to paste the Grok Tasks update, then automatically parse, research, score, and generate a report.

### Individual Commands

```bash
# Capture today's update from clipboard
bun run capture --clipboard

# Parse tools from the captured update
bun run parse

# Research all parsed tools (GitHub + npm)
bun run research

# Score tools and generate recommendations
bun run score

# Generate daily report
bun run report

# Build/test a specific tool in sandbox
bun run build <tool-name>
```

### Options

```bash
# Specify a different date
bun run parse --date 2026-01-07

# Research a specific tool only
bun run research --tool aider
```

## Scoring Algorithm

Tools are scored 0-100 using weighted criteria:

| Dimension      | Weight | Factors                                           |
| -------------- | ------ | ------------------------------------------------- |
| **Usefulness** | 30%    | Claude-related, has install command, plugin/skill |
| **Quality**    | 30%    | GitHub stars, tests, CI, license                  |
| **Innovation** | 20%    | Novel approach, AI/LLM related                    |
| **Momentum**   | 20%    | Recent commits, npm downloads                     |

### Recommendations

- **BUILD** (≥70) - Worth integrating into your workflow
- **WATCH** (40-69) - Monitor for future potential
- **SKIP** (<40) - Not relevant or low quality

## Output Files

All generated data is saved to `data/` (git-ignored):

```
data/
├── updates/
│   ├── 2026-01-07.md      # Raw captured update
│   └── 2026-01-07.json    # Parsed tools
├── tools/
│   ├── aider.json         # Research data
│   └── aider.md           # Research summary
├── scores/
│   └── 2026-01-07.json    # All tool scores
└── reports/
    └── 2026-01-07-report.md  # Daily summary
```

## Example Report

```markdown
# Daily Tool Update Report - 2026-01-07

## Summary

- Tools Evaluated: 5
- BUILD: 1
- WATCH: 4
- SKIP: 0

## Recommended to BUILD

### Claude Code Memory Plugin (74/100)

> Persistent memory system for Claude Code

**Scores:**

- Usefulness: 90/100
- Quality: 75/100
- Innovation: 50/100
- Momentum: 70/100

## Watch List

- LangGraph Studio (68/100)
- OpenHands (65/100)
- Aider (65/100)
```

## Environment Variables

| Variable       | Description                                       |
| -------------- | ------------------------------------------------- |
| `GITHUB_TOKEN` | Optional: GitHub API token for higher rate limits |

## Project Structure

```
daily-tool-updates/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # CLI commands
│   │   ├── capture.ts
│   │   ├── parse.ts
│   │   ├── research.ts
│   │   ├── score.ts
│   │   ├── report.ts
│   │   ├── daily.ts
│   │   └── build.ts
│   ├── services/          # API integrations
│   │   ├── github.ts
│   │   └── npm.ts
│   └── models/
│       └── types.ts       # TypeScript interfaces
├── data/                  # Generated data (git-ignored)
└── sandbox/               # Tool testing area (git-ignored)
```

## License

MIT
