/**
 * GitHub API client for ScoutLayer outbound sourcing.
 * Uses GITHUB_PAT for authenticated requests (5000 req/hr limit).
 * All functions return typed results or a structured error — never throw raw.
 */

const GITHUB_API = 'https://api.github.com';

function getHeaders(): HeadersInit {
  const pat = process.env.GITHUB_PAT;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (pat) {
    headers['Authorization'] = `Bearer ${pat}`;
  }
  return headers;
}

export type GitHubError = {
  ok: false;
  status: number;
  message: string;
  rateLimited: boolean;
};

export type GitHubOk<T> = { ok: true; data: T };
export type GitHubResult<T> = GitHubOk<T> | GitHubError;

async function ghFetch<T>(url: string): Promise<GitHubResult<T>> {
  try {
    const res = await fetch(url, { headers: getHeaders() });

    // Rate limit handling
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get('x-ratelimit-reset');
      const resetAt = reset ? new Date(parseInt(reset) * 1000).toISOString() : 'unknown';
      return {
        ok: false,
        status: res.status,
        message: `GitHub rate limit exceeded. Resets at ${resetAt}.`,
        rateLimited: true,
      };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        message: (body as any)?.message ?? `GitHub API error ${res.status}`,
        rateLimited: false,
      };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      message: err?.message ?? 'Network error reaching GitHub',
      rateLimited: false,
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
}

export interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
  blog: string | null;
  avatar_url: string;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  twitter_username: string | null;
}

export interface RepoSearchOptions {
  sort?: 'stars' | 'forks' | 'updated';
  order?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
  minStars?: number;
  createdAfter?: string; // ISO date string, e.g. "2023-01-01"
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search GitHub repos matching a query string.
 * @param query   Free-text search (can include qualifiers like "language:python")
 * @param options Sort order, pagination, and filter options
 */
export async function searchRepos(
  query: string,
  options: RepoSearchOptions = {}
): Promise<GitHubResult<{ total_count: number; items: GitHubRepo[] }>> {
  const {
    sort = 'stars',
    order = 'desc',
    perPage = 30,
    page = 1,
    minStars,
    createdAfter,
  } = options;

  // Split the query by spaces or commas, filter out empty strings, and join back.
  // In GitHub Search, keywords separated by spaces are implicitly ANDed together.
  // We'll strip any broad OR-like formatting to ensure clean AND semantics.
  const queryTerms = query.split(/[\s,]+/).filter(Boolean).join(' ');
  let q = queryTerms;
  if (q && minStars !== undefined) q += ` stars:>=${minStars}`;
  if (q && createdAfter) q += ` created:>=${createdAfter}`;

  const params = new URLSearchParams({
    q,
    sort,
    order,
    per_page: String(perPage),
    page: String(page),
  });

  return ghFetch(`${GITHUB_API}/search/repositories?${params}`);
}

/**
 * Fetch a GitHub user's public profile.
 */
export async function getUserProfile(username: string): Promise<GitHubResult<GitHubUser>> {
  return ghFetch(`${GITHUB_API}/users/${username}`);
}

/**
 * Fetch a user's top public repos (sorted by stars, descending).
 * Only returns non-fork repos; capped at top 10.
 */
export async function getUserRepos(
  username: string,
  limit = 10
): Promise<GitHubResult<GitHubRepo[]>> {
  const params = new URLSearchParams({
    type: 'owner',
    sort: 'stars',
    direction: 'desc',
    per_page: String(Math.min(limit, 30)),
    page: '1',
  });

  const result = await ghFetch<GitHubRepo[]>(
    `${GITHUB_API}/users/${username}/repos?${params}`
  );

  if (!result.ok) return result;

  // Filter out forks, return only repos owned by the user
  const filtered = result.data.filter((r) => r.owner.login === username);
  return { ok: true, data: filtered };
}

/**
 * Returns remaining rate limit info. Useful for logging.
 */
export async function getRateLimitStatus(): Promise<
  GitHubResult<{ limit: number; remaining: number; reset: number }>
> {
  const result = await ghFetch<{ rate: { limit: number; remaining: number; reset: number } }>(
    `${GITHUB_API}/rate_limit`
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.rate };
}
