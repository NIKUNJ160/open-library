"use client";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== "undefined" 
    ? `${window.location.origin}/api/v1` 
    : "http://localhost:3000/api/v1");
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_API_KEY || "demo-api-key-12345";

export interface Config {
  apiUrl: string;
  apiKey: string;
}

export function getConfig(): Config {
  if (typeof window === "undefined") {
    return { apiUrl: DEFAULT_API_URL, apiKey: DEFAULT_API_KEY };
  }
  const apiUrl = localStorage.getItem("use_api_url") || DEFAULT_API_URL;
  const apiKey = localStorage.getItem("use_api_key") || DEFAULT_API_KEY;
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

export async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
  const { apiUrl, apiKey } = getConfig();
  const url = endpoint.startsWith("http") ? endpoint : `${apiUrl}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("x-api-key")) {
    headers.set("x-api-key", apiKey);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
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

  return response.json();
}
