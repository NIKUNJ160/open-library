"use client";

// Default to relative path so the Next.js rewrite proxy handles routing.
// On Vercel: browser calls /api/v1/* → Next.js rewrites → Railway NestJS API.
// Locally: browser calls /api/v1/* → Nginx proxy → NestJS API.
// NEXT_PUBLIC_API_URL can override (e.g. for direct testing).
const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const DEFAULT_API_KEY =
  process.env.NEXT_PUBLIC_API_KEY || "demo-api-key-12345";

export interface Config {
  apiUrl: string;
  apiKey: string;
}

export function getConfig(): Config {
  if (typeof window === "undefined") {
    return { apiUrl: DEFAULT_API_URL, apiKey: DEFAULT_API_KEY };
  }

  const storedUrl = localStorage.getItem("use_api_url");
  const storedKey = localStorage.getItem("use_api_key");

  // Clear stale absolute URLs that no longer match the current origin.
  // This prevents the ERR_CONNECTION_REFUSED bug when switching between
  // local (port 3000) and Vercel deployments.
  if (
    storedUrl &&
    storedUrl.startsWith("http") &&
    !storedUrl.startsWith(window.location.origin)
  ) {
    localStorage.removeItem("use_api_url");
  }

  const apiUrl = localStorage.getItem("use_api_url") || DEFAULT_API_URL;
  const apiKey = storedKey || DEFAULT_API_KEY;
  return { apiUrl, apiKey };
}

export function setConfig(config: Partial<Config>) {
  if (typeof window === "undefined") return;
  if (config.apiUrl !== undefined) {
    localStorage.setItem("use_api_url", config.apiUrl);
  }
  if (config.apiKey !== undefined) {
    localStorage.setItem("use_api_key", config.apiKey);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchFromApi(
  endpoint: string,
  options: RequestInit = {},
  retries = 2
): Promise<any> {
  const { apiUrl, apiKey } = getConfig();
  const url = endpoint.startsWith("http") ? endpoint : `${apiUrl}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Do not retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          const errorText = await response.text();
          let errorMessage = `API Error (${response.status})`;
          try {
            const parsed = JSON.parse(errorText);
            errorMessage = parsed.message || errorMessage;
          } catch {
            if (errorText) errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }
        // Retry on 5xx server errors
        if (attempt < retries) {
          await sleep(300 * Math.pow(2, attempt));
          continue;
        }
        throw new Error(`Server Error (${response.status})`);
      }

      return response.json();
    } catch (err: any) {
      // Retry on network errors (ERR_CONNECTION_REFUSED, fetch failed, etc.)
      if (attempt < retries && err.name !== "UnauthorizedException") {
        await sleep(300 * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
}
