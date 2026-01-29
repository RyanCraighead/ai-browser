import React, { useMemo, useRef, useState, useEffect } from "react";
import { PageCustomizationPanel } from "./PageCustomizationPanel";
import { SettingsPanel } from "./SettingsPanel";
import { CerebrasService } from "./CerebrasService";
import { VisitMemoryService, FrequentSite, VisitEvent } from "./VisitMemoryService";
import { SkillMemoryService, SkillEntry, SkillStep, SkillRefinement, SkillTreeNode } from "./SkillMemoryService";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Tab = {
  id: string;
  title: string;
  url: string;
  isHome?: boolean;
};

type Bookmark = {
  id: string;
  title: string;
  url: string;
  date: number;
};

type HistoryItem = {
  id: string;
  title: string;
  url: string;
  date: number;
};

type DownloadItem = {
  id: string;
  filename: string;
  url: string;
  progress: number;
  status: 'downloading' | 'completed' | 'failed';
  date: number;
};

type AIFeature = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

type WatchedPage = {
  id: string;
  url: string;
  title: string;
  lastHash: string;
  lastChecked: number;
  notificationsEnabled: boolean;
};

type ResearchAgent = {
  id: string;
  query: string;
  status: 'idle' | 'researching' | 'completed';
  progress: number;
  results: Array<{
    url: string;
    title: string;
    summary: string;
  }>;
  startTime: number;
};

type Creation = {
  id: string;
  title: string;
  description?: string;
  type: 'webpage' | 'game' | 'app';
  prompt: string;
  html: string;
  createdAt: number;
  updatedAt: number;
};

type HomeQuickLink = {
  id: string;
  label: string;
  url: string;
  icon?: string;
};

type HomeSearchEngine = 'duckduckgo' | 'google' | 'bing';

type HomeConfig = {
  title: string;
  subtitle: string;
  backgroundStart: string;
  backgroundEnd: string;
  accent: string;
  text: string;
  card: string;
  layout: 'center' | 'split';
  showSearch: boolean;
  searchEngine: HomeSearchEngine;
  showDateTime: boolean;
  showBookmarks: boolean;
  backgroundImage: string;
  customCss: string;
  customHtml: string;
  quickLinks: HomeQuickLink[];
};

type ActionPlan = {
  actions: Array<{
    type: 'click' | 'type' | 'select' | 'scroll' | 'press' | 'focus';
    selector?: string;
    text?: string;
    value?: string;
    key?: string;
    by?: number;
    to?: number;
  }>;
  notes?: string;
};

type ContextNote = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

type ChatBrowsingAction =
  | { type: 'open_url'; url: string; inNewTab?: boolean }
  | { type: 'search'; query: string }
  | { type: 'suggest_sites'; suggestions: string[] }
  | { type: 'page_actions'; plan?: ActionPlan }
  | { type: 'create_site'; prompt: string; creationType?: Creation['type'] };

type ChatBrowsingPlan = {
  response?: string;
  actions: ChatBrowsingAction[];
  notes?: string;
};

type GoalPlan = {
  goal: string;
  steps: string[];
  successCriteria?: string[];
  questions?: string[];
};

type GoalCheck = {
  completed: boolean;
  response?: string;
  needsUserInput?: boolean;
  question?: string;
  evidence?: string;
  confidence?: number;
};

type PendingFollowUp = {
  goalText: string;
  lastUserMessage: string;
  lastAssistantMessage: string;
  planSteps?: string[];
  successCriteria?: string[];
  lastActionSummary?: string;
  url: string;
  title: string;
  completed: boolean;
  askedAt: number;
  requiresFollowUp: boolean;
};

const tryParseJson = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const extractJsonPayload = (raw: string) => {
  const direct = tryParseJson(raw);
  if (direct) return direct;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return tryParseJson(fenced[1].trim());
  }
  return null;
};

const AI_FEATURES: AIFeature[] = [
  {
    id: "summarize",
    label: "Summarize Page",
    icon: "📝",
    description: "Get a concise summary of the current page"
  },
  {
    id: "explain-simple",
    label: "Explain Like I'm 12",
    icon: "🧒",
    description: "Simplify complex concepts"
  },
  {
    id: "key-facts",
    label: "Extract Key Facts",
    icon: "🔑",
    description: "Pull out the most important information"
  },
  {
    id: "to-json",
    label: "Convert to JSON",
    icon: "{ }",
    description: "Turn page content into structured JSON"
  },
  {
    id: "checklist",
    label: "Turn into Checklist",
    icon: "✅",
    description: "Convert content into actionable items"
  },
  {
    id: "action-items",
    label: "Find Action Items",
    icon: "📋",
    description: "Identify tasks and next steps"
  }
];

const DEFAULT_HOME_CONFIG: HomeConfig = {
  title: 'AI Browser',
  subtitle: 'Build, explore, and customize your web.',
  backgroundStart: '#0f172a',
  backgroundEnd: '#020617',
  accent: '#06b6d4',
  text: '#f8fafc',
  card: 'rgba(15, 23, 42, 0.85)',
  layout: 'center',
  showSearch: true,
  searchEngine: 'duckduckgo',
  showDateTime: true,
  showBookmarks: true,
  backgroundImage: '',
  customCss: '',
  customHtml: '',
  quickLinks: [
    { id: 'ql-1', label: 'Docs', url: 'https://developer.mozilla.org', icon: '📘' },
    { id: 'ql-2', label: 'Design', url: 'https://dribbble.com', icon: '🎨' },
    { id: 'ql-3', label: 'Code', url: 'https://github.com', icon: '💻' },
    { id: 'ql-4', label: 'News', url: 'https://news.ycombinator.com', icon: '📰' }
  ]
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttr = (value: string) =>
  escapeHtml(value).replace(/`/g, '&#96;');

const buildHomeHtml = (config: HomeConfig, bookmarks: Bookmark[]) => {
  const title = escapeHtml(config.title || 'Home');
  const subtitle = escapeHtml(config.subtitle || '');
  const backgroundImage = config.backgroundImage.trim();
  const quickLinks = config.quickLinks || [];
  const layout = config.layout === 'split' ? 'split' : 'center';
  const engineMap: Record<HomeSearchEngine, string> = {
    duckduckgo: 'https://duckduckgo.com/?q=',
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q='
  };
  const engineBase = engineMap[config.searchEngine] || engineMap.duckduckgo;
  const quickLinksHtml = quickLinks.length
    ? quickLinks.map(link => `
      <a class="tile" href="${escapeAttr(link.url)}">
        <span class="tile-icon">${escapeHtml(link.icon || '🔗')}</span>
        <span class="tile-label">${escapeHtml(link.label)}</span>
        <span class="tile-url">${escapeHtml(link.url)}</span>
      </a>
    `).join('')
    : '<div class="empty">No quick links yet. Add some in Home settings.</div>';

  const bookmarkItems = config.showBookmarks
    ? bookmarks.slice(0, 6).map(item => `
      <a class="tile tile--subtle" href="${escapeAttr(item.url)}">
        <span class="tile-label">${escapeHtml(item.title || item.url)}</span>
        <span class="tile-url">${escapeHtml(item.url)}</span>
      </a>
    `).join('')
    : '';

  const bookmarksHtml = config.showBookmarks
    ? `<div class="section">
        <div class="section-title">Bookmarks</div>
        <div class="grid">${bookmarkItems || '<div class="empty">No bookmarks yet.</div>'}</div>
      </div>`
    : '';

  const customHtml = config.customHtml?.trim() ? config.customHtml : '';

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <style>
        :root {
          --bg-start: ${config.backgroundStart};
          --bg-end: ${config.backgroundEnd};
          --accent: ${config.accent};
          --text: ${config.text};
          --card: ${config.card || 'rgba(15, 23, 42, 0.85)'};
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          min-height: 100vh;
          font-family: 'Outfit', system-ui, sans-serif;
          color: var(--text);
          background: linear-gradient(135deg, var(--bg-start), var(--bg-end));
          background-attachment: fixed;
        }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: ${backgroundImage ? `url("${escapeAttr(backgroundImage)}")` : 'none'};
          background-size: cover;
          background-position: center;
          opacity: ${backgroundImage ? '0.18' : '0'};
          pointer-events: none;
        }
        .shell {
          position: relative;
          z-index: 1;
          padding: 48px clamp(20px, 6vw, 96px);
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .layout-center .hero {
          text-align: center;
          max-width: 760px;
          margin: 0 auto;
        }
        .layout-split main {
          display: grid;
          grid-template-columns: minmax(280px, 1.15fr) minmax(260px, 0.85fr);
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .layout-split main {
            grid-template-columns: 1fr;
          }
        }
        .hero h1 {
          margin: 0 0 12px;
          font-size: clamp(2rem, 3vw, 3.2rem);
        }
        .hero p {
          margin: 0 0 20px;
          font-size: 1rem;
          opacity: 0.8;
        }
        .search {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          padding: 12px;
          backdrop-filter: blur(14px);
        }
        .search input {
          flex: 1 1 220px;
          border: none;
          outline: none;
          font-size: 1rem;
          background: transparent;
          color: var(--text);
        }
        .search button {
          border: none;
          background: var(--accent);
          color: #021018;
          font-weight: 700;
          padding: 10px 18px;
          border-radius: 12px;
          cursor: pointer;
        }
        .card {
          background: var(--card);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
          padding: 20px;
          backdrop-filter: blur(16px);
        }
        .section-title {
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 12px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .tile {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px;
          border-radius: 14px;
          text-decoration: none;
          color: var(--text);
          background: rgba(2, 6, 23, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          transition: transform 0.2s ease, border 0.2s ease;
        }
        .tile:hover { transform: translateY(-2px); border-color: var(--accent); }
        .tile--subtle { background: rgba(15, 23, 42, 0.4); }
        .tile-icon { font-size: 1.2rem; }
        .tile-label { font-weight: 600; }
        .tile-url { font-size: 0.75rem; opacity: 0.65; word-break: break-word; }
        .time {
          font-size: 2rem;
          font-weight: 600;
        }
        .date {
          opacity: 0.7;
        }
        .empty {
          font-size: 0.85rem;
          opacity: 0.6;
          padding: 8px 0;
        }
        ${config.customCss || ''}
      </style>
    </head>
    <body>
      <div class="shell layout-${layout}">
        <main>
          <section class="hero">
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
            ${config.showSearch ? `
            <form class="search" id="search-form">
              <input type="text" id="search-input" placeholder="Search the web..." autocomplete="off" />
              <button type="submit">Search</button>
            </form>` : ''}
          </section>
          <section class="card">
            ${config.showDateTime ? `
            <div class="section">
              <div class="section-title">Now</div>
              <div class="time" id="time">--:--</div>
              <div class="date" id="date"></div>
            </div>` : ''}
            <div class="section">
              <div class="section-title">Quick Links</div>
              <div class="grid">${quickLinksHtml}</div>
            </div>
            ${bookmarksHtml}
            ${customHtml}
          </section>
        </main>
      </div>
      <script>
        (function () {
          const form = document.getElementById('search-form');
          if (form) {
            form.addEventListener('submit', function (event) {
              event.preventDefault();
              const input = document.getElementById('search-input');
              const query = (input && input.value || '').trim();
              if (!query) return;
              window.location.href = '${engineBase}' + encodeURIComponent(query);
            });
          }

          const timeEl = document.getElementById('time');
          const dateEl = document.getElementById('date');
          if (timeEl && dateEl) {
            const update = () => {
              const now = new Date();
              timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
            };
            update();
            setInterval(update, 60000);
          }
        })();
      </script>
    </body>
  </html>`;
};

const createDataUrl = (html: string) =>
  `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

const createHomeUrl = (html: string) => createDataUrl(html);
const DEFAULT_NEW_TAB_URL = 'about:blank';
const HOME_DISABLED = true;

const revokeIfBlob = (url?: string | null) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

const normalizeUrl = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:") || trimmed.startsWith("file:") || trimmed.startsWith("about:")) {
    return trimmed;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
};

const sanitizeFileName = (value: string) => {
  const trimmed = value.trim() || 'ai-creation';
  return trimmed.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForUrlChange = async (wv: any, beforeUrl: string, timeoutMs = 8000) => {
  if (!wv) return '';
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = wv.getURL?.() ?? '';
    if (current && current !== beforeUrl) return current;
    await delay(200);
  }
  return wv.getURL?.() ?? '';
};

const actionPlanMayNavigate = (plan: ActionPlan) =>
  plan.actions.some(action => action.type === 'click' || action.type === 'press' || action.type === 'select');

const isSkillUrl = (url: string) =>
  url.startsWith('http://') || url.startsWith('https://');

const extractDomainsFromText = (text: string) => {
  const matches = text.toLowerCase().match(/([a-z0-9-]+\.)+[a-z]{2,}/g) || [];
  return Array.from(new Set(matches));
};

const KNOWN_SITES: Array<{ label: string; host: string; url: string }> = [
  { label: 'youtube', host: 'youtube.com', url: 'https://www.youtube.com' },
  { label: 'facebook', host: 'facebook.com', url: 'https://www.facebook.com' },
  { label: 'instagram', host: 'instagram.com', url: 'https://www.instagram.com' },
  { label: 'tiktok', host: 'tiktok.com', url: 'https://www.tiktok.com' },
  { label: 'twitter', host: 'twitter.com', url: 'https://twitter.com' },
  { label: 'x', host: 'x.com', url: 'https://x.com' },
  { label: 'reddit', host: 'reddit.com', url: 'https://www.reddit.com' }
];

const getDirectNavigationTarget = (text: string) => {
  const lower = text.toLowerCase();
  for (const site of KNOWN_SITES) {
    if (lower.includes(site.label) || lower.includes(site.host)) {
      return site.url;
    }
  }
  const domains = extractDomainsFromText(lower);
  if (domains.length) {
    return `https://${domains[0]}`;
  }
  return '';
};

const extractSearchQueryFromGoal = (text: string) => {
  const lower = text.toLowerCase();
  const cleaned = lower
    .replace(/go to/g, ' ')
    .replace(/navigate to/g, ' ')
    .replace(/open/g, ' ')
    .replace(/find/g, ' ')
    .replace(/channel/g, ' ')
    .replace(/youtube/g, ' ')
    .replace(/on youtube/g, ' ')
    .replace(/the/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || text.trim();
};

const isYouTubeHomeUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('youtube.com')) return false;
    return parsed.pathname === '/' || parsed.pathname === '/feed/';
  } catch {
    return false;
  }
};

const isYouTubeResultsUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('youtube.com')) return false;
    return parsed.pathname === '/results';
  } catch {
    return false;
  }
};

const pageContainsUrl = (schemaText: string | null, domSnapshot: any, url: string) => {
  if (!url) return false;
  const normalized = url.replace(/\/$/, '').toLowerCase();
  if (schemaText && schemaText.toLowerCase().includes(normalized)) {
    return true;
  }
  if (domSnapshot) {
    try {
      const snapshotText = JSON.stringify(domSnapshot).toLowerCase();
      if (snapshotText.includes(normalized)) return true;
    } catch {
      // Ignore snapshot serialization failures.
    }
  }
  return false;
};

const isDomainRelevantToGoal = (text: string, url: string) => {
  if (!url || url.startsWith('data:') || url.startsWith('about:') || url.startsWith('file:')) {
    return false;
  }
  let host = '';
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    return false;
  }
  if (!host) return false;

  const lowerText = text.toLowerCase();
  const searchHosts = ['duckduckgo.com', 'www.duckduckgo.com', 'google.com', 'www.google.com', 'bing.com', 'www.bing.com'];
  if (searchHosts.includes(host)) {
    return true;
  }

  const explicitDomains = extractDomainsFromText(lowerText);
  if (explicitDomains.length) {
    return explicitDomains.some((domain) => host.includes(domain) || domain.includes(host));
  }

  const stopwords = new Set([
    'about', 'after', 'again', 'also', 'another', 'before', 'being', 'could',
    'first', 'found', 'from', 'have', 'here', 'just', 'like', 'more', 'most',
    'other', 'over', 'page', 'people', 'should', 'their', 'there', 'these',
    'thing', 'those', 'this', 'want', 'when', 'where', 'which', 'while', 'would',
    'with', 'your', 'them', 'then'
  ]);
  const tokens = lowerText.split(/[^a-z0-9]+/).filter(Boolean);
  const keywordHits = tokens
    .filter((token) => token.length >= 4 && !stopwords.has(token))
    .some((token) => host.includes(token));

  return keywordHits;
};

type WebviewWaiter = { cleanup: () => void };
const webviewWaiters = new WeakMap<any, WebviewWaiter>();

const isWebviewConnected = (wv: any) => {
  if (!wv) return false;
  if (typeof wv.isConnected === 'boolean') return wv.isConnected;
  try {
    return typeof document !== 'undefined' && document.contains(wv);
  } catch {
    return false;
  }
};

const waitForWebviewConnected = async (wv: any, timeoutMs = 2000) => {
  if (isWebviewConnected(wv)) return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50));
    if (isWebviewConnected(wv)) return true;
  }
  return false;
};

const waitForWebviewEvent = (wv: any, events: string[], timeoutMs = 12000) => {
  if (!wv) return Promise.resolve(false);
  const existing = webviewWaiters.get(wv);
  if (existing) {
    existing.cleanup();
    webviewWaiters.delete(wv);
  }
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const handler = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      events.forEach((eventName) => wv.removeEventListener(eventName, handler));
      clearTimeout(timer);
    };
    webviewWaiters.set(wv, { cleanup });
    events.forEach((eventName) => wv.addEventListener(eventName, handler, { once: true }));
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    }, timeoutMs);
  });
};

const ensureWebviewReady = async (wv: any, timeoutMs = 12000) => {
  if (!wv) return false;
  const attached = await waitForWebviewConnected(wv, Math.min(2000, timeoutMs));
  if (!attached) {
    (wv as any).__abReady = false;
    return false;
  }
  if ((wv as any).__abReady) return true;
  const ready = await waitForWebviewEvent(wv, ['dom-ready'], timeoutMs);
  if (ready) {
    (wv as any).__abReady = true;
  }
  return ready;
};

const safeExecuteJavaScript = async (wv: any, script: string, timeoutMs = 12000) => {
  if (!wv) return null;
  const ready = await ensureWebviewReady(wv, timeoutMs);
  if (!ready || !isWebviewConnected(wv)) return null;
  try {
    return await wv.executeJavaScript(script);
  } catch (error) {
    const message = String(error || '');
    if (/dom-ready|attached to the DOM/i.test(message)) {
      (wv as any).__abReady = false;
      const retryReady = await ensureWebviewReady(wv, timeoutMs);
      if (!retryReady || !isWebviewConnected(wv)) return null;
      try {
        return await wv.executeJavaScript(script);
      } catch (retryError) {
        const retryMessage = String(retryError || '');
        if (/dom-ready|attached to the DOM/i.test(retryMessage)) return null;
        throw retryError;
      }
    }
    throw error;
  }
};

