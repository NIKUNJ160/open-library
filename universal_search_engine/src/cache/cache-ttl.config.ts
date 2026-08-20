export const CATEGORY_TTL_SECONDS: Record<string, number> = {
  books: parseInt(process.env.CACHE_TTL_BOOKS || '86400', 10),
  papers: parseInt(process.env.CACHE_TTL_PAPERS || '43200', 10),
  datasets: parseInt(process.env.CACHE_TTL_DATASETS || '21600', 10),
  patents: parseInt(process.env.CACHE_TTL_PATENTS || '86400', 10),
  repos: parseInt(process.env.CACHE_TTL_REPOS || '3600', 10),
  gov: parseInt(process.env.CACHE_TTL_GOV || '43200', 10),
  docs: parseInt(process.env.CACHE_TTL_DOCS || '86400', 10),
  default: parseInt(process.env.CACHE_TTL_DEFAULT || '3600', 10),
};

export function getTtlForCategory(category?: string): number {
  if (!category) return CATEGORY_TTL_SECONDS.default;
  const key = category.toLowerCase();
  return CATEGORY_TTL_SECONDS[key] || CATEGORY_TTL_SECONDS.default;
}
