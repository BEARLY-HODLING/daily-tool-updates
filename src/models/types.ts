/**
 * Tool entry extracted from Grok Tasks daily update
 */
export interface Tool {
  name: string;
  slug: string; // lowercase, hyphenated for filenames
  description: string;
  installCommand?: string;
  githubUrl?: string; // GitHub repository URL
  source?: string; // @username on X
  category: ToolCategory;
  extractedAt: string; // ISO date
}

export type ToolCategory =
  | "claude-plugin"
  | "claude-skill"
  | "npm-package"
  | "cli-tool"
  | "library"
  | "framework"
  | "other";

/**
 * Research data gathered for a tool
 */
export interface ToolResearch {
  tool: Tool;
  github?: GitHubData;
  npm?: NpmData;
  webSources: WebSource[];
  researchedAt: string; // ISO date
}

export interface GitHubData {
  repoUrl: string;
  stars: number;
  forks: number;
  openIssues: number;
  lastCommitDate: string;
  createdAt: string;
  language: string;
  license?: string;
  hasTests: boolean;
  hasCI: boolean;
  readme?: string;
}

export interface NpmData {
  packageName: string;
  weeklyDownloads: number;
  version: string;
  lastPublished: string;
  dependencies: number;
  devDependencies: number;
}

export interface WebSource {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Score breakdown for a tool
 */
export interface ToolScore {
  tool: Tool;
  research: ToolResearch;

  // Individual scores (0-100)
  usefulnessScore: number;
  qualityScore: number;
  innovationScore: number;
  momentumScore: number;

  // Weighted total (0-100)
  totalScore: number;

  // Recommendation based on total score
  recommendation: Recommendation;

  // Notes explaining the scores
  notes: string[];

  scoredAt: string; // ISO date
}

export type Recommendation = "SKIP" | "WATCH" | "BUILD";

/**
 * Daily update from Grok Tasks
 */
export interface DailyUpdate {
  date: string; // YYYY-MM-DD
  rawContent: string;
  news: NewsItem[];
  tools: Tool[];
  sourcesSearched: {
    xPosts: number;
    webPages: number;
  };
  capturedAt: string; // ISO date
}

export interface NewsItem {
  headline: string;
  summary: string;
  source?: string;
}

/**
 * Daily report summary
 */
export interface DailyReport {
  date: string;
  toolsEvaluated: number;
  recommendations: {
    build: string[];
    watch: string[];
    skip: string[];
  };
  topTools: ToolScore[];
  builtToday: string[];
  generatedAt: string;
}

/**
 * Config for scoring weights
 */
export interface ScoringConfig {
  weights: {
    usefulness: number; // Default: 0.30
    quality: number; // Default: 0.30
    innovation: number; // Default: 0.20
    momentum: number; // Default: 0.20
  };
  thresholds: {
    build: number; // Default: 70
    watch: number; // Default: 40
  };
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    usefulness: 0.3,
    quality: 0.3,
    innovation: 0.2,
    momentum: 0.2,
  },
  thresholds: {
    build: 70,
    watch: 40,
  },
};
