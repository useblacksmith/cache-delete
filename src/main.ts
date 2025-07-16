import { getInput, setFailed, info } from "@actions/core";
import fetch, { RequestInit, Response } from "node-fetch";

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Retry loop completed without return or throw");
}

interface DeleteCacheParams {
  cacheKey: string;
  cacheVersion?: string;
  prefix?: boolean;
  baseUrl?: string;
  cacheToken?: string;
}

export async function deleteCache({
  cacheKey,
  cacheVersion,
  prefix = false,
  baseUrl = process.env.ACTIONS_RESULTS_URL ?? "",
  cacheToken = process.env["BLACKSMITH_CACHE_TOKEN"],
}: DeleteCacheParams): Promise<void> {
  if (!baseUrl) {
    throw new Error("ACTIONS_RESULTS_URL not set");
  }

  if (!cacheKey && !prefix) {
    throw new Error("Cache key cannot be empty unless prefix is true");
  }
  if (cacheVersion && !cacheKey) {
    throw new Error("Cannot specify version when using empty key");
  }
  if (prefix && cacheVersion) {
    throw new Error("Cannot specify version when using prefix");
  }

  // The baseURL always has a trailing slash, but we still add it in case it is missing.
  if (!baseUrl.endsWith("/")) {
    baseUrl = `${baseUrl}/`;
  }
  const url = `${baseUrl}twirp/github.actions.results.api.v1.CacheService/DeleteCacheEntry`;

  const response = await fetchWithRetry(url, {
    // Twirp endpoints all use POST.
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json; version=6.0-preview.1",
      Authorization: `Bearer ${cacheToken}`,
    },
    body: JSON.stringify({
      key: cacheKey,
      version: cacheVersion,
      prefix,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Failed to delete cache: ${response.status} ${response.statusText}`
    );
  }

  if (response.status === 404) {
    info(
      `Cache not found${cacheKey ? `: ${cacheKey}` : ""}${cacheVersion ? `@${cacheVersion}` : ""}`
    );
  } else {
    const data = await response.json();
    info(
      `Successfully deleted ${prefix ? "caches with prefix" : "cache"}${
        cacheVersion ? " version" : ""
      }: ${cacheKey}${cacheVersion ? `@${cacheVersion}` : ""}`
    );
    if (data.count !== undefined) {
      info(`Deleted ${data.count} cache entries`);
    }
  }
}

async function run(): Promise<void> {
  try {
    const cacheKey = getInput("key");
    const cacheVersion = getInput("version");
    const prefix = getInput("prefix") === "true";

    await deleteCache({ cacheKey, cacheVersion, prefix });
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed("An unexpected error occurred");
    }
  }
}

run();
