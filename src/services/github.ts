/**
 * GitHub API service - Fetch repository data
 */

import type { GitHubData } from "../models/types";

const GITHUB_API = "https://api.github.com";

/**
 * Fetch GitHub repository data
 * @param repoUrl - Full GitHub URL or owner/repo format
 */
export async function fetchGitHubData(repoUrl: string): Promise<GitHubData> {
  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/\s]+)/i);
  if (!match) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  const ownerRepo = match[1].replace(/\.git$/, "").replace(/[#?].*$/, "");
  const [owner, repo] = ownerRepo.split("/");

  if (!owner || !repo) {
    throw new Error(`Could not parse owner/repo from: ${repoUrl}`);
  }

  // Fetch repo data
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "daily-tool-updates",
  };

  // Add auth token if available
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers,
  });

  if (!repoResponse.ok) {
    if (repoResponse.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    if (repoResponse.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Set GITHUB_TOKEN env var.",
      );
    }
    throw new Error(`GitHub API error: ${repoResponse.status}`);
  }

  const repoData = await repoResponse.json();

  // Check for tests and CI (via repo contents)
  let hasTests = false;
  let hasCI = false;

  try {
    const contentsResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents`,
      { headers },
    );
    if (contentsResponse.ok) {
      const contents = await contentsResponse.json();
      const fileNames = contents.map((f: { name: string }) =>
        f.name.toLowerCase(),
      );

      // Check for test directories/files
      hasTests = fileNames.some(
        (f: string) =>
          f.includes("test") ||
          f.includes("spec") ||
          f === "__tests__" ||
          f === "tests",
      );

      // Check for CI config
      hasCI = fileNames.some(
        (f: string) =>
          f === ".github" ||
          f === ".circleci" ||
          f === ".travis.yml" ||
          f === "azure-pipelines.yml",
      );

      // Also check .github/workflows if .github exists
      if (fileNames.includes(".github")) {
        try {
          const workflowsResponse = await fetch(
            `${GITHUB_API}/repos/${owner}/${repo}/contents/.github/workflows`,
            { headers },
          );
          if (workflowsResponse.ok) {
            hasCI = true;
          }
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Ignore contents fetch errors
  }

  return {
    repoUrl: `https://github.com/${owner}/${repo}`,
    stars: repoData.stargazers_count || 0,
    forks: repoData.forks_count || 0,
    openIssues: repoData.open_issues_count || 0,
    lastCommitDate: repoData.pushed_at || repoData.updated_at,
    createdAt: repoData.created_at,
    language: repoData.language || "Unknown",
    license: repoData.license?.spdx_id || undefined,
    hasTests,
    hasCI,
    readme: repoData.description || undefined,
  };
}

/**
 * Search for a repository by name
 */
export async function searchGitHubRepo(query: string): Promise<string | null> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "daily-tool-updates",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=1`,
    { headers },
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (data.items && data.items.length > 0) {
    return data.items[0].html_url;
  }

  return null;
}
