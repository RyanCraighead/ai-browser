export type VisitEvent = {
  url: string;
  title: string;
  host: string;
  baseUrl: string;
  timestamp: number;
};

type SiteEntry = {
  host: string;
  baseUrl: string;
  title: string;
  count: number;
  lastVisited: number;
  recentUrls: string[];
};

type VisitMemoryState = {
  visits: VisitEvent[];
  sites: Record<string, SiteEntry>;
};

export type FrequentSite = SiteEntry & {
  score: number;
};

const STORAGE_KEY = 'visitMemory:v1';
const MAX_VISITS = 500;
const MAX_RECENT_URLS = 6;
const DUPLICATE_WINDOW_MS = 15000;

const isSpecialUrl = (url: string) =>
  url.startsWith('data:') ||
  url.startsWith('blob:') ||
  url.startsWith('about:') ||
  url.startsWith('file:');

const safeUrl = (raw: string): URL | null => {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
};

const baseUrlFor = (url: URL) => `${url.protocol}//${url.host}`;

const uniquePush = (items: string[], value: string, max: number) => {
  const next = [value, ...items.filter((x) => x !== value)];
  return next.slice(0, max);
};

export class VisitMemoryService {
  private static instance: VisitMemoryService;
  private state: VisitMemoryState = { visits: [], sites: {} };

  private constructor() {
    this.load();
  }

  static getInstance(): VisitMemoryService {
    if (!VisitMemoryService.instance) {
      VisitMemoryService.instance = new VisitMemoryService();
    }
    return VisitMemoryService.instance;
  }

  private load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as VisitMemoryState;
      if (!parsed || typeof parsed !== 'object') return;
      this.state = {
        visits: Array.isArray(parsed.visits) ? parsed.visits : [],
        sites: parsed.sites && typeof parsed.sites === 'object' ? parsed.sites : {}
      };
    } catch (error) {
      console.error('Failed to load visit memory:', error);
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save visit memory:', error);
    }
  }

  recordVisit(rawUrl: string, rawTitle?: string) {
    if (!rawUrl || isSpecialUrl(rawUrl)) return;
    const url = safeUrl(rawUrl);
    if (!url) return;

    const host = url.host;
    const baseUrl = baseUrlFor(url);
    const title = (rawTitle || host).trim() || host;
    const timestamp = Date.now();
    const lastVisit = this.state.visits[0];
    const isDuplicateRecent =
      Boolean(lastVisit) &&
      lastVisit.url === rawUrl &&
      timestamp - lastVisit.timestamp < DUPLICATE_WINDOW_MS;

    const existing = this.state.sites[host];
    const nextEntry: SiteEntry = existing
      ? {
          ...existing,
          title: title || existing.title,
          count: isDuplicateRecent ? existing.count : existing.count + 1,
          lastVisited: timestamp,
          recentUrls: uniquePush(existing.recentUrls || [], rawUrl, MAX_RECENT_URLS)
        }
      : {
          host,
          baseUrl,
          title,
          count: 1,
          lastVisited: timestamp,
          recentUrls: [rawUrl]
        };

    this.state.sites[host] = nextEntry;
    if (isDuplicateRecent && lastVisit) {
      this.state.visits[0] = { ...lastVisit, title, timestamp };
    } else {
      this.state.visits = [
        { url: rawUrl, title, host, baseUrl, timestamp },
        ...this.state.visits
      ].slice(0, MAX_VISITS);
    }

    this.save();
  }

  getRecentVisits(limit = 20): VisitEvent[] {
    return this.state.visits.slice(0, Math.max(1, limit));
  }

  private score(entry: SiteEntry): number {
    const daysSince = Math.max(0, (Date.now() - entry.lastVisited) / (1000 * 60 * 60 * 24));
    const recencyBonus = Math.max(0, 5 - daysSince);
    return entry.count + recencyBonus;
  }

  getFrequentSites(limit = 8): FrequentSite[] {
    const sites = Object.values(this.state.sites);
    const ranked = sites
      .map((entry) => ({ ...entry, score: this.score(entry) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.lastVisited - a.lastVisited;
      });
    return ranked.slice(0, Math.max(1, limit));
  }

  searchSites(query: string, limit = 6): FrequentSite[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getFrequentSites(limit);
    const matched = Object.values(this.state.sites)
      .filter((entry) =>
        entry.host.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.recentUrls.some((url) => url.toLowerCase().includes(q))
      )
      .map((entry) => ({ ...entry, score: this.score(entry) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.lastVisited - a.lastVisited;
      });
    return matched.slice(0, Math.max(1, limit));
  }

  getMemorySummary(limit = 6): string {
    const top = this.getFrequentSites(limit);
    if (!top.length) {
      return 'No frequent sites recorded yet.';
    }
    return top
      .map((site, idx) => {
        const last = new Date(site.lastVisited).toLocaleString();
        return `${idx + 1}. ${site.title} (${site.host}) - visits: ${site.count}, last: ${last}`;
      })
      .join('\n');
  }
}
