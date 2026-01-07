/**
 * npm Registry API service - Fetch package data
 */

import type { NpmData } from "../models/types";

const NPM_REGISTRY = "https://registry.npmjs.org";
const NPM_API = "https://api.npmjs.org";

/**
 * Fetch npm package data
 * @param packageName - npm package name
 */
export async function fetchNpmData(packageName: string): Promise<NpmData> {
  // Clean package name
  const cleanName = packageName.replace(/^@/, "").trim();

  // Fetch package info
  const packageResponse = await fetch(
    `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`,
  );

  if (!packageResponse.ok) {
    if (packageResponse.status === 404) {
      throw new Error(`Package not found: ${packageName}`);
    }
    throw new Error(`npm registry error: ${packageResponse.status}`);
  }

  const packageData = await packageResponse.json();

  // Get latest version info
  const latestVersion = packageData["dist-tags"]?.latest || "unknown";
  const versionData = packageData.versions?.[latestVersion] || {};

  // Fetch download counts
  let weeklyDownloads = 0;
  try {
    const downloadsResponse = await fetch(
      `${NPM_API}/downloads/point/last-week/${encodeURIComponent(packageName)}`,
    );
    if (downloadsResponse.ok) {
      const downloadsData = await downloadsResponse.json();
      weeklyDownloads = downloadsData.downloads || 0;
    }
  } catch {
    // Ignore download count errors
  }

  // Count dependencies
  const dependencies = Object.keys(versionData.dependencies || {}).length;
  const devDependencies = Object.keys(versionData.devDependencies || {}).length;

  // Get last publish date
  const time = packageData.time || {};
  const lastPublished = time[latestVersion] || time.modified || "unknown";

  return {
    packageName,
    weeklyDownloads,
    version: latestVersion,
    lastPublished,
    dependencies,
    devDependencies,
  };
}

/**
 * Search npm for a package
 */
export async function searchNpmPackage(query: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${NPM_REGISTRY}/-/v1/search?text=${encodeURIComponent(query)}&size=1`,
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.objects && data.objects.length > 0) {
      return data.objects[0].package.name;
    }
  } catch {
    // Ignore search errors
  }

  return null;
}