export default function App() {
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(DEFAULT_HOME_CONFIG);
  const [homePanelOpen, setHomePanelOpen] = useState(false);
  const [homeLinkLabel, setHomeLinkLabel] = useState('');
  const [homeLinkUrl, setHomeLinkUrl] = useState('');
  const [homeLinkIcon, setHomeLinkIcon] = useState('');
  const [homePageHtml, setHomePageHtml] = useState(() => '');
  const [homePageUrl, setHomePageUrl] = useState(() => DEFAULT_NEW_TAB_URL);

  const [tabs, setTabs] = useState<Tab[]>([
    { id: "tab-1", title: "New Tab", url: homePageUrl, isHome: true },
  ]);
  const [activeId, setActiveId] = useState("tab-1");
  const [omnibox, setOmnibox] = useState(homePageUrl);
  const [omniboxFocused, setOmniboxFocused] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiActionDepth, setAiActionDepth] = useState(0);
  const chatPreviewRef = useRef<HTMLDivElement | null>(null);
  const [chatPreviewScale, setChatPreviewScale] = useState(0.5);
  const [chatPreviewExpanded, setChatPreviewExpanded] = useState(false);
  const [chatPreviewPinned, setChatPreviewPinned] = useState(false);
  const [completedTabInfo, setCompletedTabInfo] = useState<{
    id: string;
    url: string;
    title: string;
  } | null>(null);
  const [composePanelOpen, setComposePanelOpen] = useState(false);
  const [composePrompt, setComposePrompt] = useState('');
  const [composeResult, setComposeResult] = useState('');
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeUseFullContext, setComposeUseFullContext] = useState(true);
  const [composeActiveField, setComposeActiveField] = useState<{
    label: string;
    selector?: string;
    type?: string;
    valuePreview?: string;
  } | null>(null);
  const [chatTakeoverActive, setChatTakeoverActive] = useState(false);
  const pendingFollowUpRef = useRef<PendingFollowUp | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Array<{
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    kind?: 'action-log';
    actions?: Array<{ action: ActionPlan['actions'][number]; status: string }>;
    summary?: string;
  }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatModeEnabled, setChatModeEnabled] = useState(() => localStorage.getItem('chatModeEnabled') === 'true');
  const [chatAutoOpenEnabled, setChatAutoOpenEnabled] = useState(() => localStorage.getItem('chatAutoOpenEnabled') !== 'false');
  const [frequentSites, setFrequentSites] = useState<FrequentSite[]>([]);
  const [recentVisits, setRecentVisits] = useState<VisitEvent[]>([]);
  const [browserMode, setBrowserMode] = useState<'classic' | 'chat'>(() => {
    const saved = localStorage.getItem('browserMode');
    if (saved === 'classic' || saved === 'chat') return saved;
    return 'chat';
  });
  // Memory page is handled via memoryPanelOpen
  const [bookmarksBarVisible, setBookmarksBarVisible] = useState(() =>
    localStorage.getItem('bookmarksBarVisible') !== 'false'
  );
  const [tabSearchOpen, setTabSearchOpen] = useState(false);
  const [tabSearchQuery, setTabSearchQuery] = useState("");
  const [findBarOpen, setFindBarOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [findResultCount, setFindResultCount] = useState(0);
  const [findActiveMatch, setFindActiveMatch] = useState(0);
  const [findLastQuery, setFindLastQuery] = useState("");


  // New features state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [highlightsEnabled, setHighlightsEnabled] = useState(false);
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");

  // Advanced features
  const [watchedPages, setWatchedPages] = useState<WatchedPage[]>([]);
  const [watchedPagesPanelOpen, setWatchedPagesPanelOpen] = useState(false);
  const [researchAgents, setResearchAgents] = useState<ResearchAgent[]>([]);
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState("");
  const [jsonOutput, setJsonOutput] = useState<string | null>(null);
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [creatorPanelOpen, setCreatorPanelOpen] = useState(false);
  const [creationPrompt, setCreationPrompt] = useState("");
  const [creationType, setCreationType] = useState<'webpage' | 'game' | 'app'>('webpage');
  const [creationStatus, setCreationStatus] = useState<'idle' | 'generating' | 'error' | 'ready'>('idle');
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creationDraft, setCreationDraft] = useState<Creation | null>(null);
  const [editingCreation, setEditingCreation] = useState<Creation | null>(null);
  const [editingSource, setEditingSource] = useState<'draft' | 'saved' | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingPrompt, setEditingPrompt] = useState("");
  const [editingHtml, setEditingHtml] = useState("");
  const [editingType, setEditingType] = useState<Creation['type']>('webpage');
  const [editInstruction, setEditInstruction] = useState("");
  const [editStatus, setEditStatus] = useState<'idle' | 'updating' | 'error'>('idle');
  const [editError, setEditError] = useState<string | null>(null);

  // Page customization features
  const [customizationPanelOpen, setCustomizationPanelOpen] = useState(false);

  // Settings panel
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // Page schema for AI automation
  const [pageSchema, setPageSchema] = useState<string | null>(null);
  const [pageSchemaUrl, setPageSchemaUrl] = useState<string | null>(null);
  const [pageSchemaUpdatedAt, setPageSchemaUpdatedAt] = useState(0);
  const [lastDomSnapshot, setLastDomSnapshot] = useState<any>(null);
  const [, setSchemaStatus] = useState<'idle' | 'building' | 'ready' | 'failed'>('idle');
  const [expandedActionLogs, setExpandedActionLogs] = useState<Record<string, boolean>>({});
  const [expandedExtensions, setExpandedExtensions] = useState<Record<string, boolean>>({});

  // Extensions
  const [extensions, setExtensions] = useState<Array<{
    id: string;
    name: string;
    description: string;
    code: string;
    match?: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
  }>>([]);
  const [extensionsPanelOpen, setExtensionsPanelOpen] = useState(false);
  const [extensionPrompt, setExtensionPrompt] = useState("");
  const [extensionStatus, setExtensionStatus] = useState<'idle' | 'generating' | 'error' | 'ready'>('idle');

  const [onboardingOpen, setOnboardingOpen] = useState(() =>
    localStorage.getItem('onboardingCompleted') !== 'true'
  );
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingRole, setOnboardingRole] = useState('');
  const [onboardingGoals, setOnboardingGoals] = useState('');
  const [onboardingPreferences, setOnboardingPreferences] = useState('');
  const [onboardingLocation, setOnboardingLocation] = useState('');
  const [onboardingAddress, setOnboardingAddress] = useState('');

  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileGoals, setProfileGoals] = useState('');
  const [profilePreferences, setProfilePreferences] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileAddress, setProfileAddress] = useState('');

  const [contextNotes, setContextNotes] = useState<ContextNote[]>([]);
  const [contextTitle, setContextTitle] = useState("");
  const [contextContent, setContextContent] = useState("");
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});

  const toggleActionLog = (id: string) => {
    setExpandedActionLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExtensionDetails = (id: string) => {
    setExpandedExtensions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const refreshSkillData = () => {
    setSkills(skillMemoryService.getSkills());
  };

  const toggleSkillDetails = (id: string) => {
    setExpandedSkills(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const deleteSkill = (id: string) => {
    skillMemoryService.deleteSkill(id);
    setExpandedSkills(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    refreshSkillData();
  };

  const startChatTakeover = () => {
    if (isLoading || aiActionDepth > 0) {
      stopAiRequest();
    }
    setChatTakeoverActive(true);
    setChatPreviewPinned(true);
    setChatPreviewExpanded(true);
  };

  // Cerebras service
  const cerebrasService = CerebrasService.getInstance();
  const visitMemoryService = useMemo(() => VisitMemoryService.getInstance(), []);
  const skillMemoryService = useMemo(() => SkillMemoryService.getInstance(), []);

  const webviewsRef = useRef<Record<string, any>>({});
  const webviewContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const extensionsRef = useRef(extensions);
  const creationUrlsRef = useRef<Record<string, string>>({});
  const homeUrlRef = useRef<string | null>(null);
  const activeIdRef = useRef(activeId);
  const tabsRef = useRef(tabs);
  const skillRefineInFlightRef = useRef<Set<string>>(new Set());
  const lastUserMessageRef = useRef<string | null>(null);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId)!, [tabs, activeId]);
  const isChatBrowser = browserMode === 'chat';

  const skillCaptureRef = useRef<{
    trigger: string;
    signature: string;
    goal?: string;
    steps: SkillStep[];
  } | null>(null);
  const skillReplayRef = useRef(false);

  useEffect(() => {
    extensionsRef.current = extensions;
  }, [extensions]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    homeUrlRef.current = homePageUrl;
  }, [homePageUrl]);

  useEffect(() => {
    localStorage.setItem('chatModeEnabled', String(chatModeEnabled));
  }, [chatModeEnabled]);

  useEffect(() => {
    localStorage.setItem('chatAutoOpenEnabled', String(chatAutoOpenEnabled));
  }, [chatAutoOpenEnabled]);

  useEffect(() => {
    localStorage.setItem('browserMode', browserMode);
  }, [browserMode]);

  useEffect(() => {
    localStorage.setItem('bookmarksBarVisible', String(bookmarksBarVisible));
  }, [bookmarksBarVisible]);

  useEffect(() => {
    setFrequentSites(visitMemoryService.getFrequentSites(10));
    setRecentVisits(visitMemoryService.getRecentVisits(20));
  }, [visitMemoryService]);

  useEffect(() => {
    setSkills(skillMemoryService.getSkills());
  }, [skillMemoryService]);

  useEffect(() => {
    if (memoryPanelOpen) {
      setSkills(skillMemoryService.getSkills());
      loadProfileFromStorage();
    }
  }, [memoryPanelOpen, skillMemoryService]);

  useEffect(() => {
    if (HOME_DISABLED) return;
    const html = buildHomeHtml(homeConfig, bookmarks);
    setHomePageHtml(html);
    const url = createHomeUrl(html);
    const prev = homeUrlRef.current;
    homeUrlRef.current = url;
    setHomePageUrl(url);
    revokeIfBlob(prev);

    setTabs(prevTabs => prevTabs.map(tab =>
      tab.isHome ? { ...tab, url, title: homeConfig.title || 'Home' } : tab
    ));
  }, [homeConfig, bookmarks]);

  useEffect(() => {
    const active = tabs.find(t => t.id === activeId);
    if (active?.isHome && omnibox !== active.url) {
      setOmnibox(active.url);
    }
  }, [tabs, activeId, omnibox]);

  useEffect(() => {
    return () => {
      revokeIfBlob(homeUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (pageSchemaUrl && pageSchemaUrl !== activeTab.url) {
      setPageSchema(null);
      setPageSchemaUrl(null);
      setPageSchemaUpdatedAt(0);
      setLastDomSnapshot(null);
      setSchemaStatus('idle');
    }
  }, [activeTab.url, pageSchemaUrl]);

  useEffect(() => {
    const container = chatPreviewRef.current;
    if (!container) return;
    const baseWidth = 1280;
    const baseHeight = 720;
    const updateScale = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      const next = Math.min(width / baseWidth, height / baseHeight);
      setChatPreviewScale(prev => (Math.abs(prev - next) >= 0.01 ? next : prev));
    };
    updateScale();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [chatPreviewExpanded]);

  useEffect(() => {
    if (chatPreviewPinned && !chatPreviewExpanded) {
      setChatPreviewExpanded(true);
    }
  }, [chatPreviewPinned, chatPreviewExpanded]);

  useEffect(() => {
    if (!composePanelOpen) return;
    let cancelled = false;
    (async () => {
      const context = await getActiveFieldContext();
      if (cancelled) return;
      const active = context?.active;
      if (active) {
        const label = active.label
          || active.placeholder
          || active.name
          || active.id
          || `${active.tag}${active.type ? `:${active.type}` : ''}`;
        setComposeActiveField({
          label,
          selector: active.selector,
          type: active.type,
          valuePreview: active.valuePreview
        });
      } else {
        setComposeActiveField(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [composePanelOpen, activeId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindBarOpen(true);
        return;
      }

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openTabSearch();
        return;
      }

      if (e.key === 'Escape') {
        if (findBarOpen) {
          closeFindBar();
        }
        if (tabSearchOpen) {
          closeTabSearch();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [findBarOpen, tabSearchOpen]);

  // Load saved data from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bookmarks');
    const savedHistory = localStorage.getItem('history');
    const savedDownloads = localStorage.getItem('downloads');
    const savedAdBlock = localStorage.getItem('adBlockEnabled');
    const savedWatchedPages = localStorage.getItem('watchedPages');
    const savedExtensions = localStorage.getItem('extensions');
    const savedCreations = localStorage.getItem('aiCreations');
    const savedHomeConfig = localStorage.getItem('homeConfig');
    const savedContextNotes = localStorage.getItem('aiContextNotes');

    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedDownloads) setDownloads(JSON.parse(savedDownloads));
    if (savedAdBlock) setAdBlockEnabled(JSON.parse(savedAdBlock));
    if (savedWatchedPages) setWatchedPages(JSON.parse(savedWatchedPages));
    if (savedExtensions) setExtensions(JSON.parse(savedExtensions));
    if (savedCreations) setCreations(JSON.parse(savedCreations));
    if (savedContextNotes) {
      try {
        const parsed = JSON.parse(savedContextNotes);
        if (Array.isArray(parsed)) {
          setContextNotes(parsed);
        }
      } catch (error) {
        console.error('Failed to load context notes:', error);
      }
    }
    if (savedHomeConfig) {
      try {
        const parsed = JSON.parse(savedHomeConfig);
        setHomeConfig(prev => {
          const merged = { ...prev, ...parsed };
          const links = Array.isArray(merged.quickLinks) ? merged.quickLinks : [];
          const layout = merged.layout === 'split' ? 'split' : 'center';
          const searchEngine = merged.searchEngine === 'google' || merged.searchEngine === 'bing' ? merged.searchEngine : 'duckduckgo';
          return {
            ...merged,
            layout,
            searchEngine,
            quickLinks: links.map((link: unknown) => {
              const record = typeof link === 'object' && link ? (link as Record<string, unknown>) : {};
              return {
                id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
                label: typeof record.label === 'string' ? record.label : 'Link',
                url: typeof record.url === 'string' ? record.url : '',
                icon: typeof record.icon === 'string' ? record.icon : undefined
              };
            })
          };
        });
      } catch {
        // Ignore malformed config
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('downloads', JSON.stringify(downloads));
  }, [downloads]);

  useEffect(() => {
    localStorage.setItem('adBlockEnabled', JSON.stringify(adBlockEnabled));
  }, [adBlockEnabled]);

  useEffect(() => {
    localStorage.setItem('watchedPages', JSON.stringify(watchedPages));
  }, [watchedPages]);

  useEffect(() => {
    localStorage.setItem('extensions', JSON.stringify(extensions));
  }, [extensions]);

  useEffect(() => {
    localStorage.setItem('aiCreations', JSON.stringify(creations));
  }, [creations]);

  useEffect(() => {
    localStorage.setItem('aiContextNotes', JSON.stringify(contextNotes));
  }, [contextNotes]);

  useEffect(() => {
    localStorage.setItem('homeConfig', JSON.stringify(homeConfig));
  }, [homeConfig]);

  // Check watched pages for changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const wv = webviewsRef.current[activeId];
      if (!wv) return;

      for (const watched of watchedPages) {
        try {
          const content = await safeExecuteJavaScript(wv, `
            (() => {
              return document.body?.innerText?.substring(0, 1000) || "";
            })()
          `);
          if (typeof content !== 'string') continue;

          const currentHash = btoa(content);
          if (currentHash !== watched.lastHash && watched.notificationsEnabled) {
            console.log(`Page changed: ${watched.title}`);
            setWatchedPages(prev => prev.map(w =>
              w.id === watched.id ? { ...w, lastHash: currentHash, lastChecked: Date.now() } : w
            ));
          }
        } catch (error) {
          console.error('Error checking watched page:', error);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [watchedPages, activeId]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getHomeUrl = () => DEFAULT_NEW_TAB_URL;
  const getHomeTitle = () => 'New Tab';
  const createHomeTab = (id?: string): Tab => ({
    id: id || `tab-${crypto.randomUUID()}`,
    title: getHomeTitle(),
    url: getHomeUrl(),
    isHome: true
  });
  const updateHomeConfig = (patch: Partial<HomeConfig>) => {
    setHomeConfig(prev => ({ ...prev, ...patch }));
  };
  const updateQuickLink = (id: string, patch: Partial<HomeQuickLink>) => {
    setHomeConfig(prev => ({
      ...prev,
      quickLinks: prev.quickLinks.map(link => link.id === id ? { ...link, ...patch } : link)
    }));
  };
  const removeQuickLink = (id: string) => {
    setHomeConfig(prev => ({
      ...prev,
      quickLinks: prev.quickLinks.filter(link => link.id !== id)
    }));
  };
  const addQuickLink = () => {
    const label = homeLinkLabel.trim();
    const url = normalizeUrl(homeLinkUrl.trim());
    if (!label || !url) return;
    const icon = homeLinkIcon.trim();
    setHomeConfig(prev => ({
      ...prev,
      quickLinks: [
        ...prev.quickLinks,
        { id: crypto.randomUUID(), label, url, icon: icon || undefined }
      ]
    }));
    setHomeLinkLabel('');
    setHomeLinkUrl('');
    setHomeLinkIcon('');
  };
  const openHomeInNewTab = () => {
    const autoUrl = getAutoOpenUrl();
    if (autoUrl) {
      navigateTo(autoUrl, true);
      return;
    }
    const tab = createHomeTab();
    setTabs(prev => [...prev, tab]);
    setActiveId(tab.id);
    setOmnibox(tab.url);
  };

  const titleFromUrl = (url: string) => {
    try {
      return new URL(url).host || url;
    } catch {
      return url;
    }
  };

  const navigateTo = (raw: string, inNewTab = false) => {
    const next = normalizeUrl(raw);
    if (!next) return '';
    const isHome = next === getHomeUrl();

    if (inNewTab) {
      const id = `tab-${crypto.randomUUID()}`;
      const title = isHome ? getHomeTitle() : titleFromUrl(next);
      setTabs(prev => [...prev, { id, title, url: next, isHome }]);
      setActiveId(id);
      setOmnibox(next);
      return next;
    }

    setTabs(prev =>
      prev.map(t => (t.id === activeId
        ? { ...t, url: next, isHome, title: isHome ? getHomeTitle() : t.title }
        : t))
    );
    setOmnibox(next);
    return next;
  };

  const getAutoOpenUrl = () => {
    if (!chatModeEnabled || !chatAutoOpenEnabled) return null;
    const top = visitMemoryService.getFrequentSites(1)[0];
    if (!top || top.count < 3) return null;
    return top.baseUrl;
  };

  const go = () => {
    const raw = omnibox.trim();
    const next = raw ? normalizeUrl(raw) : getHomeUrl();
    const isHome = next === getHomeUrl();
    setTabs(prev =>
      prev.map(t => (t.id === activeId
        ? { ...t, url: next, isHome, title: isHome ? getHomeTitle() : t.title }
        : t))
    );
    if (!raw) {
      setOmnibox(next);
    }
    // Add to history
    addToHistory(activeTab.title || "New Tab", next);
  };

  const nav = (action: "back" | "forward" | "reload") => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return;
    if (action === "back") wv.goBack();
    if (action === "forward") wv.goForward();
    if (action === "reload") wv.reload();
  };

  const newTab = () => {
    const autoUrl = getAutoOpenUrl();
    if (autoUrl) {
      navigateTo(autoUrl, true);
      return;
    }
    const t = createHomeTab();
    setTabs(prev => [...prev, t]);
    setActiveId(t.id);
    setOmnibox(t.url);
  };

  const addCompletedTabToTop = () => {
    if (!completedTabInfo?.url) return;
    const { id, url, title } = completedTabInfo;
    const isHome = url === getHomeUrl();
    const existing = tabsRef.current.find(t => t.id === id);
    const nextId = existing ? id : `tab-${crypto.randomUUID()}`;
    const nextTitle = title || existing?.title || titleFromUrl(url);

    setTabs(prev => {
      const rest = prev.filter(t => t.id !== id);
      const nextTab = existing
        ? { ...existing, url, title: nextTitle, isHome }
        : { id: nextId, title: nextTitle, url, isHome };
      return [nextTab, ...rest];
    });
    setActiveId(nextId);
    setOmnibox(url);
  };

  const closeTab = (id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeId === id && next.length) {
        setActiveId(next[0].id);
        setOmnibox(next[0].url);
      }
      if (next.length) return next;
      const fallback = createHomeTab("tab-1");
      setActiveId(fallback.id);
      setOmnibox(fallback.url);
      return [fallback];
    });
  };

  const getPageContent = async (): Promise<{ url: string; content: string; title?: string }> => {
    const wv = getActiveWebview();
    if (!wv) return { url: "", content: "", title: "" };

    try {
      const content = await safeExecuteJavaScript(wv, `
        (() => {
          const bodyText = document.body?.innerText || "";
          const title = document.title || "";
          const maxContent = 50000;
          const trimmedContent = bodyText.length > maxContent 
            ? bodyText.substring(0, maxContent) + "..." 
            : bodyText;
          return {
            title,
            content: trimmedContent
          };
        })()
      `);

      if (!content) {
        throw new Error('Webview not ready');
      }
      const activeTabSnapshot = tabsRef.current.find(t => t.id === activeIdRef.current);
      const pageTitle = content.title || activeTabSnapshot?.title || activeTab.title || "Untitled";
      const pageUrl = wv.getURL?.() ?? activeTabSnapshot?.url ?? activeTab.url;
      return {
        url: pageUrl,
        title: pageTitle,
        content: `Title: ${pageTitle}\n\nContent:\n${content.content}`
      };
    } catch (error) {
      console.error("Failed to get page content:", error);
      return { url: "", content: "", title: "" };
    }
  };

  const getPageDomSnapshot = async () => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return null;

    try {
      const snapshot = await safeExecuteJavaScript(wv, `
        (() => {
          const escapeCss = (value) => {
            if (window.CSS && CSS.escape) return CSS.escape(value);
            return value.replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
          };
          const trimText = (text, max = 140) => {
            if (!text) return '';
            return text.replace(/\\s+/g, ' ').trim().slice(0, max);
          };
          const selectorFor = (el) => {
            if (!el || el.nodeType !== 1) return '';
            if (el.id) return '#' + escapeCss(el.id);
            const parts = [];
            let node = el;
            while (node && node.nodeType === 1 && parts.length < 4) {
              let part = node.tagName.toLowerCase();
              if (node.className && typeof node.className === 'string') {
                const classes = node.className.split(/\\s+/).filter(Boolean).slice(0, 2);
                if (classes.length) {
                  part += '.' + classes.map(escapeCss).join('.');
                }
              }
              const parent = node.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
                if (siblings.length > 1) {
                  const index = siblings.indexOf(node) + 1;
                  part += ':nth-of-type(' + index + ')';
                }
              }
              parts.unshift(part);
              node = node.parentElement;
            }
            return parts.join(' > ');
          };
          const summarize = (el) => ({
            tag: el.tagName?.toLowerCase?.() || '',
            text: trimText(el.innerText || el.value || ''),
            id: el.id || '',
            name: el.name || '',
            type: el.type || '',
            placeholder: el.placeholder || '',
            ariaLabel: el.getAttribute?.('aria-label') || '',
            role: el.getAttribute?.('role') || '',
            selector: selectorFor(el)
          });

          const inputs = Array.from(document.querySelectorAll('input, textarea, select')).slice(0, 80).map(summarize);
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')).slice(0, 80).map(summarize);
          const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 80).map((el) => ({
            ...summarize(el),
            href: el.getAttribute('href')
          }));
          const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 40).map((el) => ({
            level: el.tagName.toLowerCase(),
            text: trimText(el.innerText, 180),
            selector: selectorFor(el)
          }));
          const forms = Array.from(document.querySelectorAll('form')).slice(0, 40).map((form) => ({
            action: form.getAttribute('action') || '',
            method: form.getAttribute('method') || '',
            selector: selectorFor(form),
            inputs: Array.from(form.querySelectorAll('input, textarea, select')).slice(0, 20).map(summarize)
          }));

          const htmlSnippet = document.documentElement?.outerHTML?.slice(0, 50000) || '';

          return {
            title: document.title || '',
            url: location.href,
            inputs,
            buttons,
            links,
            headings,
            forms,
            htmlSnippet
          };
        })()
      `);

      return snapshot;
    } catch (error) {
      console.error('Failed to capture DOM snapshot:', error);
      return null;
    }
  };

  const ensurePageSchema = async () => {
    if (!cerebrasService.isConfigured()) return null;
    const wv = getActiveWebview();
    const currentUrl = wv?.getURL?.() ?? activeTab.url;
    const now = Date.now();
    if (pageSchema && pageSchemaUrl === currentUrl && now - pageSchemaUpdatedAt < 120000) {
      return { schemaText: pageSchema, snapshot: lastDomSnapshot };
    }
    setSchemaStatus('building');
    try {
      const snapshot = await getPageDomSnapshot();
      if (!snapshot) {
        setSchemaStatus('failed');
        return null;
      }
      const schemaText = await cerebrasService.buildPageSchema(snapshot);
      setPageSchema(schemaText);
      setPageSchemaUrl(currentUrl);
      setPageSchemaUpdatedAt(Date.now());
      setLastDomSnapshot(snapshot);
      setSchemaStatus('ready');
      return { schemaText, snapshot };
    } catch (error) {
      console.error('Failed to build page schema:', error);
      setSchemaStatus('failed');
      return null;
    }
  };

  const parseActionPlan = (raw: string): ActionPlan | null => {
    const parsed = extractJsonPayload(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const allowed = new Set(['click', 'type', 'select', 'scroll', 'press', 'focus']);
    const cleaned = actions
      .filter((action: any) => action && allowed.has(action.type))
      .map((action: any) => ({
        type: action.type,
        selector: action.selector,
        text: action.text,
        value: action.value,
        key: action.key,
        by: typeof action.by === 'number' ? action.by : undefined,
        to: typeof action.to === 'number' ? action.to : undefined
      }));
    return { actions: cleaned, notes: parsed.notes };
  };

  const parseChatBrowsingPlan = (raw: string): ChatBrowsingPlan | null => {
    const parsed = extractJsonPayload(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const response = typeof parsed.response === 'string' ? parsed.response : undefined;
    const notes = typeof parsed.notes === 'string' ? parsed.notes : undefined;
    const actionsRaw = Array.isArray(parsed.actions) ? parsed.actions : [];
    const cleaned: ChatBrowsingAction[] = [];

    for (const action of actionsRaw) {
      if (!action || typeof action !== 'object') continue;
      if (action.type === 'open_url' && typeof action.url === 'string') {
        cleaned.push({ type: 'open_url', url: action.url, inNewTab: Boolean(action.inNewTab) });
      } else if (action.type === 'search' && typeof action.query === 'string') {
        cleaned.push({ type: 'search', query: action.query });
      } else if (action.type === 'suggest_sites' && Array.isArray(action.suggestions)) {
        const suggestions = action.suggestions.filter((s: unknown) => typeof s === 'string') as string[];
        if (suggestions.length) {
          cleaned.push({ type: 'suggest_sites', suggestions });
        }
      } else if (action.type === 'create_site' && typeof action.prompt === 'string') {
        const type = action.creationType;
        const creationType =
          type === 'webpage' || type === 'game' || type === 'app' ? type : undefined;
        cleaned.push({ type: 'create_site', prompt: action.prompt, creationType });
      } else if (action.type === 'page_actions') {
        const plan = action.plan ? parseActionPlan(JSON.stringify(action.plan)) : null;
        if (plan && plan.actions.length > 0) {
          cleaned.push({ type: 'page_actions', plan });
        }
      }
    }

    return { response, actions: cleaned, notes };
  };

  const parseGoalPlan = (raw: string): GoalPlan | null => {
    const parsed = extractJsonPayload(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const goal = typeof (parsed as any).goal === 'string' ? (parsed as any).goal.trim() : '';
    const stepsRaw = Array.isArray((parsed as any).steps) ? (parsed as any).steps : [];
    const steps = stepsRaw.filter((step: unknown) => typeof step === 'string')
      .map((step: string) => step.trim())
      .filter(Boolean);
    const successRaw = Array.isArray((parsed as any).successCriteria) ? (parsed as any).successCriteria : [];
    const successCriteria = successRaw.filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean);
    const questionRaw = Array.isArray((parsed as any).questions) ? (parsed as any).questions : [];
    const questions = questionRaw.filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean);
    if (!goal && steps.length === 0) return null;
    return {
      goal: goal || '',
      steps,
      successCriteria: successCriteria.length ? successCriteria : undefined,
      questions: questions.length ? questions : undefined
    };
  };

  const parseGoalCheck = (raw: string): GoalCheck | null => {
    const parsed = extractJsonPayload(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const completed = Boolean((parsed as any).completed);
    const response = typeof (parsed as any).response === 'string' ? (parsed as any).response.trim() : undefined;
    const needsUserInput = Boolean((parsed as any).needsUserInput);
    const question = typeof (parsed as any).question === 'string' ? (parsed as any).question.trim() : undefined;
    const evidence = typeof (parsed as any).evidence === 'string' ? (parsed as any).evidence.trim() : undefined;
    const confidence =
      typeof (parsed as any).confidence === 'number' ? (parsed as any).confidence : undefined;
    return {
      completed,
      response: response || undefined,
      needsUserInput: needsUserInput || undefined,
      question: question || undefined,
      evidence: evidence || undefined,
      confidence
    };
  };

  const parseSkillRefinement = (raw: string): SkillRefinement | null => {
    const parsed = extractJsonPayload(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const generalizedTrigger =
      typeof (parsed as any).generalizedTrigger === 'string'
        ? (parsed as any).generalizedTrigger.trim()
        : '';
    const generalizedGoal =
      typeof (parsed as any).generalizedGoal === 'string'
        ? (parsed as any).generalizedGoal.trim()
        : undefined;
    const example =
      typeof (parsed as any).example === 'string'
        ? (parsed as any).example.trim()
        : undefined;
    const notes =
      typeof (parsed as any).notes === 'string'
        ? (parsed as any).notes.trim()
        : undefined;
    const confidence =
      typeof (parsed as any).confidence === 'number'
        ? (parsed as any).confidence
        : undefined;
    const algorithmRaw = Array.isArray((parsed as any).algorithm) ? (parsed as any).algorithm : [];
    const algorithm = algorithmRaw
      .filter((step: unknown) => typeof step === 'string')
      .map((step: string) => step.trim())
      .filter(Boolean);
    const reusableRaw = Array.isArray((parsed as any).reusableSubpaths) ? (parsed as any).reusableSubpaths : [];
    const reusableSubpaths = reusableRaw
      .filter((item: unknown) => typeof item === 'string')
      .map((item: string) => item.trim())
      .filter(Boolean);
    const treeRaw = Array.isArray((parsed as any).tree) ? (parsed as any).tree : [];
    const tree = treeRaw
      .filter((node: any) => node && typeof node === 'object' && typeof node.id === 'string' && typeof node.label === 'string')
      .map((node: any): SkillTreeNode => ({
        id: node.id,
        parentId: typeof node.parentId === 'string' || node.parentId === null ? node.parentId : undefined,
        type: node.type === 'navigate' || node.type === 'action' || node.type === 'decision' || node.type === 'note'
          ? node.type
          : 'action',
        label: String(node.label || '').trim(),
        url: typeof node.url === 'string' ? node.url : undefined,
        selector: typeof node.selector === 'string' ? node.selector : undefined,
        notes: typeof node.notes === 'string' ? node.notes : undefined
      }))
      .filter((node) => node.id && node.label);

    if (!generalizedTrigger && algorithm.length === 0 && tree.length === 0) return null;
    return {
      generalizedTrigger: generalizedTrigger || '',
      generalizedGoal: generalizedGoal || undefined,
      algorithm,
      example,
      tree: tree.length ? tree : undefined,
      reusableSubpaths: reusableSubpaths.length ? reusableSubpaths : undefined,
      notes,
      confidence,
      refinedAt: Date.now()
    };
  };

  const beginSkillCapture = (trigger: string) => {
    if (!chatModeEnabled || !cerebrasService.isConfigured()) return;
    if (skillReplayRef.current) return;
    const signature = skillMemoryService.getSignature(trigger);
    if (!signature) return;
    skillCaptureRef.current = {
      trigger,
      signature,
      steps: []
    };
  };

  const updateSkillGoal = (goal: string) => {
    if (!skillCaptureRef.current) return;
    skillCaptureRef.current.goal = goal;
  };

  const recordSkillStep = (step: SkillStep) => {
    if (!skillCaptureRef.current || skillReplayRef.current) return;
    if (step.type === 'open_url' && (!step.url || !isSkillUrl(step.url))) return;
    skillCaptureRef.current.steps.push(step);
  };

  const recordSkillNavigation = (url: string, inNewTab = false) => {
    if (!url) return;
    recordSkillStep({ type: 'open_url', url, inNewTab });
  };

  const finalizeSkillCapture = (success: boolean) => {
    const capture = skillCaptureRef.current;
    if (!capture) return;
    skillCaptureRef.current = null;
    if (!success || !capture.steps.length) return;
    const savedSkill = skillMemoryService.saveSkill(capture);
    refreshSkillData();
    if (savedSkill) {
      maybeRefineSkill(savedSkill);
    }
  };

  const maybeRefineSkill = async (skill: SkillEntry) => {
    if (!cerebrasService.isConfigured()) return;
    if (skill.refinement?.refinedAt) return;
    const totalSkills = skillMemoryService.getSkills().length;
    if (totalSkills % 5 !== 0) return;
    if (skillRefineInFlightRef.current.has(skill.id)) return;
    skillRefineInFlightRef.current.add(skill.id);
    try {
      const raw = await cerebrasService.refineSkill(skill);
      const refinement = parseSkillRefinement(raw);
      if (refinement) {
        skillMemoryService.updateSkill(skill.id, { refinement });
        refreshSkillData();
      }
    } catch (error) {
      console.error('Skill refinement failed:', error);
    } finally {
      skillRefineInFlightRef.current.delete(skill.id);
    }
  };

  const markChatTaskComplete = () => {
    const wv = getActiveWebview();
    const url = wv?.getURL?.() ?? activeTab.url;
    if (!url) return;
    const title = activeTab.title || titleFromUrl(url);
    setCompletedTabInfo({
      id: activeIdRef.current,
      url,
      title
    });
  };

  const getLastAssistantMessage = (list: Array<{ role: 'user' | 'assistant' | 'system'; content: string; kind?: 'action-log' }>) => {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const msg = list[i];
      if (msg.role === 'assistant' && msg.kind !== 'action-log' && msg.content) {
        return msg.content;
      }
    }
    return '';
  };

  const assistantRequestsContinuation = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return false;
    if (trimmed.includes('?')) return true;
    return /\b(do you want|would you like|want me to|should i|shall i|keep going|continue|next step|click on|open any|go ahead|anything else)\b/i.test(trimmed);
  };

  const storePendingFollowUp = (opts: {
    goalText: string;
    userMessage: string;
    assistantMessage: string;
    goalPlan?: GoalPlan | null;
    lastActionSummary?: string;
    completed?: boolean;
    force?: boolean;
  }) => {
    const wv = getActiveWebview();
    const url = wv?.getURL?.() ?? activeTab.url;
    const title = activeTab.title || (url ? titleFromUrl(url) : 'Untitled');
    const assistantMessage = opts.assistantMessage?.trim() || '';
    const requiresFollowUp = Boolean(opts.force) || assistantRequestsContinuation(assistantMessage);
    pendingFollowUpRef.current = {
      goalText: opts.goalText || opts.userMessage,
      lastUserMessage: opts.userMessage,
      lastAssistantMessage: assistantMessage,
      planSteps: opts.goalPlan?.steps?.length ? opts.goalPlan.steps : undefined,
      successCriteria: opts.goalPlan?.successCriteria,
      lastActionSummary: opts.lastActionSummary,
      url,
      title,
      completed: Boolean(opts.completed),
      askedAt: Date.now(),
      requiresFollowUp
    };
  };

  const buildFollowUpPrompt = (userReply: string, context: PendingFollowUp) => {
    const assistantSnippet = context.lastAssistantMessage.length > 600
      ? `${context.lastAssistantMessage.slice(0, 600)}...`
      : context.lastAssistantMessage;
    const lines = [
      'Continue the previous task.',
      context.goalText ? `Previous goal: ${context.goalText}` : '',
      assistantSnippet ? `Assistant said: ${assistantSnippet}` : '',
      context.lastActionSummary ? `Progress so far: ${context.lastActionSummary}` : '',
      `User reply: ${userReply}`
    ].filter(Boolean);
    return lines.join('\n');
  };

  const getActiveFieldContext = async () => {
    const wv = getActiveWebview();
    if (!wv) return null;
    try {
      return await safeExecuteJavaScript(wv, `
        (() => {
          const trimText = (text, max = 240) => {
            if (!text) return '';
            return text.replace(/\\s+/g, ' ').trim().slice(0, max);
          };
          const escapeCss = (value) => {
            if (window.CSS && CSS.escape) return CSS.escape(value);
            return value.replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
          };
          const selectorFor = (el) => {
            if (!el || el.nodeType !== 1) return '';
            if (el.id) return '#' + escapeCss(el.id);
            const parts = [];
            let node = el;
            while (node && node.nodeType === 1 && parts.length < 4) {
              let part = node.tagName.toLowerCase();
              if (node.className && typeof node.className === 'string') {
                const classes = node.className.split(/\\s+/).filter(Boolean).slice(0, 2);
                if (classes.length) {
                  part += '.' + classes.map(escapeCss).join('.');
                }
              }
              const parent = node.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
                if (siblings.length > 1) {
                  const index = siblings.indexOf(node) + 1;
                  part += ':nth-of-type(' + index + ')';
                }
              }
              parts.unshift(part);
              node = node.parentElement;
            }
            return parts.join(' > ');
          };
          const getLabelText = (el) => {
            if (!el || el.nodeType !== 1) return '';
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) return trimText(ariaLabel, 160);
            const labelledBy = el.getAttribute('aria-labelledby');
            if (labelledBy) {
              const labels = labelledBy.split(/\\s+/).map((id) => document.getElementById(id)).filter(Boolean);
              const labelText = labels.map((node) => node?.innerText || '').join(' ');
              if (labelText.trim()) return trimText(labelText, 160);
            }
            if (el.id) {
              const label = document.querySelector('label[for="' + escapeCss(el.id) + '"]');
              if (label?.innerText) return trimText(label.innerText, 160);
            }
            const parentLabel = el.closest?.('label');
            if (parentLabel?.innerText) return trimText(parentLabel.innerText, 160);
            return '';
          };

          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) {
            return { active: null };
          }
          const tag = el.tagName?.toLowerCase?.() || '';
          const type = el.getAttribute?.('type') || '';
          const role = el.getAttribute?.('role') || '';
          const placeholder = el.getAttribute?.('placeholder') || '';
          const name = el.getAttribute?.('name') || '';
          const id = el.id || '';
          const isContentEditable = Boolean(el.isContentEditable);
          const value = 'value' in el ? String(el.value || '') : (el.textContent || '');
          const selectionStart = typeof el.selectionStart === 'number' ? el.selectionStart : null;
          const selectionEnd = typeof el.selectionEnd === 'number' ? el.selectionEnd : null;
          let selectedText = '';
          if (isContentEditable && window.getSelection) {
            selectedText = window.getSelection().toString();
          } else if (selectionStart !== null && selectionEnd !== null && value) {
            selectedText = value.substring(selectionStart, selectionEnd);
          }
          const rect = el.getBoundingClientRect();
          const container = el.closest?.('form, article, section, main, aside, div');
          const containerText = container ? trimText(container.innerText || '', 800) : '';
          return {
            active: {
              tag,
              type,
              role,
              name,
              id,
              placeholder,
              label: getLabelText(el),
              selector: selectorFor(el),
              valuePreview: trimText(value, 400),
              selectedText: trimText(selectedText, 240),
              selectionStart,
              selectionEnd,
              isContentEditable,
              rect: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              containerText
            }
          };
        })()
      `);
    } catch (error) {
      console.error('Failed to read active field context:', error);
      return null;
    }
  };

  const getVisiblePageText = async () => {
    const wv = getActiveWebview();
    if (!wv) return '';
    try {
      const payload = await safeExecuteJavaScript(wv, `
        (() => {
          const trimText = (text, max = 240) => {
            if (!text) return '';
            return text.replace(/\\s+/g, ' ').trim().slice(0, max);
          };
          const isVisible = (el) => {
            if (!el || el.nodeType !== 1) return false;
            const style = window.getComputedStyle(el);
            if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const rect = el.getBoundingClientRect();
            return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
          };
          const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,code,article,section,div,span'));
          const seen = new Set();
          const lines = [];
          for (const el of candidates) {
            if (!isVisible(el)) continue;
            const text = trimText(el.innerText || '');
            if (!text || text.length < 24) continue;
            if (seen.has(text)) continue;
            seen.add(text);
            lines.push(text);
            if (lines.join('\\n').length > 12000) break;
          }
          return lines.join('\\n');
        })()
      `);
      return typeof payload === 'string' ? payload : '';
    } catch (error) {
      console.error('Failed to capture visible text:', error);
      return '';
    }
  };

  const buildComposeContext = async (useFullContext: boolean) => {
    const activeContext = await getActiveFieldContext();
    const active = activeContext?.active || null;
    const page = await getPageContent();
    const url = page.url || activeTab.url;
    const title = page.title || activeTab.title || 'Untitled';
    const visibleText = await getVisiblePageText();
    const pageText = useFullContext ? page.content : visibleText;

    return {
      url,
      title,
      active,
      pageText,
      visibleText
    };
  };

  const handleComposeGenerate = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? composePrompt).trim();
    if (!prompt) return;
    if (!cerebrasService.isConfigured()) {
      setComposeError('Set your Cerebras API key in Settings to use compose mode.');
      return;
    }
    setComposeError(null);
    setComposeLoading(true);
    try {
      const context = await buildComposeContext(composeUseFullContext);
      const activeLabel = context.active?.label
        || context.active?.placeholder
        || context.active?.name
        || context.active?.id
        || (context.active?.tag ? `${context.active.tag}${context.active.type ? `:${context.active.type}` : ''}` : 'No active field');
      setComposeActiveField({
        label: activeLabel,
        selector: context.active?.selector,
        type: context.active?.type,
        valuePreview: context.active?.valuePreview
      });

      const activeInfo = context.active
        ? `Active field:
- tag: ${context.active.tag}
- type: ${context.active.type || 'n/a'}
- role: ${context.active.role || 'n/a'}
- label: ${context.active.label || 'n/a'}
- placeholder: ${context.active.placeholder || 'n/a'}
- name: ${context.active.name || 'n/a'}
- id: ${context.active.id || 'n/a'}
- selector: ${context.active.selector || 'n/a'}
- value preview: ${context.active.valuePreview || 'n/a'}
- selected text: ${context.active.selectedText || 'n/a'}
- selection: ${context.active.selectionStart ?? 'n/a'}-${context.active.selectionEnd ?? 'n/a'}
- content editable: ${context.active.isContentEditable ? 'yes' : 'no'}
${context.active.containerText ? `- nearby text: ${context.active.containerText}` : ''}`
        : 'Active field: none';

      const contextText = [
        `Page: ${context.title}`,
        `URL: ${context.url}`,
        activeInfo,
        composeUseFullContext
          ? `Full page text (truncated):\n${context.pageText.substring(0, 60000)}`
          : `Visible page text (no scrolling):\n${context.pageText.substring(0, 12000)}`
      ].join('\n\n');

      const response = await cerebrasService.composeText(
        prompt,
        contextText,
        undefined
      );
      setComposeResult(response.trim());
    } catch (error) {
      console.error('Compose failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate text.';
      setComposeError(message);
    } finally {
      setComposeLoading(false);
    }
  };

  const handleComposeGenerateWithPrompt = async (prompt: string) => {
    const next = prompt.trim();
    if (!next) return;
    setComposePrompt(next);
    await handleComposeGenerate(next);
  };

  const stripComposePrefix = (message: string) => message.replace(/^\s*\/(compose|draft|reply)\b\s*/i, '').trim();

  const isComposeIntent = (message: string) => {
    if (/^\s*\/(compose|draft|reply)\b/i.test(message)) return true;
    return /\b(compose|draft|reply|respond|rewrite|rephrase|polish|fix grammar|edit this|improve this|shorten|lengthen)\b/i.test(message);
  };

  const insertComposeResult = async () => {
    const wv = getActiveWebview();
    if (!wv || !composeResult.trim()) return;
    try {
      const inserted = await safeExecuteJavaScript(wv, `
        (() => {
          const el = document.activeElement;
          if (!el || el === document.body || el === document.documentElement) return false;
          const text = ${JSON.stringify(composeResult)};
          if ('value' in el) {
            const start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
            const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : el.value.length;
            const before = el.value.slice(0, start);
            const after = el.value.slice(end);
            el.value = before + text + after;
            const nextPos = before.length + text.length;
            if (typeof el.setSelectionRange === 'function') {
              el.setSelectionRange(nextPos, nextPos);
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          if (el.isContentEditable) {
            document.execCommand('insertText', false, text);
            return true;
          }
          return false;
        })()
      `);
      if (!inserted) {
        setComposeError('Click into a text field on the page before inserting.');
      }
    } catch (error) {
      console.error('Failed to insert compose result:', error);
      setComposeError('Unable to insert text into the active field.');
    }
  };

  const shouldTreatAsFollowUp = (message: string, pending: PendingFollowUp | null, lastAssistantMessage: string) => {
    if (!pending) return false;
    if (Date.now() - pending.askedAt > 10 * 60 * 1000) return false;
    const trimmed = message.trim();
    if (!trimmed) return false;
    const assistantText = lastAssistantMessage || pending.lastAssistantMessage;
    const assistantAsked = pending.requiresFollowUp || assistantRequestsContinuation(assistantText);
    if (!assistantAsked) return false;
    if (/^(find|search|look up|show me|what is|who is|tell me|summarize|explain|create|generate|build|make|write)\b/i.test(trimmed)) {
      return false;
    }
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const isShort = wordCount <= 12;
    const looksLikeFollowUpReply = /^(yes|yeah|yep|sure|ok|okay|please|go ahead|do it|continue|next)\b/i.test(trimmed);
    const mentionsAction = /\b(click|open|select|choose|tap|press|scroll|type|enter|fill)\b/i.test(trimmed);
    const hasReferential = /\b(this|that|these|those|one|first|second|third|above|previous|same)\b/i.test(trimmed);
    return (isShort || looksLikeFollowUpReply || mentionsAction) && (looksLikeFollowUpReply || mentionsAction || hasReferential || isShort);
  };

  const replaySkill = async (skill: SkillEntry, signal: AbortSignal) => {
    const ensureNotAborted = () => {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
    };

    for (const step of skill.steps) {
      ensureNotAborted();
      if (step.type === 'open_url') {
        const target = navigateTo(step.url, step.inNewTab);
        if (target) {
          setMessages(prev => [...prev, { role: 'assistant', content: `Navigating to ${target}` }]);
          await delay(300);
          await waitForWebviewEvent(getActiveWebview(), ['did-stop-loading', 'dom-ready'], 12000);
        }
        continue;
      }

      if (step.type === 'page_actions' && step.plan) {
        const wv = getActiveWebview();
        const beforeUrl = wv?.getURL?.() ?? '';
        const { executed, attempted, results } = await executeActionPlan(step.plan);
        if (attempted > 0) {
          const logId = crypto.randomUUID();
          setMessages(prev => [
            ...prev,
            {
              id: logId,
              role: 'assistant',
              content: `Executed ${executed}/${attempted} page action(s).`,
              kind: 'action-log',
              actions: results,
              summary: `Executed ${executed}/${attempted} page action(s).`
            }
          ]);
        }
        if (actionPlanMayNavigate(step.plan)) {
          await Promise.all([
            waitForWebviewEvent(wv, ['did-navigate', 'did-navigate-in-page', 'did-stop-loading', 'dom-ready'], 9000),
            waitForUrlChange(wv, beforeUrl, 9000)
          ]);
        }
      }
    }
  };

  const executeActionPlan = async (plan: ActionPlan) => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return { executed: 0, attempted: 0 };

    try {
      setAiActionDepth(prev => prev + 1);
      const results = await safeExecuteJavaScript(wv, `
        (async () => {
          const plan = ${JSON.stringify(plan)};
          const results = [];
          const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          const resolveEl = (selector) => {
            if (!selector) return null;
            try {
              return document.querySelector(selector);
            } catch (e) {
              return null;
            }
          };
          const resolvePressTarget = (selector) => resolveEl(selector) || document.activeElement;
          const dispatch = (el, type) => el && el.dispatchEvent(new Event(type, { bubbles: true }));
          const dispatchKey = (el, type, key) => {
            const isEnter = key === 'Enter';
            const keyCode = isEnter ? 13 : 0;
            el.dispatchEvent(new KeyboardEvent(type, {
              key,
              code: isEnter ? 'Enter' : undefined,
              keyCode,
              which: keyCode,
              bubbles: true,
              cancelable: true,
              composed: true
            }));
          };
          const attemptFormSubmit = (el) => {
            if (!el) return false;
            const form = el.form || el.closest?.('form');
            if (!form) return false;
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const shouldSubmit = form.dispatchEvent(submitEvent);
            if (shouldSubmit) {
              if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
              } else if (typeof form.submit === 'function') {
                form.submit();
              } else {
                const btn = form.querySelector('button[type="submit"], input[type="submit"]');
                btn?.click?.();
              }
            }
            return true;
          };

          for (const action of plan.actions || []) {
            let status = 'skipped';
            const selector = action.selector;
            if (action.type === 'click') {
              const el = resolveEl(selector);
              if (el) {
                el.click();
                status = 'ok';
              } else {
                status = 'not_found';
              }
            } else if (action.type === 'focus') {
              const el = resolveEl(selector);
              if (el) {
                el.focus();
                status = 'ok';
              } else {
                status = 'not_found';
              }
            } else if (action.type === 'type') {
              const el = resolveEl(selector);
              if (el) {
                if ('value' in el) {
                  el.value = action.text || '';
                  dispatch(el, 'input');
                  dispatch(el, 'change');
                } else {
                  el.textContent = action.text || '';
                }
                el.focus?.();
                status = 'ok';
              } else {
                status = 'not_found';
              }
            } else if (action.type === 'select') {
              const el = resolveEl(selector);
              if (el) {
                el.value = action.value || '';
                dispatch(el, 'change');
                status = 'ok';
              } else {
                status = 'not_found';
              }
            } else if (action.type === 'press') {
              const el = resolvePressTarget(selector);
              if (el) {
                const key = action.key || 'Enter';
                el.focus?.();
                dispatchKey(el, 'keydown', key);
                dispatchKey(el, 'keypress', key);
                dispatchKey(el, 'keyup', key);
                if (key === 'Enter') {
                  attemptFormSubmit(el);
                }
                status = 'ok';
              } else {
                status = 'not_found';
              }
            } else if (action.type === 'scroll') {
              if (typeof action.by === 'number') {
                window.scrollBy(0, action.by);
                status = 'ok';
              } else if (typeof action.to === 'number') {
                window.scrollTo(0, action.to);
                status = 'ok';
              }
            }
            results.push({ action, status });
            await delay(60);
          }
          return results;
        })()
      `);

      const executed = Array.isArray(results)
        ? results.filter((entry) => entry.status === 'ok').length
        : 0;
      const attempted = Array.isArray(results) ? results.length : 0;
      if (attempted > 0) {
        recordSkillStep({ type: 'page_actions', plan });
      }
      return { executed, attempted, results: Array.isArray(results) ? results : [] };
    } catch (error) {
      console.error('Failed to execute action plan:', error);
      return { executed: 0, attempted: 0, results: [] };
    } finally {
      setAiActionDepth(prev => Math.max(0, prev - 1));
    }
  };

  const applyExtensionsToWebview = async (wv: any, url: string) => {
    const enabledExtensions = extensionsRef.current.filter(ext => ext.enabled);
    if (!enabledExtensions.length) return;

    for (const ext of enabledExtensions) {
      if (ext.match && !url.includes(ext.match)) continue;
      try {
        await safeExecuteJavaScript(wv, ext.code);
      } catch (error) {
        console.error(`Extension failed: ${ext.name}`, error);
      }
    }
  };

  const parseExtensionFromResponse = (raw: string) => {
    const parsed = extractJsonPayload(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.name || !parsed.code) return null;
    return {
      name: String(parsed.name).slice(0, 80),
      description: String(parsed.description || '').slice(0, 200),
      code: String(parsed.code),
      match: parsed.match ? String(parsed.match) : undefined
    };
  };

  const handleGenerateExtension = async () => {
    if (!extensionPrompt.trim()) return;
    if (!cerebrasService.isConfigured()) {
      setExtensionStatus('error');
      return;
    }
    setExtensionStatus('generating');

    try {
      const snapshot = await getPageDomSnapshot();
      const response = await cerebrasService.generateExtension(
        extensionPrompt.trim(),
        snapshot || { title: activeTab.title, url: activeTab.url }
      );
      const parsed = parseExtensionFromResponse(response);
      if (!parsed) {
        throw new Error('Unable to parse extension JSON');
      }
      const newExtension = {
        id: crypto.randomUUID(),
        name: parsed.name,
        description: parsed.description,
        code: parsed.code,
        match: parsed.match,
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setExtensions(prev => [newExtension, ...prev]);
      setExtensionPrompt("");
      setExtensionStatus('ready');
    } catch (error) {
      console.error('Failed to generate extension:', error);
      setExtensionStatus('error');
    }
  };

  const runExtensionOnce = async (extId: string) => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return;
    const ext = extensions.find(e => e.id === extId);
    if (!ext) return;
    try {
      await safeExecuteJavaScript(wv, ext.code);
    } catch (error) {
      console.error(`Failed to run extension: ${ext.name}`, error);
    }
  };

  const parseCreationFromResponse = (raw: string, fallbackType: Creation['type']) => {
    const parsed = extractJsonPayload(raw);
    let title = '';
    let description = '';
    let html = '';
    let type: Creation['type'] = fallbackType;

    if (parsed && typeof parsed === 'object') {
      if (typeof (parsed as any).title === 'string') {
        title = (parsed as any).title.trim();
      }
      if (typeof (parsed as any).description === 'string') {
        description = (parsed as any).description.trim();
      }
      if (typeof (parsed as any).type === 'string') {
        const next = (parsed as any).type.toLowerCase();
        if (next === 'webpage' || next === 'game' || next === 'app') {
          type = next;
        }
      }
      if (typeof (parsed as any).html === 'string') {
        html = (parsed as any).html.trim();
      } else if (typeof (parsed as any).code === 'string') {
        html = (parsed as any).code.trim();
      } else if (typeof (parsed as any).markup === 'string') {
        html = (parsed as any).markup.trim();
      } else if ((parsed as any).files && typeof (parsed as any).files.html === 'string') {
        html = (parsed as any).files.html.trim();
      }
    }

    if (!html) {
      const htmlMatch = raw.match(/<!doctype html[\s\S]*<\/html>/i) || raw.match(/<html[\s\S]*<\/html>/i);
      if (htmlMatch?.[0]) {
        html = htmlMatch[0].trim();
      }
    }

    if (!title && html) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) {
        title = titleMatch[1].trim();
      }
    }

    if (!html) return null;
    return { title, description, html, type };
  };

  const getCreationUrl = (creation: Creation) => {
    const existing = creationUrlsRef.current[creation.id];
    if (existing) return existing;
    const url = createDataUrl(creation.html);
    creationUrlsRef.current[creation.id] = url;
    return url;
  };

  const updateCreationCache = (creationId: string, html: string) => {
    const existing = creationUrlsRef.current[creationId];
    if (existing) {
      revokeIfBlob(existing);
    }
    const url = createDataUrl(html);
    creationUrlsRef.current[creationId] = url;
    return url;
  };

  const handleGenerateCreation = async () => {
    if (!creationPrompt.trim()) return;
    if (!cerebrasService.isConfigured()) {
      setCreationStatus('error');
      setCreationError('Set your Cerebras API key in Settings to generate content.');
      return;
    }
    setCreationStatus('generating');
    setCreationError(null);

    try {
      const response = await cerebrasService.generateCreation(creationPrompt.trim(), creationType);
      const parsed = parseCreationFromResponse(response, creationType);
      if (!parsed || !parsed.html) {
        throw new Error('Unable to parse generated HTML');
      }

      const draft: Creation = {
        id: crypto.randomUUID(),
        title: parsed.title || `${creationType[0].toUpperCase()}${creationType.slice(1)} Creation`,
        description: parsed.description || '',
        type: parsed.type,
        prompt: creationPrompt.trim(),
        html: parsed.html,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setCreationDraft(draft);
      setCreationStatus('ready');
      openCreation(draft);
    } catch (error) {
      console.error('Failed to generate creation:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate content. Try a simpler prompt.';
      setCreationStatus('error');
      setCreationError(message);
    }
  };

  const saveCreationDraft = () => {
    if (!creationDraft) return;
    const saved = { ...creationDraft, updatedAt: Date.now() };
    setCreations(prev => [saved, ...prev]);
    setCreationDraft(null);
    setCreationStatus('idle');
  };

  const startEditCreation = (creation: Creation, source: 'draft' | 'saved') => {
    setEditingCreation(creation);
    setEditingSource(source);
    setEditingTitle(creation.title || '');
    setEditingDescription(creation.description || '');
    setEditingPrompt(creation.prompt || '');
    setEditingHtml(creation.html || '');
    setEditingType(creation.type);
    setEditInstruction('');
    setEditStatus('idle');
    setEditError(null);
  };

  const cancelEditCreation = () => {
    setEditingCreation(null);
    setEditingSource(null);
    setEditingTitle('');
    setEditingDescription('');
    setEditingPrompt('');
    setEditingHtml('');
    setEditingType('webpage');
    setEditInstruction('');
    setEditStatus('idle');
    setEditError(null);
  };

  const applyCreationEdits = (openAfter = false) => {
    if (!editingCreation) return;
    const now = Date.now();
    const updated: Creation = {
      ...editingCreation,
      title: editingTitle.trim() || editingCreation.title,
      description: editingDescription.trim(),
      prompt: editingPrompt.trim() || editingCreation.prompt,
      html: editingHtml.trim() || editingCreation.html,
      type: editingType,
      updatedAt: now
    };

    updateCreationCache(updated.id, updated.html);

    if (editingSource === 'draft') {
      setCreationDraft(updated);
    } else if (editingSource === 'saved') {
      setCreations(prev => prev.map(item => item.id === updated.id ? updated : item));
    }

    setEditingCreation(updated);

    if (openAfter) {
      openCreation(updated);
    }
  };

  const handleAiUpdateCreation = async () => {
    if (!editingCreation) return;
    if (!editInstruction.trim()) return;
    if (!cerebrasService.isConfigured()) {
      setEditStatus('error');
      setEditError('Set your Cerebras API key in Settings to update content.');
      return;
    }

    setEditStatus('updating');
    setEditError(null);
    try {
      const prompt = `Update this ${editingType} HTML. Keep it as a single HTML file.
Change request:
${editInstruction.trim()}

Existing HTML (keep structure unless needed):
${editingHtml.substring(0, 80000)}`;
      const response = await cerebrasService.generateCreation(prompt, editingType);
      const parsed = parseCreationFromResponse(response, editingType);
      if (!parsed || !parsed.html) {
        throw new Error('Unable to parse updated HTML');
      }
      setEditingHtml(parsed.html);
      if (parsed.title) setEditingTitle(parsed.title);
      if (parsed.description) setEditingDescription(parsed.description);
      setEditStatus('idle');
    } catch (error) {
      console.error('Failed to update creation:', error);
      const message = error instanceof Error ? error.message : 'Failed to update creation. Try a simpler change.';
      setEditStatus('error');
      setEditError(message);
    }
  };

  const openCreation = (creation: Creation) => {
    const url = getCreationUrl(creation);
    const id = `tab-${crypto.randomUUID()}`;
    const title = creation.title || 'AI Creation';
    setTabs(prev => [...prev, { id, title, url, isHome: false }]);
    setActiveId(id);
    setOmnibox(url);
    addToHistory(title, url);
  };

  const downloadCreation = (creation: Creation) => {
    const blob = new Blob([creation.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(creation.title || 'ai-creation')}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const copyCreationHtml = async (creation: Creation) => {
    try {
      await navigator.clipboard.writeText(creation.html);
      setMessages(prev => [...prev, { role: 'assistant', content: '✅ HTML copied to clipboard.' }]);
    } catch (error) {
      console.error('Failed to copy HTML:', error);
    }
  };

  const deleteCreation = (creationId: string) => {
    const existing = creationUrlsRef.current[creationId];
    if (existing) {
      revokeIfBlob(existing);
      delete creationUrlsRef.current[creationId];
    }
    setCreations(prev => prev.filter(item => item.id !== creationId));
  };

  const handleAIFeature = async (feature: AIFeature) => {
    const controller = beginAiRequest();
    const { signal } = controller;
    setIsLoading(true);
    setAiResult("");

    const { url, content } = await getPageContent();
    const title = activeTab.title || "Untitled";

    try {
      let response = "";

      switch (feature.id) {
        case "summarize":
          response = await cerebrasService.summarizePage(content, url, title, signal);

          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "explain-simple":
          response = await cerebrasService.explainLike12(content, title, signal);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "key-facts":
          response = await cerebrasService.extractKeyFacts(content, title, signal);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "to-json":
          response = await cerebrasService.convertToJson(content, title, url, signal);
          setJsonOutput(response);
          setJsonPanelOpen(true);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "checklist":
          response = await cerebrasService.turnIntoChecklist(content, title, signal);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "action-items":
          response = await cerebrasService.findActionItems(content, title, signal);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        default:
          response = "Feature not implemented yet.";
      }

      setAiResult(response);
    } catch (error: any) {
      if (signal.aborted || error?.name === 'AbortError') {
        return;
      }
      const errorMsg = error.message || "An error occurred";
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    } finally {
      finalizeSkillCapture(false);
      clearAiRequest(controller);
      setIsLoading(false);
    }
  };



  const handleQuickSummarize = async () => {
    const controller = beginAiRequest();
    const { signal } = controller;
    setAiSidebarOpen(true);
    setIsLoading(true);
    setMessages([]);

    const { url, content } = await getPageContent();
    const title = activeTab.title || "Untitled";

    try {
      const summary = await cerebrasService.summarizePage(content, url, title, signal);
      setMessages([{ role: 'assistant', content: summary }]);
    } catch (error: any) {
      if (signal.aborted || error?.name === 'AbortError') {
        return;
      }
      const errorMsg = error.message || "An error occurred";
      setMessages([{ role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    } finally {
      clearAiRequest(controller);
      setIsLoading(false);
    }
  };

  const runChatRequest = async (rawInput: string) => {
    const rawUserMessage = rawInput.trim();
    if (!rawUserMessage) return;
    lastUserMessageRef.current = rawUserMessage;
    setChatTakeoverActive(false);

    const explicitCompose = /^\s*\/(compose|draft|reply)\b/i.test(rawUserMessage);
    if (explicitCompose || isComposeIntent(rawUserMessage)) {
      const activeContext = await getActiveFieldContext();
      const hasActiveField = Boolean(activeContext?.active);
      if (explicitCompose || hasActiveField) {
        const cleaned = stripComposePrefix(rawUserMessage) || rawUserMessage;
        closeSecondaryPanels();
        setComposePanelOpen(true);
        setComposeError(hasActiveField ? null : 'Click into a text field to use compose.');
        setComposePrompt(cleaned);
        if (hasActiveField) {
          await handleComposeGenerateWithPrompt(cleaned);
        }
        setChatInput("");
        return;
      }
    }

    const lastAssistantMessage = getLastAssistantMessage(messages);
    const pendingFollowUp = pendingFollowUpRef.current;
    const isFollowUp = shouldTreatAsFollowUp(rawUserMessage, pendingFollowUp, lastAssistantMessage);
    if (!isFollowUp) {
      pendingFollowUpRef.current = null;
      setCompletedTabInfo(null);
    }

    const userMessage = rawUserMessage;
    const plannerMessage = isFollowUp && pendingFollowUp
      ? buildFollowUpPrompt(rawUserMessage, pendingFollowUp)
      : rawUserMessage;
    if (isFollowUp && pendingFollowUp) {
      pendingFollowUpRef.current = { ...pendingFollowUp, askedAt: Date.now() };
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput("");
    setIsLoading(true);
    const controller = beginAiRequest();
    const { signal } = controller;

    try {
      const ensureNotAborted = () => {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
      };
      let schemaText: string | null = null;
      let domSnapshot: any = null;
      let chatModeAnswered = false;
      let chatModeExecutedPageActions = false;
      let baseGoalText = isFollowUp && pendingFollowUp?.goalText ? pendingFollowUp.goalText : userMessage;
      let goalHint = baseGoalText;
      let goalText = isFollowUp ? `${baseGoalText}\nFollow-up: ${userMessage}` : baseGoalText;
      let youtubeSearchPerformed = false;
      let strictPlanExecution = false;
      let goalPlan: GoalPlan | null = null;
      const explicitActionRequest = /\b(click|type|fill|scroll|select|press|submit|enter|choose|tick|check|on this page|this page|open menu)\b/i.test(userMessage);
      const skipInitialGoalCheck = isFollowUp && explicitActionRequest;
      const immediateTarget = getDirectNavigationTarget(userMessage);
      const initialUrl = getActiveWebview()?.getURL?.() ?? activeTab.url;
      const initialIsHome = !initialUrl || initialUrl.startsWith('data:') || initialUrl.startsWith('about:');
      let deferredImmediateTarget = immediateTarget && initialIsHome && !explicitActionRequest ? immediateTarget : null;

      if (chatModeEnabled && cerebrasService.isConfigured()) {
        const skillMatch = skillMemoryService.findSkill(userMessage);
        if (skillMatch) {
          skillReplayRef.current = true;
          try {
            setMessages(prev => [
              ...prev,
              { role: 'assistant', content: 'I remember how to do this. Replaying the steps from last time.' }
            ]);
            await replaySkill(skillMatch, signal);
            skillMemoryService.recordUse(skillMatch.id);
            refreshSkillData();
            markChatTaskComplete();
            storePendingFollowUp({
              goalText: baseGoalText,
              userMessage,
              assistantMessage: '✅ Task done.',
              goalPlan,
              completed: true
            });
            setMessages(prev => [
              ...prev,
              { role: 'assistant', content: '✅ Task done.' }
            ]);
          } finally {
            skillReplayRef.current = false;
          }
          setIsLoading(false);
          return;
        }
        beginSkillCapture(userMessage);
      }

      if (chatModeEnabled && cerebrasService.isConfigured()) {
        try {
          const contextSummary = buildContextSummary();
          let reusedPlan = false;
          if (isFollowUp && pendingFollowUp && (pendingFollowUp.planSteps?.length || pendingFollowUp.successCriteria?.length)) {
            goalPlan = {
              goal: baseGoalText,
              steps: pendingFollowUp.planSteps ?? [],
              successCriteria: pendingFollowUp.successCriteria,
              questions: undefined
            };
            strictPlanExecution = Boolean(goalPlan.steps.length);
            reusedPlan = true;
          }

          if (!reusedPlan) {
            const goalPlanRaw = await cerebrasService.planGoalTask(plannerMessage, signal);
            goalPlan = parseGoalPlan(goalPlanRaw);
            if (goalPlan?.goal?.trim()) {
              baseGoalText = goalPlan.goal.trim();
            }
            strictPlanExecution = Boolean(goalPlan?.steps?.length);
          }

          goalHint = baseGoalText;
          goalText = isFollowUp ? `${baseGoalText}\nFollow-up: ${userMessage}` : baseGoalText;
          updateSkillGoal(baseGoalText);
          const memorySummary = strictPlanExecution ? '' : visitMemoryService.getMemorySummary(8);
          const frequentSitesForPlan = strictPlanExecution ? [] : frequentSites;

          if (goalPlan && (goalPlan.goal || goalPlan.steps.length || goalPlan.successCriteria?.length)) {
            const planLines = goalPlan.steps.slice(0, 6).map((step, idx) => `${idx + 1}. ${step}`).join('\n');
            const criteriaLines = goalPlan.successCriteria?.slice(0, 4).map((item) => `- ${item}`).join('\n') || '';
            const questionLines = goalPlan.questions?.slice(0, 3).map((item) => `- ${item}`).join('\n') || '';
            const goalLines = [
              goalPlan.goal ? `Goal: ${goalPlan.goal}` : `Goal: ${goalText}`,
              planLines ? `Plan:
${planLines}` : '',
              criteriaLines ? `Success criteria:
${criteriaLines}` : '',
              questionLines ? `Questions:
${questionLines}` : ''
            ].filter(Boolean).join('\n\n');
            if (goalLines) {
              setMessages(prev => [...prev, { role: 'assistant', content: goalLines }]);
            }
            if (goalPlan.questions && goalPlan.questions.length > 0) {
              storePendingFollowUp({
                goalText: baseGoalText,
                userMessage,
                assistantMessage: goalLines || goalText,
                goalPlan,
                completed: false,
                force: true
              });
              finalizeSkillCapture(false);
              setIsLoading(false);
              return;
            }
          }

          if (deferredImmediateTarget) {
            const target = navigateTo(deferredImmediateTarget, false);
            if (target) {
              setMessages(prev => [
                ...prev,
                { role: 'assistant', content: `Navigating to ${target}` }
              ]);
              recordSkillNavigation(target, false);
              deferredImmediateTarget = null;
              await delay(300);
              await waitForWebviewEvent(getActiveWebview(), ['did-stop-loading', 'dom-ready'], 12000);
              ensureNotAborted();
            }
          }

          let lastActionSummary = '';
          const maxAgentSteps = 6;

          for (let step = 1; step <= maxAgentSteps; step += 1) {
            ensureNotAborted();
            const page = await getPageContent();
            let goalCheck: GoalCheck | null = null;
            if (!(skipInitialGoalCheck && step === 1)) {
              const goalCheckRaw = await cerebrasService.checkGoalCompletion(
                goalText,
                plannerMessage,
                {
                  url: page.url,
                  title: page.title || activeTab.title || "Untitled",
                  content: page.content
                },
                goalPlan?.steps,
                lastActionSummary,
                signal
              );
              goalCheck = parseGoalCheck(goalCheckRaw);
            }

            if (goalCheck?.completed) {
              const completionMessage = goalCheck.response
                || goalCheck.evidence
                || 'Goal completed based on the current page.';
              const alreadyDone = /(done|complete|completed|finished|success|resolved|achieved)/i.test(completionMessage);
              const finalMessage = alreadyDone
                ? completionMessage
                : `${completionMessage} ✅ Task done.`;
              markChatTaskComplete();
              storePendingFollowUp({
                goalText: baseGoalText,
                userMessage,
                assistantMessage: finalMessage,
                goalPlan,
                lastActionSummary,
                completed: true
              });
              setMessages(prev => [
                ...prev,
                { role: 'assistant', content: finalMessage }
              ]);
              finalizeSkillCapture(true);
              chatModeAnswered = true;
              break;
            }

            if (goalCheck?.needsUserInput || goalCheck?.question) {
              const followUp = goalCheck.response
                || goalCheck.question
                || 'I need more details to continue. What specifics should I use?';
              storePendingFollowUp({
                goalText: baseGoalText,
                userMessage,
                assistantMessage: followUp,
                goalPlan,
                lastActionSummary,
                completed: false,
                force: true
              });
              setMessages(prev => [...prev, { role: 'assistant', content: followUp }]);
              finalizeSkillCapture(false);
              chatModeAnswered = true;
              break;
            }

            const schemaBundle = await ensurePageSchema();
            schemaText = schemaBundle?.schemaText || null;
            domSnapshot = schemaBundle?.snapshot || null;

            const planRaw = await cerebrasService.planChatBrowsing(plannerMessage, {
              currentUrl: page.url,
              currentTitle: page.title || activeTab.title || "Untitled",
              memorySummary,
              frequentSites: frequentSitesForPlan,
              pageSchema: schemaText,
              contextNotesSummary: contextSummary,
              goal: goalText,
              planSteps: goalPlan?.steps,
              successCriteria: goalPlan?.successCriteria,
              stepIndex: step,
              lastActionSummary
            }, signal);
            const browsingPlan = parseChatBrowsingPlan(planRaw);

            if (!browsingPlan) {
              break;
            }

            if (browsingPlan.response) {
              const responseLower = browsingPlan.response.toLowerCase();
              const mentionsHistory = /history|frequent|visited/.test(responseLower);
              const claimsDirectNav = /navigate directly|direct link|i(?:'|’)ll navigate directly|i will navigate directly/.test(responseLower);
              const suppressResponse = strictPlanExecution && (mentionsHistory || claimsDirectNav);
              if (!suppressResponse) {
                setMessages(prev => [...prev, { role: 'assistant', content: browsingPlan.response! }]);
              }
            }

            if (!browsingPlan.actions.length) {
              if (browsingPlan.response) {
                storePendingFollowUp({
                  goalText: baseGoalText,
                  userMessage,
                  assistantMessage: browsingPlan.response,
                  goalPlan,
                  lastActionSummary,
                  completed: false
                });
                chatModeAnswered = true;
              }
              break;
            }

            let navigationOccurred = false;
            let actionAttempted = false;
            let pageDomainRelevant = isDomainRelevantToGoal(`${goalText} ${userMessage}`, page.url);
            const directTarget = getDirectNavigationTarget(`${goalText} ${userMessage}`);
            const isHomeLike = !page.url || page.url.startsWith('data:') || page.url.startsWith('about:');
            const isYouTubeResults = isYouTubeResultsUrl(page.url);
            if (isYouTubeResults) {
              pageDomainRelevant = true;
            }
            const preferPageActions = Boolean(schemaText) && (explicitActionRequest || pageDomainRelevant || isYouTubeResults);
            let handledPlanActions = false;
            let deferredNavAction: ChatBrowsingAction | null = null;

            if (directTarget && !page.url.includes(directTarget.replace(/^https?:\/\//, ''))) {
              const target = navigateTo(directTarget, false);
              if (target) {
                navigationOccurred = true;
                actionAttempted = true;
                setMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: `Navigating to ${target}` }
                ]);
                recordSkillNavigation(target, false);
                await delay(300);
                await waitForWebviewEvent(getActiveWebview(), ['did-stop-loading', 'dom-ready'], 12000);
                ensureNotAborted();
                lastActionSummary = `Navigated to ${target}.`;
                continue;
              }
            }

            const currentHost = (() => {
              try {
                return new URL(page.url).host.toLowerCase();
              } catch {
                return '';
              }
            })();

            if (!youtubeSearchPerformed && currentHost.includes('youtube.com') && !explicitActionRequest && !isYouTubeResults && (isHomeLike || isYouTubeHomeUrl(page.url))) {
              const query = extractSearchQueryFromGoal(goalText || userMessage);
              if (query) {
                const selector = 'input#search, input[name="search_query"]';
                const ytPlan: ActionPlan = {
                  actions: [
                    { type: 'focus', selector },
                    { type: 'type', selector, text: query },
                    { type: 'press', selector, key: 'Enter' }
                  ],
                  notes: 'Search YouTube using the top search box.'
                };
                try {
                  const wv = getActiveWebview();
                  const beforeUrl = wv?.getURL?.() ?? page.url;
                  const { executed, attempted, results } = await executeActionPlan(ytPlan);
                  if (attempted > 0) {
                    actionAttempted = true;
                    chatModeExecutedPageActions = true;
                    youtubeSearchPerformed = true;
                    const logId = crypto.randomUUID();
                    setMessages(prev => [
                      ...prev,
                      {
                        id: logId,
                        role: 'assistant',
                        content: `Searching YouTube for "${query}".`,
                        kind: 'action-log',
                        actions: results,
                        summary: `Searching YouTube for "${query}".`
                      }
                    ]);
                  }
                  const pressOk = Array.isArray(results)
                    ? results.some(entry => entry.action.type === 'press' && entry.status === 'ok')
                    : false;
                  if (pressOk) {
                    const [didNavigate, afterUrl] = await Promise.all([
                      waitForWebviewEvent(wv, ['did-navigate', 'did-navigate-in-page', 'did-stop-loading', 'dom-ready'], 9000),
                      waitForUrlChange(wv, beforeUrl, 9000)
                    ]);
                    ensureNotAborted();
                    const urlChanged = beforeUrl && afterUrl && afterUrl !== beforeUrl;
                    if (didNavigate || urlChanged) {
                      lastActionSummary = `Searched YouTube for ${query}.`;
                      continue;
                    }
                  }

                  const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                  const target = navigateTo(fallbackUrl, false);
                  if (target) {
                    setMessages(prev => [
                      ...prev,
                      { role: 'assistant', content: `Opening YouTube results for "${query}".` }
                    ]);
                    recordSkillNavigation(target, false);
                    youtubeSearchPerformed = true;
                    await delay(300);
                    await waitForWebviewEvent(getActiveWebview(), ['did-stop-loading', 'dom-ready'], 12000);
                    ensureNotAborted();
                    lastActionSummary = `Opened YouTube results for ${query}.`;
                    continue;
                  }
                } catch {
                  // Ignore heuristic failures and continue planning.
                }
              }
            }
            if (directTarget && !page.url.includes(directTarget.replace(/^https?:\/\//, ''))) {
              const target = navigateTo(directTarget, false);
              if (target) {
                navigationOccurred = true;
                actionAttempted = true;
                setMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: `Navigating to ${target}` }
                ]);
                recordSkillNavigation(target, false);
                await delay(300);
                await waitForWebviewEvent(getActiveWebview(), ['did-stop-loading', 'dom-ready'], 12000);
                ensureNotAborted();
                lastActionSummary = `Navigated to ${target}.`;
                continue;
              }
            }

            if (preferPageActions) {
              for (const action of browsingPlan.actions) {
                if (action.type !== 'page_actions' || !action.plan) continue;
                if (isHomeLike || (!explicitActionRequest && !pageDomainRelevant)) {
                  continue;
                }
                const { executed, attempted, results } = await executeActionPlan(action.plan);
                if (attempted > 0) {
                  actionAttempted = true;
                  chatModeExecutedPageActions = true;
                  handledPlanActions = true;
                  const logId = crypto.randomUUID();
                  setMessages(prev => [
                    ...prev,
                    {
                      id: logId,
                      role: 'assistant',
                      content: `Executed ${executed}/${attempted} page action(s).`,
                      kind: 'action-log',
                      actions: results,
                      summary: `Executed ${executed}/${attempted} page action(s).`
                    }
                  ]);
                  if (actionPlanMayNavigate(action.plan)) {
                    const wv = getActiveWebview();
                    const beforeUrl = wv?.getURL?.() ?? page.url;
                    const [didNavigate, afterUrl] = await Promise.all([
                      waitForWebviewEvent(wv, ['did-navigate', 'did-navigate-in-page', 'did-stop-loading', 'dom-ready'], 9000),
                      waitForUrlChange(wv, beforeUrl, 9000)
                    ]);
                    ensureNotAborted();
                    const urlChanged = beforeUrl && afterUrl && afterUrl !== beforeUrl;
                    if (didNavigate || urlChanged) {
                      navigationOccurred = true;
                    }
                  }
                }
                if (navigationOccurred) break;
              }
            }

            if (!navigationOccurred) {
              for (const action of browsingPlan.actions) {
                if (action.type === 'open_url') {
                  if (preferPageActions) {
                    if (!deferredNavAction) deferredNavAction = action;
                    continue;
                  }
                  const target = navigateTo(action.url, action.inNewTab);
                  if (target) {
                    navigationOccurred = true;
                    actionAttempted = true;
                    setMessages(prev => [
                      ...prev,
                      { role: 'assistant', content: `Navigating to ${target}` }
                    ]);
                    recordSkillNavigation(target, action.inNewTab ?? false);
                  }
                  break;
                }
                if (action.type === 'search') {
                  if (preferPageActions) {
                    if (!deferredNavAction) deferredNavAction = action;
                    continue;
                  }
                  const target = navigateTo(action.query, false);
                  if (target) {
                    navigationOccurred = true;
                    actionAttempted = true;
                    setMessages(prev => [
                      ...prev,
                      { role: 'assistant', content: `Searching for: ${action.query}` }
                    ]);
                    recordSkillNavigation(target, false);
                  }
                  break;
                }
                if (action.type === 'suggest_sites') {
                  const lines = action.suggestions.slice(0, 8).map((s) => `- ${s}`).join('\n');
                  if (lines) {
                    setMessages(prev => [
                      ...prev,
                      {
                        role: 'assistant',
                        content: `Here are some sites you might want:
${lines}`
                      }
                    ]);
                    actionAttempted = true;
                  }
                  continue;
                }
                if (action.type === 'page_actions' && action.plan) {
                  if (preferPageActions) {
                    continue;
                  }
                  if (isHomeLike || (!explicitActionRequest && !pageDomainRelevant)) {
                    continue;
                  }
                  const { executed, attempted, results } = await executeActionPlan(action.plan);
                  if (attempted > 0) {
                    actionAttempted = true;
                    chatModeExecutedPageActions = true;
                    const logId = crypto.randomUUID();
                    setMessages(prev => [
                      ...prev,
                      {
                        id: logId,
                        role: 'assistant',
                        content: `Executed ${executed}/${attempted} page action(s).`,
                        kind: 'action-log',
                        actions: results,
                        summary: `Executed ${executed}/${attempted} page action(s).`
                      }
                    ]);
                    if (actionPlanMayNavigate(action.plan)) {
                      const wv = getActiveWebview();
                      const beforeUrl = wv?.getURL?.() ?? page.url;
                      const [didNavigate, afterUrl] = await Promise.all([
                        waitForWebviewEvent(wv, ['did-navigate', 'did-navigate-in-page', 'did-stop-loading', 'dom-ready'], 9000),
                        waitForUrlChange(wv, beforeUrl, 9000)
                      ]);
                      ensureNotAborted();
                      const urlChanged = beforeUrl && afterUrl && afterUrl !== beforeUrl;
                      if (didNavigate || urlChanged) {
                        navigationOccurred = true;
                      }
                    }
                  }
                  if (navigationOccurred) {
                    break;
                  }
                  continue;
                }
                if (action.type === 'create_site') {
                  const prompt = action.prompt.trim();
                  if (prompt) {
                    const type = action.creationType || creationType;
                    setCreationType(type);
                    setCreationPrompt(prompt);
                    setCreationStatus('idle');
                    setCreationError(null);
                    closeSecondaryPanels();
                    setCreatorPanelOpen(true);
                    if (browserMode === 'chat') {
                      setBrowserMode('classic');
                    }
                    storePendingFollowUp({
                      goalText: baseGoalText,
                      userMessage,
                      assistantMessage: 'I opened the Creator with that prompt.',
                      goalPlan,
                      lastActionSummary,
                      completed: false
                    });
                    setMessages(prev => [
                      ...prev,
                      { role: 'assistant', content: 'I opened the Creator with that prompt.' }
                    ]);
                  }
                  chatModeAnswered = true;
                  actionAttempted = true;
                  break;
                }
              }
            }

            if (!navigationOccurred && !actionAttempted && preferPageActions && !handledPlanActions && schemaText) {
              try {
                const nextStepHint = goalPlan?.steps?.[Math.max(0, step - 1)] || goalText;
                const goalScopedRequest = `Goal: ${goalText}\nCurrent step: ${nextStepHint}\nUser request: ${plannerMessage}\nOn this page, identify the exact clicks or inputs needed to advance the goal.`;
                const actionPlanRaw = await cerebrasService.planPageActions(goalScopedRequest, schemaText, signal);
                const actionPlan = parseActionPlan(actionPlanRaw);
                if (actionPlan && actionPlan.actions.length > 0) {
                  const { executed, attempted, results } = await executeActionPlan(actionPlan);
                  if (attempted > 0) {
                    actionAttempted = true;
                    chatModeExecutedPageActions = true;
                    handledPlanActions = true;
                    const logId = crypto.randomUUID();
                    setMessages(prev => [
                      ...prev,
                      {
                        id: logId,
                        role: 'assistant',
                        content: `Executed ${executed}/${attempted} page action(s).`,
                        kind: 'action-log',
                        actions: results,
                        summary: `Executed ${executed}/${attempted} page action(s).`
                      }
                    ]);
                    if (actionPlanMayNavigate(actionPlan)) {
                      const wv = getActiveWebview();
                      const beforeUrl = wv?.getURL?.() ?? page.url;
                      const [didNavigate, afterUrl] = await Promise.all([
                        waitForWebviewEvent(wv, ['did-navigate', 'did-navigate-in-page', 'did-stop-loading', 'dom-ready'], 9000),
                        waitForUrlChange(wv, beforeUrl, 9000)
                      ]);
                      ensureNotAborted();
                      const urlChanged = beforeUrl && afterUrl && afterUrl !== beforeUrl;
                      if (didNavigate || urlChanged) {
                        navigationOccurred = true;
                      }
                    }
                  }
                } else {
                  handledPlanActions = true;
                  if (isYouTubeResults && domSnapshot?.links?.length) {
                    const query = extractSearchQueryFromGoal(goalText || userMessage);
                    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const queryKey = normalize(query);
                    const isChannelHref = (href: string) =>
                      /\/@|\/channel\/|\/c\/|\/user\//.test(href || '');
                    const bestLink = domSnapshot.links.find((link: any) => {
                      const href = String(link?.href || '');
                      if (!href || !isChannelHref(href)) return false;
                      const label = [link?.text, link?.ariaLabel, link?.name].filter(Boolean).join(' ');
                      return queryKey && normalize(label).includes(queryKey);
                    });
                    if (bestLink?.selector) {
                      const ytFallbackPlan: ActionPlan = {
                        actions: [{ type: 'click', selector: bestLink.selector }],
                        notes: 'Click the channel result from YouTube search.'
                      };
                      const { executed, attempted, results } = await executeActionPlan(ytFallbackPlan);
                      if (attempted > 0) {
                        actionAttempted = true;
                        chatModeExecutedPageActions = true;
                        const logId = crypto.randomUUID();
                        setMessages(prev => [
                          ...prev,
                          {
                            id: logId,
                            role: 'assistant',
                            content: `Executed ${executed}/${attempted} page action(s).`,
                            kind: 'action-log',
                            actions: results,
                            summary: `Executed ${executed}/${attempted} page action(s).`
                          }
                        ]);
                        const wv = getActiveWebview();
                        const beforeUrl = wv?.getURL?.() ?? page.url;
                        const [didNavigate, afterUrl] = await Promise.all([
                          waitForWebviewEvent(wv, ['did-navigate', 'did-navigate-in-page', 'did-stop-loading', 'dom-ready'], 9000),
                          waitForUrlChange(wv, beforeUrl, 9000)
                        ]);
                        ensureNotAborted();
                        const urlChanged = beforeUrl && afterUrl && afterUrl !== beforeUrl;
                        if (didNavigate || urlChanged) {
                          navigationOccurred = true;
                        }
                      }
                    }
                  }
                }
              } catch (actionError) {
                console.error('Deferred page action planning failed:', actionError);
              }
            }

            if (!navigationOccurred && preferPageActions && deferredNavAction && !actionAttempted) {
              if (deferredNavAction.type === 'open_url' && pageContainsUrl(schemaText, domSnapshot, deferredNavAction.url)) {
                const target = navigateTo(deferredNavAction.url, deferredNavAction.inNewTab);
                if (target) {
                  navigationOccurred = true;
                  actionAttempted = true;
                  setMessages(prev => [
                    ...prev,
                    { role: 'assistant', content: `Navigating to ${target}` }
                  ]);
                  recordSkillNavigation(target, deferredNavAction.inNewTab ?? false);
                }
              }
            }

            if (!navigationOccurred && !actionAttempted && !explicitActionRequest && !pageDomainRelevant) {
              const fallbackQuery = goalText || userMessage;
              const target = navigateTo(fallbackQuery, false);
              if (target) {
                navigationOccurred = true;
                actionAttempted = true;
                setMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: `Searching for: ${fallbackQuery}` }
                ]);
                recordSkillNavigation(target, false);
              }
            }

            if (navigationOccurred) {
              await delay(300);
              await waitForWebviewEvent(getActiveWebview(), ['did-stop-loading', 'dom-ready'], 12000);
              ensureNotAborted();
              const postNavSchema = await ensurePageSchema();
              schemaText = postNavSchema?.schemaText || null;
              domSnapshot = postNavSchema?.snapshot || null;
              if (schemaText) {
                try {
                  const nextStepHint = goalPlan?.steps?.[Math.max(0, step - 1)] || goalText;
                  const goalScopedRequest = `Goal: ${goalText}\nCurrent step: ${nextStepHint}\nUser request: ${userMessage}\nProceed with the most relevant page action on this page to advance the goal.`;
                  const actionPlanRaw = await cerebrasService.planPageActions(goalScopedRequest, schemaText, signal);
                  const actionPlan = parseActionPlan(actionPlanRaw);
                  if (actionPlan && actionPlan.actions.length > 0) {
                    const { executed, attempted, results } = await executeActionPlan(actionPlan);
                    if (attempted > 0) {
                      actionAttempted = true;
                      chatModeExecutedPageActions = true;
                      const logId = crypto.randomUUID();
                      setMessages(prev => [
                        ...prev,
                        {
                          id: logId,
                          role: 'assistant',
                          content: `Executed ${executed}/${attempted} page action(s).`,
                          kind: 'action-log',
                          actions: results,
                          summary: `Executed ${executed}/${attempted} page action(s).`
                        }
                      ]);
                      if (actionPlanMayNavigate(actionPlan)) {
                        const wv = getActiveWebview();
                        const beforeUrl = wv?.getURL?.() ?? '';
                        await Promise.all([
                          waitForWebviewEvent(wv, ['did-navigate', 'did-navigate-in-page', 'did-stop-loading', 'dom-ready'], 9000),
                          waitForUrlChange(wv, beforeUrl, 9000)
                        ]);
                        ensureNotAborted();
                      }
                    }
                  }
                } catch (actionError) {
                  console.error('Post-navigation action planning failed:', actionError);
                }
              }
            } else if (actionAttempted) {
              await delay(800);
              ensureNotAborted();
            }

            if (browsingPlan.notes) {
              lastActionSummary = browsingPlan.notes;
            } else if (actionAttempted) {
              lastActionSummary = `Step ${step} actions attempted.`;
            }

            if (chatModeAnswered) break;
          }
        } catch (chatModeError) {
          console.error('Chat browsing planner failed:', chatModeError);
        }
      }

      if (chatModeAnswered) {
        finalizeSkillCapture(false);
        setIsLoading(false);
        return;
      }

      if (!schemaText) {
        const schemaBundle = await ensurePageSchema();
        schemaText = schemaBundle?.schemaText || null;
        domSnapshot = schemaBundle?.snapshot || null;
      }

      const currentUrl = getActiveWebview()?.getURL?.() ?? activeTab.url;
      const domainRelevant = isDomainRelevantToGoal(`${goalHint} ${userMessage}`, currentUrl);
      const shouldAttemptPageActions =
        (!chatModeEnabled || !cerebrasService.isConfigured()) ||
        explicitActionRequest ||
        domainRelevant;

      if (schemaText && !chatModeExecutedPageActions && shouldAttemptPageActions) {
        try {
          const actionPlanRaw = await cerebrasService.planPageActions(plannerMessage, schemaText, signal);
          const actionPlan = parseActionPlan(actionPlanRaw);
          if (actionPlan && actionPlan.actions.length > 0) {
            const { executed, attempted, results } = await executeActionPlan(actionPlan);
            if (attempted > 0) {
              const logId = crypto.randomUUID();
              setMessages(prev => [
                ...prev,
                {
                  id: logId,
                  role: 'assistant',
                  content: `Executed ${executed}/${attempted} page action(s).`,
                  kind: 'action-log',
                  actions: results,
                  summary: `Executed ${executed}/${attempted} page action(s).`
                }
              ]);
            }
          }
        } catch (actionError) {
          console.error('Automation planning failed:', actionError);
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: 'Unable to run page actions, continuing with answer.' }
          ]);
        }
      }

      const { content, title } = await getPageContent();
      const resolvedTitle = title || activeTab.title || "Untitled";
      const contextSummary = buildContextSummary();
      const response = await cerebrasService.chatWithPageAndSchema(
        plannerMessage,
        content,
        resolvedTitle,
        schemaText || undefined,
        domSnapshot || undefined,
        contextSummary || undefined,
        signal
      );
      storePendingFollowUp({
        goalText: baseGoalText,
        userMessage,
        assistantMessage: response,
        goalPlan,
        completed: false
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error: any) {
      if (signal.aborted || error?.name === 'AbortError') {
        return;
      }
      const errorMsg = error.message || "An error occurred";
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    } finally {
      clearAiRequest(controller);
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runChatRequest(chatInput);
  };



  // Bookmark functions
  const toggleBookmark = () => {
    const existingIndex = bookmarks.findIndex(b => b.url === activeTab.url);
    if (existingIndex >= 0) {
      setBookmarks(prev => prev.filter(b => b.url !== activeTab.url));
    } else {
      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        title: activeTab.title || "Untitled",
        url: activeTab.url,
        date: Date.now()
      };
      setBookmarks(prev => [...prev, newBookmark]);
    }
  };

  const isBookmarked = bookmarks.some(b => b.url === activeTab.url);

  // History functions
  const addToHistory = (title: string, url: string) => {
    const now = Date.now();
    setHistory(prev => {
      const last = prev[0];
      if (last && last.url === url && now - last.date < 15000) {
        const updated: HistoryItem = { ...last, title, date: now };
        return [updated, ...prev.slice(1)];
      }
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        title,
        url,
        date: now
      };
      return [newItem, ...prev].slice(0, 100);
    });
  };

  const openHistoryItem = (url: string) => {
    setOmnibox(url);
    setTabs(prev =>
      prev.map(t => (t.id === activeId ? { ...t, url, isHome: false } : t))
    );
    setHistoryPanelOpen(false);
  };

  const refreshMemoryData = (limit = 10) => {
    setFrequentSites(visitMemoryService.getFrequentSites(limit));
    setRecentVisits(visitMemoryService.getRecentVisits(20));
  };

  const recordVisitMemory = (url: string, title?: string) => {
    visitMemoryService.recordVisit(url, title);
    refreshMemoryData();
  };

  const closeSecondaryPanels = () => {
    setBookmarksPanelOpen(false);
    setHistoryPanelOpen(false);
    setDownloadsPanelOpen(false);
    setWatchedPagesPanelOpen(false);
    setResearchPanelOpen(false);
    setJsonPanelOpen(false);
    setCustomizationPanelOpen(false);
    setExtensionsPanelOpen(false);
    setCreatorPanelOpen(false);
    setHomePanelOpen(false);
    setSettingsPanelOpen(false);
    setMemoryPanelOpen(false);
    setComposePanelOpen(false);
  };

  const getActiveWebview = () => webviewsRef.current[activeIdRef.current];

  const beginAiRequest = () => {
    if (aiAbortRef.current) {
      aiAbortRef.current.abort();
    }
    const controller = new AbortController();
    aiAbortRef.current = controller;
    return controller;
  };

  const clearAiRequest = (controller: AbortController) => {
    if (aiAbortRef.current === controller) {
      aiAbortRef.current = null;
    }
  };

  const stopAiRequest = () => {
    if (!aiAbortRef.current) return;
    aiAbortRef.current.abort();
    aiAbortRef.current = null;
    const wv = getActiveWebview();
    wv?.stop?.();
    wv?.stopLoading?.();
  };

  const runFindInPage = (query: string, opts?: { forward?: boolean }) => {
    const wv = getActiveWebview();
    if (!wv || !query.trim()) {
      wv?.stopFindInPage?.('clearSelection');
      setFindResultCount(0);
      setFindActiveMatch(0);
      return;
    }
    const findNext = query === findLastQuery;
    wv.findInPage?.(query, {
      forward: opts?.forward ?? true,
      findNext,
      matchCase: findMatchCase
    });
    setFindLastQuery(query);
  };

  const closeFindBar = () => {
    setFindBarOpen(false);
    setFindQuery('');
    setFindResultCount(0);
    setFindActiveMatch(0);
    setFindLastQuery('');
    const wv = getActiveWebview();
    wv?.stopFindInPage?.('clearSelection');
  };

  const openTabSearch = () => {
    setTabSearchOpen(true);
    setTabSearchQuery('');
  };

  const closeTabSearch = () => {
    setTabSearchOpen(false);
    setTabSearchQuery('');
  };

  const tabSearchResults = useMemo(() => {
    const query = tabSearchQuery.trim().toLowerCase();
    if (!query) return tabs;
    return tabs.filter(tab =>
      tab.title.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query)
    );
  }, [tabs, tabSearchQuery]);

  const omniboxSuggestions = useMemo(() => {
    const query = omnibox.trim().toLowerCase();
    if (!query) return [];
    const historyMatches = history
      .filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map(item => ({ title: item.title, url: item.url, source: 'history' as const }));

    const frequentMatches = frequentSites
      .filter(site =>
        site.title.toLowerCase().includes(query) ||
        site.host.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map(site => ({ title: site.title || site.host, url: site.baseUrl, source: 'frequent' as const }));

    const combined = [...historyMatches, ...frequentMatches];
    const seen = new Set<string>();
    const unique = combined.filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    return unique.slice(0, 6);
  }, [omnibox, history, frequentSites]);

  const resetContextForm = () => {
    setContextTitle('');
    setContextContent('');
    setEditingContextId(null);
  };

  const saveContextNote = () => {
    const title = contextTitle.trim() || 'Untitled';
    const content = contextContent.trim();
    if (!content && !contextTitle.trim()) return;
    const now = Date.now();

    if (editingContextId) {
      setContextNotes(prev => prev.map(note =>
        note.id === editingContextId
          ? { ...note, title, content, updatedAt: now }
          : note
      ));
    } else {
      const note: ContextNote = {
        id: crypto.randomUUID(),
        title,
        content,
        createdAt: now,
        updatedAt: now
      };
      setContextNotes(prev => [note, ...prev].slice(0, 200));
    }

    resetContextForm();
  };

  const startEditContextNote = (note: ContextNote) => {
    setEditingContextId(note.id);
    setContextTitle(note.title);
    setContextContent(note.content);
  };

  const deleteContextNote = (id: string) => {
    setContextNotes(prev => prev.filter(note => note.id !== id));
    if (editingContextId === id) {
      resetContextForm();
    }
  };

  const loadProfileFromStorage = () => {
    const raw = localStorage.getItem('onboardingProfile');
    if (!raw) {
      setProfileName('');
      setProfileRole('');
      setProfileGoals('');
      setProfilePreferences('');
      setProfileLocation('');
      setProfileAddress('');
      return;
    }
    try {
      const profile = JSON.parse(raw) as {
        name?: string;
        role?: string;
        goals?: string;
        preferences?: string;
        location?: string;
        address?: string;
      };
      setProfileName(profile.name || '');
      setProfileRole(profile.role || '');
      setProfileGoals(profile.goals || '');
      setProfilePreferences(profile.preferences || '');
      setProfileLocation(profile.location || '');
      setProfileAddress(profile.address || '');
    } catch (error) {
      console.error('Failed to parse onboarding profile:', error);
    }
  };

  const upsertUserProfileNote = (profile: {
    name: string;
    role: string;
    goals: string;
    preferences: string;
    location: string;
    address: string;
  }) => {
    const lines: string[] = [];
    if (profile.name) lines.push(`Name: ${profile.name}`);
    if (profile.role) lines.push(`Role: ${profile.role}`);
    if (profile.goals) lines.push(`Goals: ${profile.goals}`);
    if (profile.preferences) lines.push(`Preferences: ${profile.preferences}`);
    if (profile.location) lines.push(`Location: ${profile.location}`);
    if (profile.address) lines.push(`Address: ${profile.address}`);
    const content = lines.join('\n');
    if (!content) return;
    const now = Date.now();

    setContextNotes(prev => {
      const existing = prev.find(note => note.title === 'User Profile');
      if (existing) {
        return prev.map(note =>
          note.id === existing.id
            ? { ...note, content, updatedAt: now }
            : note
        );
      }
      const note: ContextNote = {
        id: crypto.randomUUID(),
        title: 'User Profile',
        content,
        createdAt: now,
        updatedAt: now
      };
      return [note, ...prev].slice(0, 200);
    });
  };

  const saveProfileFromEditor = () => {
    const profile = {
      name: profileName.trim(),
      role: profileRole.trim(),
      goals: profileGoals.trim(),
      preferences: profilePreferences.trim(),
      location: profileLocation.trim(),
      address: profileAddress.trim()
    };
    localStorage.setItem('onboardingProfile', JSON.stringify(profile));
    upsertUserProfileNote(profile);
  };

  const completeOnboarding = (skip = false) => {
    const profile = {
      name: onboardingName.trim(),
      role: onboardingRole.trim(),
      goals: onboardingGoals.trim(),
      preferences: onboardingPreferences.trim(),
      location: onboardingLocation.trim(),
      address: onboardingAddress.trim()
    };
    const lines: string[] = [];
    if (!skip) {
      if (profile.name) lines.push(`Name: ${profile.name}`);
      if (profile.role) lines.push(`Role: ${profile.role}`);
      if (profile.goals) lines.push(`Goals: ${profile.goals}`);
      if (profile.preferences) lines.push(`Preferences: ${profile.preferences}`);
      if (profile.location) lines.push(`Location: ${profile.location}`);
      if (profile.address) lines.push(`Address: ${profile.address}`);
    }
    if (lines.length) {
      const now = Date.now();
      const note: ContextNote = {
        id: crypto.randomUUID(),
        title: 'User Profile',
        content: lines.join('\n'),
        createdAt: now,
        updatedAt: now
      };
      setContextNotes(prev => [note, ...prev].slice(0, 200));
      localStorage.setItem('onboardingProfile', JSON.stringify(profile));
    } else if (skip) {
      localStorage.removeItem('onboardingProfile');
    }
    localStorage.setItem('onboardingCompleted', 'true');
    setOnboardingOpen(false);
    setOnboardingName('');
    setOnboardingRole('');
    setOnboardingGoals('');
    setOnboardingPreferences('');
    setOnboardingLocation('');
    setOnboardingAddress('');
  };

  const contextNotesForDisplay = useMemo(() => {
    return [...contextNotes].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [contextNotes]);

  const buildContextSummary = () => {
    if (!contextNotesForDisplay.length) return '';
    return contextNotesForDisplay.slice(0, 6).map((note, idx) => {
      const trimmed = note.content.length > 240 ? `${note.content.slice(0, 240)}…` : note.content;
      return `${idx + 1}. ${note.title}\n${trimmed}`;
    }).join('\n\n');
  };

  // Download functions
  const addDownload = (filename: string, url: string) => {
    const newDownload: DownloadItem = {
      id: crypto.randomUUID(),
      filename,
      url,
      progress: 0,
      status: 'downloading',
      date: Date.now()
    };
    setDownloads(prev => [newDownload, ...prev]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloads(prev => prev.map(d =>
          d.id === newDownload.id ? { ...d, progress: 100, status: 'completed' } : d
        ));
      } else {
        setDownloads(prev => prev.map(d =>
          d.id === newDownload.id ? { ...d, progress } : d
        ));
      }
    }, 500);
  };

  // AI Highlights toggle
  const toggleHighlights = async () => {
    setHighlightsEnabled(!highlightsEnabled);
    const wv = webviewsRef.current[activeId];
    if (!wv) return;

    if (!highlightsEnabled) {
      await safeExecuteJavaScript(wv, `
        (() => {
          const overlay = document.createElement('div');
          overlay.id = 'ai-highlights-overlay';
          overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;opacity:0.15;';
          
          const paragraphs = document.querySelectorAll('p, h1, h2, h3, li');
          const highlights = [];
          
          paragraphs.forEach(p => {
            const text = p.textContent?.trim();
            if (text && text.length > 50 && text.length < 300) {
              const rect = p.getBoundingClientRect();
              highlights.push({
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height
              });
            }
          });
          
          highlights.slice(0, 10).forEach(h => {
            const highlight = document.createElement('div');
            highlight.style.cssText = 'position:absolute;background:rgba(255,255,0,0.3);border-radius:4px;';
            highlight.style.left = h.left + 'px';
            highlight.style.top = h.top + 'px';
            highlight.style.width = h.width + 'px';
            highlight.style.height = h.height + 'px';
            overlay.appendChild(highlight);
          });
          
          document.body.appendChild(overlay);
          return highlights.length + ' highlights applied';
        })()
      `);
    } else {
      await safeExecuteJavaScript(wv, `
        (() => {
          const overlay = document.getElementById('ai-highlights-overlay');
          if (overlay) overlay.remove();
          return 'Highlights removed';
        })()
      `);
    }
  };

  // Watch this page for changes
  const toggleWatchPage = async () => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return;

    const existing = watchedPages.find(w => w.url === activeTab.url);

    if (existing) {
      setWatchedPages(prev => prev.filter(w => w.url !== activeTab.url));
    } else {
      try {
        const content = await safeExecuteJavaScript(wv, `
          (() => {
            return document.body?.innerText?.substring(0, 1000) || "";
          })()
        `);
        if (typeof content !== 'string') return;

        const newWatched: WatchedPage = {
          id: crypto.randomUUID(),
          url: activeTab.url,
          title: activeTab.title || "Untitled",
          lastHash: btoa(content),
          lastChecked: Date.now(),
          notificationsEnabled: true
        };

        setWatchedPages(prev => [...prev, newWatched]);
      } catch (error) {
        console.error('Error watching page:', error);
      }
    }
  };

  const isPageWatched = watchedPages.some(w => w.url === activeTab.url);

  // Auto-fill forms
  const autoFillForms = async () => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return;

    try {
      const result = await safeExecuteJavaScript(wv, `
        (() => {
          const inputs = document.querySelectorAll('input, textarea');
          let filled = 0;
          
          inputs.forEach(input => {
            const type = input.type.toLowerCase();
            const name = input.name.toLowerCase();
            const id = input.id.toLowerCase();
            const placeholder = input.placeholder?.toLowerCase() || '';
            
            if (type === 'email' || name.includes('email') || id.includes('email') || placeholder.includes('email')) {
              input.value = 'demo@example.com';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled++;
            } else if (type === 'tel' || name.includes('phone') || id.includes('phone') || placeholder.includes('phone')) {
              input.value = '+1 (555) 123-4567';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled++;
            } else if (name.includes('name') || id.includes('name') || placeholder.includes('name')) {
              input.value = 'Demo User';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled++;
            } else if (name.includes('address') || id.includes('address') || placeholder.includes('address')) {
              input.value = '123 Demo Street, City, Country';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled++;
            } else if (type === 'number' || name.includes('age') || id.includes('age')) {
              input.value = '25';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              filled++;
            }
          });
          
          return 'Auto-filled ' + filled + ' form fields';
        })()
      `);
      if (result === null) return;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✅ Auto-filled form fields on this page. **Note:** This is a demo feature. In production, auto-fill should use secure, user-provided data.'
      }]);
    } catch (error) {
      console.error('Error auto-filling forms:', error);
    }
  };

  // Multi-agent research
  const startResearch = async () => {
    if (!researchQuery.trim()) return;

    const newAgent: ResearchAgent = {
      id: crypto.randomUUID(),
      query: researchQuery,
      status: 'researching',
      progress: 0,
      results: [],
      startTime: Date.now()
    };

    setResearchAgents(prev => [...prev, newAgent]);
    setResearchQuery("");
    setResearchPanelOpen(true);

  const simulateResearch = async () => {
      const steps = [
        { progress: 20, result: { url: 'https://example.com/result1', title: 'Research Result 1', summary: 'Initial findings on the topic...' } },
        { progress: 40, result: { url: 'https://example.com/result2', title: 'Research Result 2', summary: 'Additional information discovered...' } },
        { progress: 60, result: { url: 'https://example.com/result3', title: 'Research Result 3', summary: 'Deep dive into specific aspects...' } },
        { progress: 80, result: { url: 'https://example.com/result4', title: 'Research Result 4', summary: 'Cross-referenced information...' } },
        { progress: 100, result: { url: 'https://example.com/result5', title: 'Research Result 5', summary: 'Final synthesis and conclusions...' } }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setResearchAgents(prev => prev.map(agent =>
          agent.id === newAgent.id
            ? {
              ...agent,
              progress: step.progress,
              results: [...agent.results, step.result]
            }
            : agent
        ));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setResearchAgents(prev => prev.map(agent =>
        agent.id === newAgent.id
          ? { ...agent, status: 'completed' }
          : agent
      ));
    };

    simulateResearch();
  };

  const renderWebviews = () => (
    <div
      ref={webviewContainerRef}
      className="webview-shell"
      style={{ flex: 1, position: "relative", overflow: "hidden", width: "100%", height: "100%" }}
    >
      {tabs.map(t => {
        const isActive = t.id === activeId;
        return (
          <webview
            key={t.id}
            ref={(el) => {
              if (el) {
                webviewsRef.current[t.id] = el;
                if (!(el as any).__abListenersAdded) {
                  (el as any).__abListenersAdded = true;
                  (el as any).__abReady = false;
                  el.addEventListener('did-start-loading', () => {
                    (el as any).__abReady = false;
                  });
                  el.addEventListener('dom-ready', async () => {
                    (el as any).__abReady = true;
                    await safeExecuteJavaScript(el, `
                      (() => {
                        const meta = document.createElement('meta');
                        meta.name = 'viewport';
                        meta.content = 'width=1200, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
                        const head = document.head || document.getElementsByTagName('head')[0];
                        if (head) head.insertBefore(meta, head.firstChild);
                        document.body.style.minWidth = '1200px';
                        document.body.style.maxWidth = '100%';
                        document.body.style.overflowX = 'auto';
                      })();
                    `);
                    const currentUrl = (el as any).getURL?.() ?? t.url;
                    await applyExtensionsToWebview(el, currentUrl);
                  });
                  el.addEventListener('did-navigate', (e: any) => {
                    const newUrl = e?.url ?? t.url;
                    if (t.id === activeId) setOmnibox(newUrl);
                    const isHome = newUrl === (homeUrlRef.current || '');
                    setTabs(prev => prev.map(x => x.id === t.id
                      ? { ...x, url: newUrl, isHome, title: isHome ? getHomeTitle() : x.title }
                      : x
                    ));
                    if (!isHome && !newUrl.startsWith('data:')) {
                      const titleHint = tabs.find(x => x.id === t.id)?.title || t.title || newUrl;
                      addToHistory(titleHint, newUrl);
                      recordVisitMemory(newUrl, titleHint);
                    }
                  });
                  el.addEventListener('page-title-updated', (e: any) => {
                    const title = e?.title ?? "Tab";
                    setTabs(prev => prev.map(x => {
                      if (x.id !== t.id) return x;
                      const isHome = x.url === (homeUrlRef.current || '');
                      return { ...x, title: isHome ? getHomeTitle() : title, isHome };
                    }));
                    const currentUrl =
                      (el as any).getURL?.() ??
                      tabs.find(x => x.id === t.id)?.url ??
                      t.url;
                    const isHomeUrl = currentUrl === (homeUrlRef.current || '');
                    if (!isHomeUrl && !currentUrl.startsWith('data:')) {
                      recordVisitMemory(currentUrl, title);
                    }
                  });
                  el.addEventListener('did-fail-load', (e: any) => {
                    console.error(`Failed to load ${e.url}: ${e.errorDescription}`);
                  });
                  el.addEventListener('found-in-page', (event: any) => {
                    const result = event?.result;
                    if (!result) return;
                    setFindResultCount(result.matches || 0);
                    setFindActiveMatch(result.activeMatchOrdinal || 0);
                  });
                }
              } else {
                delete webviewsRef.current[t.id];
              }
            }}
            src={t.url}
            style={{
              width: "100%",
              height: "100%",
              display: isActive ? "inline-flex" : "none" as any,
              border: "none",
              visibility: isActive ? "visible" : "hidden" as any,
            }}
            partition="persist:ia-browser"
            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          />
        );
      })}
    </div>
  );

  const renderMemoryManager = (variant: 'panel' | 'inline') => (
    <div className={`memory-manager ${variant === 'inline' ? 'memory-manager--inline' : ''}`}>
      <div className="memory-manager-section">
        <div className="memory-manager-header">
          <span>Frequent Sites</span>
          <button className="memory-manager-refresh" onClick={() => refreshMemoryData()}>
            Refresh
          </button>
        </div>
        {frequentSites.length === 0 ? (
          <div className="memory-manager-empty">No frequent sites yet.</div>
        ) : (
          <div className="memory-site-list">
            {frequentSites.slice(0, 10).map(site => (
              <div key={site.host} className="memory-site-row">
                <div>
                  <div className="memory-site-title">{site.title || site.host}</div>
                  <div className="memory-site-meta">
                    {site.host} · {site.count} visits
                  </div>
                </div>
                <button
                  className="memory-site-open"
                  onClick={() => navigateTo(site.baseUrl, false)}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="memory-manager-section">
        <div className="memory-manager-header">
          <span>Recent Visits</span>
        </div>
        {recentVisits.length === 0 ? (
          <div className="memory-manager-empty">No visits recorded yet.</div>
        ) : (
          <div className="memory-visit-list">
            {recentVisits.slice(0, 12).map(visit => (
              <div key={`${visit.url}-${visit.timestamp}`} className="memory-visit-row">
                <div>
                  <div className="memory-site-title">{visit.title || visit.host}</div>
                  <div className="memory-site-meta">
                    {visit.url}
                  </div>
                </div>
                <button
                  className="memory-site-open"
                  onClick={() => navigateTo(visit.url, false)}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="memory-manager-section">
        <div className="memory-manager-header">
          <span>Context Notes</span>
        </div>
        <div className="memory-note-form">
          <input
            type="text"
            value={contextTitle}
            onChange={(e) => setContextTitle(e.target.value)}
            placeholder="Title"
            className="memory-note-input"
          />
          <textarea
            value={contextContent}
            onChange={(e) => setContextContent(e.target.value)}
            placeholder="Add context for the assistant (preferences, goals, reminders...)"
            className="memory-note-textarea"
          />
          <div className="memory-note-actions">
            <button
              className="memory-note-save"
              onClick={saveContextNote}
            >
              {editingContextId ? 'Update Note' : 'Add Note'}
            </button>
            {editingContextId && (
              <button className="memory-note-cancel" onClick={resetContextForm}>
                Cancel
              </button>
            )}
          </div>
        </div>
        {contextNotesForDisplay.length === 0 ? (
          <div className="memory-manager-empty">No context notes yet.</div>
        ) : (
          <div className="memory-note-list">
            {contextNotesForDisplay.slice(0, 12).map(note => (
              <div key={note.id} className="memory-note-card">
                <div className="memory-note-title">{note.title}</div>
                <div className="memory-note-content">{note.content}</div>
                <div className="memory-note-meta">
                  Updated {new Date(note.updatedAt).toLocaleString()}
                </div>
                <div className="memory-note-buttons">
                  <button className="memory-note-edit" onClick={() => startEditContextNote(note)}>
                    Edit
                  </button>
                  <button className="memory-note-delete" onClick={() => deleteContextNote(note.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="memory-manager-section">
        <div className="memory-manager-header">
          <span>AI Skills</span>
          <button className="memory-manager-refresh" onClick={refreshSkillData}>
            Refresh
          </button>
        </div>
        {skills.length === 0 ? (
          <div className="memory-manager-empty">No skills saved yet.</div>
        ) : (
          <div className="memory-note-list">
            {skills.slice(0, 20).map(skill => {
              const isExpanded = Boolean(expandedSkills[skill.id]);
              const title = skill.goal || skill.trigger || 'Untitled Skill';
              const updatedAt = new Date(skill.updatedAt).toLocaleString();
              const lastUsed = skill.lastUsedAt ? new Date(skill.lastUsedAt).toLocaleString() : null;
              return (
                <div key={skill.id} className="memory-note-card">
                  <div className="memory-note-title">{title}</div>
                  <div className="memory-note-content">
                    Trigger: {skill.trigger}
                  </div>
                  <div className="memory-note-meta">
                    Steps: {skill.steps.length} · Used {skill.useCount}x · Updated {updatedAt}
                    {lastUsed ? ` · Last used ${lastUsed}` : ''}
                  </div>
                  <div className="memory-note-buttons">
                    <button className="memory-note-edit" onClick={() => toggleSkillDetails(skill.id)}>
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                    <button className="memory-note-delete" onClick={() => deleteSkill(skill.id)}>
                      Delete
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="memory-skill-detail">
                      {skill.refinement ? (
                        <>
                          <div className="memory-skill-line">
                            <strong>Generalized trigger:</strong> {skill.refinement.generalizedTrigger || '—'}
                          </div>
                          {skill.refinement.generalizedGoal && (
                            <div className="memory-skill-line">
                              <strong>Generalized goal:</strong> {skill.refinement.generalizedGoal}
                            </div>
                          )}
                          {skill.refinement.example && (
                            <div className="memory-skill-line">
                              <strong>Example:</strong> {skill.refinement.example}
                            </div>
                          )}
                          {skill.refinement.algorithm?.length ? (
                            <div className="memory-skill-block">
                              <div className="memory-skill-block-title">Algorithm</div>
                              <ol className="memory-skill-list">
                                {skill.refinement.algorithm.map((step, index) => (
                                  <li key={`${skill.id}-alg-${index}`}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          ) : null}
                          {skill.refinement.reusableSubpaths?.length ? (
                            <div className="memory-skill-block">
                              <div className="memory-skill-block-title">Reusable subpaths</div>
                              <ul className="memory-skill-list">
                                {skill.refinement.reusableSubpaths.map((item, index) => (
                                  <li key={`${skill.id}-reuse-${index}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {skill.refinement.notes && (
                            <div className="memory-skill-line">
                              <strong>Notes:</strong> {skill.refinement.notes}
                            </div>
                          )}
                          {skill.refinement.tree?.length ? (
                            <div className="memory-skill-block">
                              <div className="memory-skill-block-title">Task tree</div>
                              <pre className="memory-skill-steps">
                                {JSON.stringify(skill.refinement.tree, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="memory-skill-pending">
                          Refinement pending (auto-runs every 5 skills).
                        </div>
                      )}
                      <div className="memory-skill-block">
                        <div className="memory-skill-block-title">Raw steps</div>
                        <pre className="memory-skill-steps">
                          {JSON.stringify(skill.steps, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="memory-manager-section">
        <div className="memory-manager-header">
          <span>User Profile</span>
        </div>
        <div className="memory-note-form">
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Name"
            className="memory-note-input"
          />
          <input
            type="text"
            value={profileRole}
            onChange={(e) => setProfileRole(e.target.value)}
            placeholder="Role / Work"
            className="memory-note-input"
          />
          <textarea
            value={profileGoals}
            onChange={(e) => setProfileGoals(e.target.value)}
            placeholder="Goals"
            className="memory-note-textarea"
          />
          <textarea
            value={profilePreferences}
            onChange={(e) => setProfilePreferences(e.target.value)}
            placeholder="Preferences"
            className="memory-note-textarea"
          />
          <input
            type="text"
            value={profileLocation}
            onChange={(e) => setProfileLocation(e.target.value)}
            placeholder="Location"
            className="memory-note-input"
          />
          <input
            type="text"
            value={profileAddress}
            onChange={(e) => setProfileAddress(e.target.value)}
            placeholder="Address"
            className="memory-note-input"
          />
          <div className="memory-note-actions">
            <button className="memory-note-save" onClick={saveProfileFromEditor}>
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMemoryPage = (onClose: () => void) => (
    <div className="memory-page">
      <div className="memory-page-header">
        <div>
          <div className="memory-page-title">Memory & Context</div>
          <div className="memory-page-subtitle">Review visits, frequent sites, and your saved context notes.</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
      </div>
      <div className="memory-page-content">
        {renderMemoryManager('panel')}
      </div>
    </div>
  );

  const showChatPreview = (isChatBrowser && (isLoading || aiActionDepth > 0 || chatPreviewPinned || messages.length > 0)) || chatPreviewExpanded;
  const renderChatBody = (variant: 'sidebar' | 'browser') => (
    <div className={`chat-body ${variant === 'browser' ? 'chat-body--browser' : ''}`}>
      <div className="chat-mode-card">
        <div className="chat-mode-header">
          <div>
            <div className="chat-mode-title">Chat Browsing</div>
            <div className="chat-mode-subtitle">
              Let the AI navigate and suggest sites from memory.
            </div>
          </div>
          <div className="chat-mode-controls">
            <label className="chat-mode-switch" title="Enable chat browsing mode">
              <input
                type="checkbox"
                checked={chatModeEnabled}
                onChange={(e) => setChatModeEnabled(e.target.checked)}
              />
              <span>On</span>
            </label>
            <button
              type="button"
              className="chat-mode-refresh"
              onClick={() => refreshMemoryData()}
            >
              Refresh
            </button>
          </div>
        </div>

        <label className="chat-mode-toggle">
          <input
            type="checkbox"
            checked={chatAutoOpenEnabled}
            onChange={(e) => setChatAutoOpenEnabled(e.target.checked)}
            disabled={!chatModeEnabled}
          />
          <span>Auto-open frequent site on new tab</span>
        </label>

        {chatModeEnabled && frequentSites.length > 0 && (
          <div className="chat-mode-sites">
            {frequentSites.slice(0, 8).map(site => (
              <button
                key={site.host}
                type="button"
                className="site-chip"
                onClick={() => navigateTo(site.baseUrl, false)}
                title={`${site.title} (${site.count} visits)`}
              >
                {site.title || site.host}
              </button>
            ))}
          </div>
        )}

        {chatModeEnabled && frequentSites.length === 0 && (
          <div className="chat-mode-empty">
            Visit a few sites and they will appear here.
          </div>
        )}
      </div>

      <button
        type="button"
        className="memory-manager-toggle"
        onClick={() => setMemoryPanelOpen(true)}
      >
        Open Memory & Context
      </button>

      {!isChatBrowser && AI_FEATURES.map(feature => (
        <button
          key={feature.id}
          onClick={() => handleAIFeature(feature)}
          disabled={isLoading}
          className="ai-feature-btn"
        >
          <span className="ai-feature-icon">{feature.icon}</span>
          <div>
            <div className="text-sm font-bold text-primary">
              {feature.label}
            </div>
            <div className="text-xs text-muted mt-1">
              {feature.description}
            </div>
          </div>
        </button>
      ))}

      {(messages.length > 0 || isLoading) && (
        <div className={`chat-thread ${isChatBrowser ? 'chat-thread--full' : ''}`}>
          {messages.map((msg, idx) => {
            const isActionLog = msg.kind === 'action-log' && Array.isArray(msg.actions);
            const logId = msg.id || `action-log-${idx}`;
            return (
              <div
                key={logId}
                className={`chat-message ${msg.role === "user" ? "chat-message--user" : "chat-message--assistant"}`}
              >
                {isActionLog ? (
                  <div className="action-log">
                    <div className="action-log-header">
                      <div className="action-log-summary">
                        {msg.summary || msg.content}
                      </div>
                      <button
                        type="button"
                        className="action-log-toggle"
                        onClick={() => toggleActionLog(logId)}
                      >
                        {expandedActionLogs[logId] ? "Hide actions" : "View actions"}
                      </button>
                    </div>
                    {expandedActionLogs[logId] && (
                      <div className="action-log-list">
                        {msg.actions!.map((entry, actionIdx) => (
                          <div key={`${logId}-${actionIdx}`} className="action-log-item">
                            <span className={`action-log-status action-log-status--${entry.status}`}>
                              {entry.status === 'ok' ? '✓' : entry.status === 'not_found' ? '!' : '•'}
                            </span>
                            <span className="action-log-text">
                              {entry.action.type}
                              {entry.action.selector ? ` → ${entry.action.selector}` : ''}
                              {entry.action.text ? ` : "${entry.action.text}"` : ''}
                              {entry.action.value ? ` = "${entry.action.value}"` : ''}
                              {entry.action.key ? ` [${entry.action.key}]` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="chat-content markdown-content">
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            );
          })}

          {isChatBrowser && (
            <>
              {chatPreviewExpanded && (
                <div className="chat-preview-backdrop" />
              )}
              <div className={`chat-message chat-message--assistant chat-preview-message ${showChatPreview ? 'chat-preview-message--visible' : 'chat-preview-message--hidden'} ${chatPreviewExpanded ? 'chat-preview-message--expanded' : ''} ${chatTakeoverActive ? 'chat-preview-message--interactive' : ''}`}>
                <div className={`chat-preview-card ${chatPreviewExpanded ? 'chat-preview-card--expanded' : ''}`}>
                  <div className="chat-preview-header">
                    <div className="chat-preview-label">Live tab preview (AI actions)</div>
                    <div className="chat-preview-actions">
                      {completedTabInfo && (
                        <button
                          type="button"
                          className="chat-preview-toggle"
                          onClick={addCompletedTabToTop}
                        >
                          Add to Tabs
                        </button>
                      )}
                      {chatPreviewExpanded ? (
                        <button
                          type="button"
                          className="chat-preview-toggle"
                          onClick={() => {
                            setChatPreviewPinned(false);
                            setChatPreviewExpanded(false);
                          }}
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="chat-preview-toggle"
                          onClick={() => {
                            setChatPreviewPinned(true);
                            setChatPreviewExpanded(true);
                          }}
                        >
                          Expand
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="chat-preview-content"
                    aria-hidden={!chatTakeoverActive}
                    ref={chatPreviewRef}
                    onClick={() => {
                      if (!chatPreviewExpanded) {
                        setChatPreviewPinned(true);
                        setChatPreviewExpanded(true);
                      }
                    }}
                  >
                    <div className="chat-preview-stage" style={{ transform: `scale(${chatPreviewScale})` }}>
                      {renderWebviews()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isLoading && (
            <div className="chat-message chat-message--assistant">
              <div className="text-muted text-sm flex items-center gap-2">
                <span className="animate-pulse">●</span> Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      <form onSubmit={handleChatSubmit} className={`chat-input ${isChatBrowser ? 'chat-input--full' : ''}`}>
        <div className="chat-input-row">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isChatBrowser ? "Tell me what you want to do..." : "Ask a question about this page..."}
            disabled={isLoading}
            className="chat-input-field"
          />
          <button
            type="submit"
            disabled={isLoading || !chatInput.trim()}
            className={`chat-input-send ${isLoading || !chatInput.trim() ? "chat-input-send--disabled" : ""}`}
          >
            Send
          </button>
        </div>
      </form>

      {!aiResult && !isLoading && messages.length === 0 && !isChatBrowser && (
        <div className="mt-4 p-4 bg-surface rounded border text-center">
          <div className="text-muted text-sm">
            Select an AI feature above or click "📝 Summarize" to analyze the current page
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      {browserMode === 'classic' ? (
        <>
          {/* Tabs */}
      <div className="tabs-bar">
        <button onClick={newTab} className="btn btn-ghost btn-icon" title="New Tab">＋</button>

        <div className="tabs-list">
          {tabs.map(t => (
            <div
              key={t.id}
              className={`tab ${t.id === activeId ? "tab--active" : ""}`}
              onClick={() => {
                setActiveId(t.id);
                setOmnibox(t.url);
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                {t.title || "New Tab"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                className="btn btn-ghost btn-icon"
                style={{ width: '24px', height: '24px', fontSize: '12px', marginLeft: '4px' }}
                title="Close Tab"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          className={`btn ${aiSidebarOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
          title="Toggle AI Assistant"
        >
          AI
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setBrowserMode('chat')}
          title="Switch to Chat Browser"
        >
          💬 Chat Browser
        </button>
        <button
          className="btn btn-ghost"
          onClick={openTabSearch}
          title="Search Tabs (Ctrl+K)"
        >
          🔎 Tabs
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-ghost btn-icon" onClick={() => nav("back")} title="Back">←</button>
        <button className="btn btn-ghost btn-icon" onClick={() => nav("forward")} title="Forward">→</button>
        <button className="btn btn-ghost btn-icon" onClick={() => nav("reload")} title="Reload">⟳</button>

        <div className="omnibox-wrap">
          <input
            value={omnibox}
            onChange={(e) => setOmnibox(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            onFocus={() => setOmniboxFocused(true)}
            onBlur={() => setTimeout(() => setOmniboxFocused(false), 120)}
            className="omnibox"
            placeholder="Search or enter URL..."
          />
          {omniboxFocused && omniboxSuggestions.length > 0 && (
            <div className="omnibox-suggestions">
              {omniboxSuggestions.map(item => (
                <button
                  key={item.url}
                  type="button"
                  className="omnibox-suggestion"
                  onClick={() => {
                    navigateTo(item.url, false);
                    setOmniboxFocused(false);
                  }}
                >
                  <span className="omnibox-suggestion-title">{item.title || item.url}</span>
                  <span className="omnibox-suggestion-url">{item.url}</span>
                </button>
              ))}
              <button
                type="button"
                className="omnibox-suggestion omnibox-suggestion--search"
                onClick={() => {
                  go();
                  setOmniboxFocused(false);
                }}
              >
                Search “{omnibox}”
              </button>
            </div>
          )}
        </div>

        <button className="btn btn-ghost" onClick={go}>Go</button>
        <button
          className={`btn ${bookmarksBarVisible ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setBookmarksBarVisible(prev => !prev)}
          title="Toggle bookmarks bar"
        >
          ★ Bar
        </button>

        <button
          className="btn btn-primary"
          onClick={handleQuickSummarize}
          title="Summarize this page"
        >
          📝 Summarize
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            closeSecondaryPanels();
            setComposePanelOpen(true);
          }}
          title="Compose text with page context"
        >
          ✍️ Compose
        </button>

        <button
          className={`btn btn-icon ${isBookmarked ? "btn-warning" : "btn-ghost"}`}
          onClick={toggleBookmark}
          title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          style={{ color: isBookmarked ? "var(--warning)" : "inherit" }}
        >
          {isBookmarked ? "★" : "☆"}
        </button>

        <button
          className={`btn btn-icon ${adBlockEnabled ? "btn-success" : "btn-ghost"}`}
          onClick={() => setAdBlockEnabled(!adBlockEnabled)}
          title={adBlockEnabled ? "Ad blocking enabled" : "Ad blocking disabled"}
          style={{ color: adBlockEnabled ? "var(--success)" : "inherit" }}
        >
          🛡️
        </button>

        <button
          className={`btn btn-icon ${highlightsEnabled ? "btn-info" : "btn-ghost"}`}
          onClick={toggleHighlights}
          title={highlightsEnabled ? "AI highlights on" : "AI highlights off"}
          style={{ color: highlightsEnabled ? "var(--accent-primary)" : "inherit" }}
        >
          ✨
        </button>

        <button
          className={`btn btn-icon ${isPageWatched ? "btn-danger" : "btn-ghost"}`}
          onClick={toggleWatchPage}
          title={isPageWatched ? "Stop watching this page" : "Watch this page for changes"}
          style={{ color: isPageWatched ? "var(--danger)" : "inherit" }}
        >
          👁️
        </button>

        <button
          className="btn btn-ghost"
          onClick={autoFillForms}
          title="Auto-fill forms on this page"
        >
          📝 Fill
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setFindBarOpen(true)}
          title="Find in page (Ctrl+F)"
        >
          🔍 Find
        </button>
      </div>

      {findBarOpen && (
        <div className="find-bar">
          <input
            value={findQuery}
            onChange={(e) => {
              const value = e.target.value;
              setFindQuery(value);
              runFindInPage(value, { forward: true });
            }}
            placeholder="Find in page..."
            className="find-input"
            autoFocus
          />
          <button className="find-btn" onClick={() => runFindInPage(findQuery, { forward: false })}>↑</button>
          <button className="find-btn" onClick={() => runFindInPage(findQuery, { forward: true })}>↓</button>
          <label className="find-toggle">
            <input
              type="checkbox"
              checked={findMatchCase}
              onChange={(e) => {
                setFindMatchCase(e.target.checked);
                runFindInPage(findQuery, { forward: true });
              }}
            />
            Match case
          </label>
          <span className="find-count">
            {findResultCount ? `${findActiveMatch}/${findResultCount}` : '0'}
          </span>
          <button className="find-btn" onClick={closeFindBar}>✕</button>
        </div>
      )}

      {bookmarksBarVisible && bookmarks.length > 0 && (
        <div className="bookmarks-bar">
          {bookmarks.slice(0, 10).map(bookmark => (
            <button
              key={bookmark.id}
              className="bookmark-chip"
              onClick={() => navigateTo(bookmark.url, false)}
              title={bookmark.url}
            >
              {bookmark.title || bookmark.url}
            </button>
          ))}
          {bookmarks.length > 10 && (
            <button className="bookmark-chip bookmark-chip--more" onClick={() => {
              closeSecondaryPanels();
              setBookmarksPanelOpen(true);
            }}>
              +{bookmarks.length - 10} More
            </button>
          )}
        </div>
      )}

      {/* Secondary Toolbar */}
      <div className="toolbar toolbar-secondary">
        <button
          className={`btn ${bookmarksPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !bookmarksPanelOpen;
            closeSecondaryPanels();
            setBookmarksPanelOpen(next);
          }}
        >
          📑 Bookmarks
        </button>
        <button
          className={`btn ${historyPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !historyPanelOpen;
            closeSecondaryPanels();
            setHistoryPanelOpen(next);
          }}
        >
          🕐 History
        </button>
        <button
          className={`btn ${memoryPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !memoryPanelOpen;
            closeSecondaryPanels();
            setMemoryPanelOpen(next);
          }}
        >
          🧠 Memory
        </button>
        <button
          className={`btn ${downloadsPanelOpen ? "btn-primary" : "btn-ghost"}`}
          style={{ position: "relative" }}
          onClick={() => {
            const next = !downloadsPanelOpen;
            closeSecondaryPanels();
            setDownloadsPanelOpen(next);
          }}
        >
          ↓ Downloads
          {downloads.filter(d => d.status === 'downloading').length > 0 && (
            <span style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "var(--danger)",
              color: "white",
              fontSize: "10px",
              padding: "2px 5px",
              borderRadius: "10px",
              fontWeight: "bold"
            }}>
              {downloads.filter(d => d.status === 'downloading').length}
            </span>
          )}
        </button>
        <button
          className={`btn ${watchedPagesPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !watchedPagesPanelOpen;
            closeSecondaryPanels();
            setWatchedPagesPanelOpen(next);
          }}
        >
          👁️ Watched
        </button>
        <button
          className={`btn ${researchPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !researchPanelOpen;
            closeSecondaryPanels();
            setResearchPanelOpen(next);
          }}
        >
          🔬 Research
        </button>
        <button
          className={`btn ${creatorPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !creatorPanelOpen;
            closeSecondaryPanels();
            setCreatorPanelOpen(next);
          }}
        >
          ✨ Create
        </button>
        <button
          className={`btn ${customizationPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !customizationPanelOpen;
            closeSecondaryPanels();
            setCustomizationPanelOpen(next);
          }}
        >
          🎨 Customize
        </button>
        <button
          className={`btn ${extensionsPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !extensionsPanelOpen;
            closeSecondaryPanels();
            setExtensionsPanelOpen(next);
          }}
        >
          🧩 Extensions
        </button>
        <button
          className={`btn ${settingsPanelOpen ? "btn-primary" : "btn-ghost"}`}
          onClick={() => {
            const next = !settingsPanelOpen;
            closeSecondaryPanels();
            setSettingsPanelOpen(next);
          }}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Main content area with panels */}
      <div className="main-content">
        {memoryPanelOpen ? (
          renderMemoryPage(() => setMemoryPanelOpen(false))
        ) : (
          <>
            {/* Left side panels */}
            {(bookmarksPanelOpen || historyPanelOpen || downloadsPanelOpen || watchedPagesPanelOpen || researchPanelOpen || jsonPanelOpen || customizationPanelOpen || extensionsPanelOpen || settingsPanelOpen || creatorPanelOpen) && (
              <div className="side-panel" style={{ width: "300px" }}>
            {/* Bookmarks Panel */}
            {bookmarksPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">📑 Bookmarks</span>
                  <button
                    onClick={() => setBookmarksPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  {bookmarks.length === 0 ? (
                    <div className="text-center text-muted text-sm pt-5">
                      No bookmarks yet.<br />Click ☆ to bookmark a page.
                    </div>
                  ) : (
                    bookmarks.map(b => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setOmnibox(b.url);
                          setTabs(prev => prev.map(t => t.id === activeId ? { ...t, url: b.url, isHome: false } : t));
                        }}
                        className="p-2 mb-1 rounded bg-surface border cursor-pointer hover:bg-surface-2 transition-colors"
                      >
                        <div className="text-sm font-bold mb-1 text-primary">
                          {b.title}
                        </div>
                        <div className="text-xs text-muted truncate mb-1">
                          {b.url}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookmarks(prev => prev.filter(bookmark => bookmark.id !== b.id));
                          }}
                          className="btn btn-danger text-xs px-2 py-1 h-auto mt-1 w-full"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* History Panel */}
            {historyPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">🕐 History</span>
                  <button
                    onClick={() => setHistoryPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  <input
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Search history..."
                    className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent"
                  />
                  {history.length === 0 ? (
                    <div className="text-center text-muted text-sm pt-5">
                      No history yet.
                    </div>
                  ) : (
                    history
                      .filter(h =>
                        !historyQuery.trim() ||
                        h.title.toLowerCase().includes(historyQuery.toLowerCase()) ||
                        h.url.toLowerCase().includes(historyQuery.toLowerCase())
                      )
                      .map(h => (
                      <div
                        key={h.id}
                        onClick={() => openHistoryItem(h.url)}
                        className="p-2 mb-1 rounded bg-surface border cursor-pointer hover:bg-surface-2 transition-colors"
                      >
                        <div className="text-sm font-bold mb-1 text-primary">
                          {h.title}
                        </div>
                        <div className="text-xs text-muted truncate mb-1">
                          {h.url}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(h.date).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Downloads Panel */}
            {downloadsPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">↓ Downloads</span>
                  <button
                    onClick={() => setDownloadsPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  {downloads.length === 0 ? (
                    <div className="text-center text-muted text-sm pt-5">
                      No downloads yet.
                    </div>
                  ) : (
                    downloads.map(d => (
                      <div
                        key={d.id}
                        className="p-2 mb-1 rounded bg-surface border"
                      >
                        <div className="text-sm font-bold mb-1 text-primary">
                          {d.filename}
                        </div>
                        <div className="text-xs text-muted truncate mb-2">
                          {d.url}
                        </div>
                        {d.status === 'downloading' && (
                          <div className="mb-2">
                            <div className="h-1 bg-surface-3 rounded overflow-hidden">
                              <div
                                className="h-full bg-info transition-all duration-300"
                                style={{ width: `${d.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted mt-1">
                              {Math.round(d.progress)}%
                            </div>
                          </div>
                        )}
                        {d.status === 'completed' && (
                          <div className="text-xs font-bold text-success">
                            ✓ Completed
                          </div>
                        )}
                        {d.status === 'failed' && (
                          <div className="text-xs font-bold text-danger">
                            ✗ Failed
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => addDownload(`file-${Date.now()}.pdf`, activeTab.url)}
                    className="btn btn-ghost w-full mt-2 text-xs border border-dashed"
                  >
                    + Simulate Download
                  </button>
                </div>
              </>
            )}

            {/* Watched Pages Panel */}
            {watchedPagesPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">👁️ Watched Pages</span>
                  <button
                    onClick={() => setWatchedPagesPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  {watchedPages.length === 0 ? (
                    <div className="text-center text-muted text-sm pt-5">
                      No watched pages yet.<br />Click 👁️ to watch a page for changes.
                    </div>
                  ) : (
                    watchedPages.map(w => (
                      <div
                        key={w.id}
                        className="p-2 mb-1 rounded bg-surface border"
                      >
                        <div className="text-sm font-bold mb-1 text-primary">
                          {w.title}
                        </div>
                        <div className="text-xs text-muted truncate mb-1">
                          {w.url}
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-muted">
                            Last checked: {new Date(w.lastChecked).toLocaleString()}
                          </span>
                          <span className={`text-xs ${w.notificationsEnabled ? "text-success" : "text-muted"}`}>
                            {w.notificationsEnabled ? "🔔 On" : "🔕 Off"}
                          </span>
                        </div>
                        <button
                          onClick={() => setWatchedPages(prev => prev.filter(wp => wp.id !== w.id))}
                          className="btn btn-danger text-xs px-2 py-1 h-auto w-full"
                        >
                          Stop Watching
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Research Panel */}
            {researchPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">🔬 Multi-Agent Research</span>
                  <button
                    onClick={() => setResearchPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  <div className="mb-3">
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      placeholder="Enter research topic..."
                      onKeyDown={(e) => e.key === "Enter" && startResearch()}
                      className="w-full p-2 rounded bg-surface border text-sm mb-2 outline-none focus:border-accent"
                    />
                    <button
                      onClick={startResearch}
                      disabled={!researchQuery.trim()}
                      className={`btn w-full font-bold ${!researchQuery.trim() ? "btn-ghost opacity-50" : "btn-primary"}`}
                    >
                      🚀 Start Research
                    </button>
                  </div>

                  {researchAgents.length === 0 ? (
                    <div className="text-center text-muted text-sm pt-5">
                      No research yet.<br />Enter a topic above to start.
                    </div>
                  ) : (
                    researchAgents.map(agent => (
                      <div
                        key={agent.id}
                        className="p-3 mb-2 rounded bg-surface border"
                      >
                        <div className="text-sm font-bold mb-2 text-primary">
                          {agent.query}
                        </div>
                        {agent.status === 'researching' && (
                          <div className="mb-2">
                            <div className="h-1 bg-surface-3 rounded overflow-hidden">
                              <div
                                className="h-full bg-accent-tertiary transition-all duration-300"
                                style={{ width: `${agent.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted mt-1">
                              Researching... {agent.progress}%
                            </div>
                          </div>
                        )}
                        {agent.status === 'completed' && (
                          <div className="text-xs font-bold text-success mb-2">
                            ✓ Research Complete - Found {agent.results.length} results
                          </div>
                        )}
                        {agent.results.length > 0 && (
                          <div className="max-h-60 overflow-y-auto pr-1">
                            {agent.results.map((result, idx) => (
                              <div
                                key={idx}
                                className="p-2 mb-1 rounded bg-surface-2 border border-subtle"
                              >
                                <div className="text-xs font-bold mb-1 text-primary">
                                  {result.title}
                                </div>
                                <div className="text-xs text-muted truncate mb-1">
                                  {result.url}
                                </div>
                                <div className="text-xs text-muted line-clamp-2">
                                  {result.summary}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Creator Panel */}
            {creatorPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">✨ AI Creator</span>
                  <button
                    onClick={() => setCreatorPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  <div className="p-3 rounded bg-surface border mb-3">
                    <div className="text-xs text-muted mb-2">
                      Describe what you want to build. The AI will generate a single-file HTML project you can save.
                    </div>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={creationType}
                        onChange={(e) => setCreationType(e.target.value as Creation['type'])}
                        className="flex-1 p-2 rounded bg-surface-2 border text-xs outline-none focus:border-accent"
                      >
                        <option value="webpage">Webpage</option>
                        <option value="game">Game</option>
                        <option value="app">App</option>
                      </select>
                    </div>
                    <textarea
                      value={creationPrompt}
                      onChange={(e) => setCreationPrompt(e.target.value)}
                      placeholder="e.g., A neon cyberpunk landing page for a synthwave festival..."
                      rows={4}
                      className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent resize-y"
                    />
                    <button
                      onClick={handleGenerateCreation}
                      disabled={!creationPrompt.trim() || creationStatus === 'generating'}
                      className={`btn w-full font-bold ${!creationPrompt.trim() || creationStatus === 'generating' ? "btn-ghost opacity-50" : "btn-primary"}`}
                    >
                      {creationStatus === 'generating' ? '⚡ Generating...' : '✨ Generate'}
                    </button>
                    {creationStatus === 'error' && (
                      <div className="text-xs mt-2" style={{ color: 'var(--danger)' }}>
                        {creationError || 'Failed to generate content. Try a simpler prompt.'}
                      </div>
                    )}
                  </div>

                  {creationDraft && (
                    <div className="p-3 rounded bg-surface border mb-3">
                      <div className="text-xs font-bold mb-2 text-primary">Draft</div>
                      <div className="text-xs text-muted mb-2">Opened in a new tab.</div>
                      <input
                        value={creationDraft.title}
                        onChange={(e) => setCreationDraft(prev => prev ? { ...prev, title: e.target.value, updatedAt: Date.now() } : prev)}
                        className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent"
                      />
                      {creationDraft.description && (
                        <div className="text-xs text-muted mb-2">{creationDraft.description}</div>
                      )}
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={saveCreationDraft}
                          className="btn btn-primary text-xs flex-1"
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={() => openCreation(creationDraft)}
                          className="btn btn-ghost text-xs flex-1"
                        >
                          ▶ Open
                        </button>
                      </div>
                      <button
                        onClick={() => startEditCreation(creationDraft, 'draft')}
                        className="btn btn-ghost text-xs w-full mb-2"
                      >
                        ✏️ Edit Draft
                      </button>
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => downloadCreation(creationDraft)}
                          className="btn btn-ghost text-xs flex-1"
                        >
                          ⬇️ Download
                        </button>
                        <button
                          onClick={() => copyCreationHtml(creationDraft)}
                          className="btn btn-ghost text-xs flex-1"
                        >
                          📋 Copy HTML
                        </button>
                      </div>
                      <div className="text-xs text-muted mb-2">
                        Prompt: {creationDraft.prompt}
                      </div>
                      <div className="rounded border bg-surface-2" style={{ overflow: 'hidden' }}>
                        <iframe
                          title="AI creation preview"
                          srcDoc={creationDraft.html}
                          sandbox="allow-scripts"
                          style={{ width: '100%', height: '220px', border: 0, background: '#fff' }}
                        />
                      </div>
                    </div>
                  )}

                  {editingCreation && (
                    <div className="p-3 rounded bg-surface border mb-3">
                      <div className="text-xs font-bold mb-2 text-primary">
                        Edit Mode
                      </div>
                      <div className="text-xs text-muted mb-3">
                        Update the title, prompt, or HTML directly. Changes can be saved back to the creation.
                      </div>
                      <div className="flex gap-2 mb-2">
                        <select
                          value={editingType}
                          onChange={(e) => setEditingType(e.target.value as Creation['type'])}
                          className="flex-1 p-2 rounded bg-surface-2 border text-xs outline-none focus:border-accent"
                        >
                          <option value="webpage">Webpage</option>
                          <option value="game">Game</option>
                          <option value="app">App</option>
                        </select>
                        <button
                          onClick={() => {
                            const preview: Creation = {
                              ...editingCreation,
                              title: editingTitle,
                              description: editingDescription,
                              prompt: editingPrompt,
                              html: editingHtml,
                              type: editingType,
                              updatedAt: Date.now()
                            };
                            updateCreationCache(preview.id, preview.html);
                            openCreation(preview);
                          }}
                          className="btn btn-ghost text-xs"
                        >
                          ▶ Preview
                        </button>
                      </div>
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent"
                      />
                      <input
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        placeholder="Short description (optional)"
                        className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent"
                      />
                      <textarea
                        value={editingPrompt}
                        onChange={(e) => setEditingPrompt(e.target.value)}
                        placeholder="Original prompt"
                        rows={2}
                        className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent resize-y"
                      />
                      <textarea
                        value={editingHtml}
                        onChange={(e) => setEditingHtml(e.target.value)}
                        placeholder="Edit HTML"
                        rows={8}
                        className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent resize-y font-mono"
                      />
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => applyCreationEdits(false)}
                          className="btn btn-primary text-xs flex-1"
                        >
                          💾 Save Changes
                        </button>
                        <button
                          onClick={() => applyCreationEdits(true)}
                          className="btn btn-ghost text-xs flex-1"
                        >
                          ▶ Save & Open
                        </button>
                      </div>
                      <div className="p-2 rounded bg-surface-2 border mb-2">
                        <div className="text-xs text-muted mb-2">
                          AI Update (optional)
                        </div>
                        <textarea
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="Describe the changes you want the AI to make..."
                          rows={3}
                          className="w-full p-2 rounded bg-surface border text-xs mb-2 outline-none focus:border-accent resize-y"
                        />
                        <button
                          onClick={handleAiUpdateCreation}
                          disabled={!editInstruction.trim() || editStatus === 'updating'}
                          className={`btn w-full text-xs ${!editInstruction.trim() || editStatus === 'updating' ? "btn-ghost opacity-50" : "btn-primary"}`}
                        >
                          {editStatus === 'updating' ? 'Updating...' : '✨ Apply AI Changes'}
                        </button>
                        {editStatus === 'error' && (
                          <div className="text-xs mt-2" style={{ color: 'var(--danger)' }}>
                            {editError || 'Failed to update creation.'}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={cancelEditCreation}
                        className="btn btn-ghost text-xs w-full"
                      >
                        Close Edit Mode
                      </button>
                    </div>
                  )}

                  <div className="p-3 rounded bg-surface border">
                    <div className="text-xs font-bold mb-2 text-primary">
                      Saved Creations ({creations.length})
                    </div>
                    {creations.length === 0 ? (
                      <div className="text-center text-muted text-sm pt-3">
                        No saved creations yet.
                      </div>
                    ) : (
                      creations.map(item => (
                        <div
                          key={item.id}
                          className="p-2 mb-2 rounded bg-surface-2 border"
                        >
                          <div className="text-sm font-bold mb-1 text-primary">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted mb-1">
                            {item.type.toUpperCase()} • {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted mb-2">
                              {item.description}
                            </div>
                          )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCreation(item)}
                            className="btn btn-ghost text-xs flex-1"
                          >
                            ▶ Open
                          </button>
                          <button
                            onClick={() => startEditCreation(item, 'saved')}
                            className="btn btn-ghost text-xs flex-1"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => downloadCreation(item)}
                            className="btn btn-ghost text-xs flex-1"
                          >
                              ⬇️
                            </button>
                            <button
                              onClick={() => copyCreationHtml(item)}
                              className="btn btn-ghost text-xs flex-1"
                            >
                              📋
                            </button>
                            <button
                              onClick={() => deleteCreation(item.id)}
                              className="btn btn-ghost text-xs text-danger px-2"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Page Customization Panel */}
            {customizationPanelOpen && (
              <PageCustomizationPanel
                webview={webviewsRef.current[activeId]}
                url={activeTab.url}
                title={activeTab.title || "Untitled"}
              />
            )}

            {/* Extensions Panel */}
            {extensionsPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">🧩 Extensions</span>
                  <button
                    onClick={() => setExtensionsPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  <div className="p-3 rounded bg-surface border mb-3">
                    <div className="text-xs text-muted mb-2">
                      Describe the extension you want to generate (e.g., "Add a dark mode toggle to this page")
                    </div>
                    <textarea
                      value={extensionPrompt}
                      onChange={(e) => setExtensionPrompt(e.target.value)}
                      placeholder="What should the extension do on this page?"
                      rows={3}
                      className="w-full p-2 rounded bg-surface-2 border text-xs mb-2 outline-none focus:border-accent resize-y"
                    />
                    <button
                      onClick={handleGenerateExtension}
                      disabled={!extensionPrompt.trim() || extensionStatus === 'generating'}
                      className={`btn w-full font-bold ${!extensionPrompt.trim() || extensionStatus === 'generating' ? "btn-ghost opacity-50" : "btn-primary"}`}
                    >
                      {extensionStatus === 'generating' ? '⚡ Generating...' : '✨ Generate Extension'}
                    </button>
                    {extensionStatus === 'error' && (
                      <div className="text-xs text-danger mt-2">
                        Failed to generate extension. Try a simpler request.
                      </div>
                    )}
                  </div>

                  {extensions.length === 0 ? (
                    <div className="text-center text-muted text-sm pt-5">
                      No extensions yet. Generate one above.
                    </div>
                  ) : (
                    extensions.map(ext => (
                      <div
                        key={ext.id}
                        className="p-3 mb-2 rounded bg-surface border"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm font-bold text-primary">
                            {ext.name}
                          </div>
                          <label className="text-xs text-muted flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ext.enabled}
                              onChange={(e) => {
                                setExtensions(prev => prev.map(item => item.id === ext.id ? { ...item, enabled: e.target.checked, updatedAt: Date.now() } : item));
                              }}
                              className="accent-accent"
                            />
                            Auto-run
                          </label>
                        </div>
                        {ext.description && (
                          <div className="text-xs text-muted mb-2">
                            {ext.description}
                          </div>
                        )}
                        {ext.match && (
                          <div className="text-xs text-muted mb-2">
                            Match: {ext.match}
                          </div>
                        )}
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => runExtensionOnce(ext.id)}
                            className="btn btn-ghost text-xs flex-1 bg-surface-2 border"
                          >
                            ▶ Run Now
                          </button>
                          <button
                            onClick={() => toggleExtensionDetails(ext.id)}
                            className="btn btn-ghost text-xs bg-surface-2 border px-2"
                          >
                            {expandedExtensions[ext.id] ? "Hide Code" : "View Code"}
                          </button>
                          <button
                            onClick={() => setExtensions(prev => prev.filter(item => item.id !== ext.id))}
                            className="btn btn-ghost text-xs text-danger px-2"
                          >
                            ✕
                          </button>
                        </div>
                        {expandedExtensions[ext.id] && (
                          <pre className="text-xs p-2 rounded bg-surface-2 border overflow-x-auto text-muted">
                            {ext.code}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Settings Panel */}
            {settingsPanelOpen && (
              <SettingsPanel onClose={() => setSettingsPanelOpen(false)} />
            )}

            {/* JSON Output Panel */}
            {jsonPanelOpen && jsonOutput && (
              <>
                <div className="panel-header">
                  <span className="panel-title">{ } JSON Output</span>
                  <button
                    onClick={() => setJsonPanelOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2 flex-1 overflow-y-auto">
                  <pre className="text-xs font-mono p-3 rounded bg-surface border text-muted whitespace-pre-wrap break-words">
                    {jsonOutput}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(jsonOutput);
                      setMessages(prev => [...prev, { role: 'assistant', content: '✅ JSON copied to clipboard!' }]);
                    }}
                    className="btn btn-ghost w-full mt-2 text-xs border"
                  >
                    📋 Copy to Clipboard
                  </button>
                </div>
              </>
            )}
              </div>
            )}

            {/* Webviews */}
            {renderWebviews()}

            {/* AI Sidebar */}
            {aiSidebarOpen && !isChatBrowser && (
              <div className="ai-sidebar" style={{ width: "350px" }}>
                <div className="panel-header">
                  <span className="panel-title">AI Assistant</span>
                  <button
                    onClick={() => setAiSidebarOpen(false)}
                    className="btn btn-ghost btn-icon"
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                {renderChatBody('sidebar')}
              </div>
            )}

            {tabSearchOpen && (
              <div className="tab-search-overlay" onClick={closeTabSearch}>
                <div className="tab-search-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="tab-search-header">
                    <div>Search Tabs</div>
                    <button className="btn btn-ghost btn-icon" onClick={closeTabSearch}>✕</button>
                  </div>
                  <input
                    className="tab-search-input"
                    placeholder="Search by title or URL..."
                    value={tabSearchQuery}
                    onChange={(e) => setTabSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="tab-search-results">
                    {tabSearchResults.length === 0 ? (
                      <div className="tab-search-empty">No tabs found.</div>
                    ) : (
                      tabSearchResults.map(tab => (
                        <button
                          key={tab.id}
                          className="tab-search-row"
                          onClick={() => {
                            setActiveId(tab.id);
                            setOmnibox(tab.url);
                            closeTabSearch();
                          }}
                        >
                          <div className="tab-search-title">{tab.title || 'New Tab'}</div>
                          <div className="tab-search-url">{tab.url}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
        </>
      ) : (
        <div className="chat-browser-shell">
          <div className="chat-browser-header">
            <div className="chat-browser-header-left">
              <button
                className="btn btn-ghost"
                onClick={() => setBrowserMode('classic')}
              >
                ← Browser Mode
              </button>
              <div>
                <div className="chat-browser-title">Chat Browser</div>
                <div className="chat-browser-subtitle">Describe what you want. I’ll navigate.</div>
              </div>
            </div>
            <div className="chat-browser-actions">
              {chatTakeoverActive ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setChatTakeoverActive(false);
                    const lastMessage = lastUserMessageRef.current;
                    if (lastMessage) {
                      runChatRequest(lastMessage);
                    }
                  }}
                  title="Let the AI continue"
                >
                  ▶ Resume AI
                </button>
              ) : (
                (isLoading || aiActionDepth > 0) && (
                  <button
                    className="btn btn-ghost"
                    onClick={startChatTakeover}
                    title="Pause AI and take over the page"
                  >
                    ✋ Take over
                  </button>
                )
              )}
              {completedTabInfo && (
                <button
                  className="btn btn-ghost"
                  onClick={addCompletedTabToTop}
                  title="Add the completed page to the top of tabs"
                >
                  📌 Add to Tabs
                </button>
              )}
              {isLoading && (
                <button className="btn btn-ghost" onClick={stopAiRequest} title="Stop request">⏹ Stop</button>
              )}
              <button className="btn btn-ghost btn-icon" onClick={() => nav("back")} title="Back">←</button>
              <button className="btn btn-ghost btn-icon" onClick={() => nav("forward")} title="Forward">→</button>
              <button className="btn btn-ghost btn-icon" onClick={() => nav("reload")} title="Reload">⟳</button>
              <button className="btn btn-ghost" onClick={newTab} title="New Tab">＋ Tab</button>
              <button className="btn btn-ghost" onClick={handleQuickSummarize} title="Summarize this page">
                📝 Summarize
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  closeSecondaryPanels();
                  setComposePanelOpen(true);
                }}
                title="Compose text on this page"
              >
                ✍️ Compose
              </button>
              <button className="btn btn-ghost" onClick={() => setMemoryPanelOpen(true)} title="Memory & Context">
                🧠 Memory
              </button>
            </div>
          </div>

          <div className="chat-browser-body">
            {memoryPanelOpen ? (
              renderMemoryPage(() => setMemoryPanelOpen(false))
            ) : (
              <div className="chat-browser-chat chat-browser-chat--full">
                {renderChatBody('browser')}
              </div>
            )}
          </div>
        </div>
      )}

      {composePanelOpen && (
        <div className="compose-overlay" onClick={() => setComposePanelOpen(false)}>
          <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
            <div className="compose-header">
              <div className="compose-title">✍️ Compose on Page</div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setComposePanelOpen(false)}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="compose-meta">
              <div className="compose-meta-row">
                Active field: <span>{composeActiveField?.label || 'None detected (click a field first)'}</span>
              </div>
              <label className="compose-toggle">
                <input
                  type="checkbox"
                  checked={composeUseFullContext}
                  onChange={(e) => setComposeUseFullContext(e.target.checked)}
                />
                Use full page context (includes visible comments without scrolling)
              </label>
            </div>

            <textarea
              className="compose-input"
              placeholder="Describe what you want to write (tone, length, audience, etc.)"
              value={composePrompt}
              onChange={(e) => setComposePrompt(e.target.value)}
              rows={4}
            />

            <div className="compose-actions">
              <button
                className={`btn ${composeLoading ? 'btn-ghost' : 'btn-primary'}`}
                disabled={composeLoading || !composePrompt.trim()}
                onClick={handleComposeGenerate}
              >
                {composeLoading ? 'Generating…' : 'Generate'}
              </button>
              <button
                className="btn btn-ghost"
                disabled={!composeResult.trim()}
                onClick={insertComposeResult}
              >
                Insert into field
              </button>
              <button
                className="btn btn-ghost"
                disabled={!composeResult.trim()}
                onClick={() => navigator.clipboard.writeText(composeResult)}
              >
                Copy
              </button>
            </div>

            {composeError && (
              <div className="compose-error">
                {composeError}
              </div>
            )}

            <textarea
              className="compose-output"
              placeholder="Generated text will appear here"
              value={composeResult}
              onChange={(e) => setComposeResult(e.target.value)}
              rows={8}
            />
          </div>
        </div>
      )}

      {onboardingOpen && (
        <div className="onboarding-overlay" onClick={() => completeOnboarding(true)}>
          <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
            <div className="onboarding-header">
              <div>
                <div className="onboarding-title">Welcome — a new way to browse</div>
                <div className="onboarding-subtitle">
                  Tell us a few things so your AI copilot can help better.
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => completeOnboarding(true)}
                title="Skip onboarding"
              >
                ×
              </button>
            </div>

            <div className="onboarding-grid">
              <div className="onboarding-field">
                <label>Name</label>
                <input
                  value={onboardingName}
                  onChange={(e) => setOnboardingName(e.target.value)}
                  placeholder="What should we call you?"
                />
              </div>
              <div className="onboarding-field">
                <label>Role / Work</label>
                <input
                  value={onboardingRole}
                  onChange={(e) => setOnboardingRole(e.target.value)}
                  placeholder="Designer, student, founder..."
                />
              </div>
              <div className="onboarding-field">
                <label>Goals</label>
                <textarea
                  rows={3}
                  value={onboardingGoals}
                  onChange={(e) => setOnboardingGoals(e.target.value)}
                  placeholder="What are you trying to accomplish with this browser?"
                />
              </div>
              <div className="onboarding-field">
                <label>Preferences</label>
                <textarea
                  rows={3}
                  value={onboardingPreferences}
                  onChange={(e) => setOnboardingPreferences(e.target.value)}
                  placeholder="Tone, format, depth, speed..."
                />
              </div>
              <div className="onboarding-field">
                <label>Location (optional)</label>
                <input
                  value={onboardingLocation}
                  onChange={(e) => setOnboardingLocation(e.target.value)}
                  placeholder="City, country"
                />
              </div>
              <div className="onboarding-field">
                <label>Address (optional)</label>
                <input
                  value={onboardingAddress}
                  onChange={(e) => setOnboardingAddress(e.target.value)}
                  placeholder="Street, city, postal code"
                />
              </div>
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-ghost" onClick={() => completeOnboarding(true)}>
                Skip for now
              </button>
              <button className="btn btn-primary" onClick={() => completeOnboarding(false)}>
                Save & continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


