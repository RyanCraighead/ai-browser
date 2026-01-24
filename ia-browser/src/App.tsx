import React, { useMemo, useRef, useState, useEffect } from "react";
import { PageCustomizationPanel } from "./PageCustomizationPanel";
import { SettingsPanel } from "./SettingsPanel";
import { CerebrasService } from "./CerebrasService";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Tab = {
  id: string;
  title: string;
  url: string;
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

const normalizeUrl = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "https://www.wikipedia.org";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
};

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: "tab-1", title: "New Tab", url: "https://www.wikipedia.org" },
  ]);
  const [activeId, setActiveId] = useState("tab-1");
  const [omnibox, setOmnibox] = useState("https://www.wikipedia.org");
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    kind?: 'action-log';
    actions?: Array<{ action: ActionPlan['actions'][number]; status: string }>;
    summary?: string;
  }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [pageSummary, setPageSummary] = useState<string | null>(null);
  
  // New features state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [highlightsEnabled, setHighlightsEnabled] = useState(false);
  const [bookmarksPanelOpen, setBookmarksPanelOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
  
  // Advanced features
  const [watchedPages, setWatchedPages] = useState<WatchedPage[]>([]);
  const [watchedPagesPanelOpen, setWatchedPagesPanelOpen] = useState(false);
  const [researchAgents, setResearchAgents] = useState<ResearchAgent[]>([]);
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState("");
  const [jsonOutput, setJsonOutput] = useState<string | null>(null);
  const [jsonPanelOpen, setJsonPanelOpen] = useState(false);
  
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

  const toggleActionLog = (id: string) => {
    setExpandedActionLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExtensionDetails = (id: string) => {
    setExpandedExtensions(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Cerebras service
  const cerebrasService = CerebrasService.getInstance();

  const webviewsRef = useRef<Record<string, any>>({});
  const webviewContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const extensionsRef = useRef(extensions);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeId)!, [tabs, activeId]);

  useEffect(() => {
    extensionsRef.current = extensions;
  }, [extensions]);

  useEffect(() => {
    if (pageSchemaUrl && pageSchemaUrl !== activeTab.url) {
      setPageSchema(null);
      setPageSchemaUrl(null);
      setPageSchemaUpdatedAt(0);
      setLastDomSnapshot(null);
      setSchemaStatus('idle');
    }
  }, [activeTab.url, pageSchemaUrl]);

  // Load saved data from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bookmarks');
    const savedHistory = localStorage.getItem('history');
    const savedDownloads = localStorage.getItem('downloads');
    const savedAdBlock = localStorage.getItem('adBlockEnabled');
    const savedWatchedPages = localStorage.getItem('watchedPages');
    const savedExtensions = localStorage.getItem('extensions');
    
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedDownloads) setDownloads(JSON.parse(savedDownloads));
    if (savedAdBlock) setAdBlockEnabled(JSON.parse(savedAdBlock));
    if (savedWatchedPages) setWatchedPages(JSON.parse(savedWatchedPages));
    if (savedExtensions) setExtensions(JSON.parse(savedExtensions));
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

  // Check watched pages for changes every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const wv = webviewsRef.current[activeId];
      if (!wv) return;

      for (const watched of watchedPages) {
        try {
          const content = await wv.executeJavaScript(`
            (() => {
              return document.body?.innerText?.substring(0, 1000) || "";
            })()
          `);
          
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

  const go = () => {
    const next = normalizeUrl(omnibox);
    setTabs(prev =>
      prev.map(t => (t.id === activeId ? { ...t, url: next } : t))
    );
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
    const id = `tab-${crypto.randomUUID()}`;
    const t: Tab = { id, title: "New Tab", url: "https://www.wikipedia.org" };
    setTabs(prev => [...prev, t]);
    setActiveId(id);
    setOmnibox(t.url);
  };

  const closeTab = (id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeId === id && next.length) {
        setActiveId(next[0].id);
        setOmnibox(next[0].url);
      }
      return next.length ? next : [{ id: "tab-1", title: "New Tab", url: "https://www.wikipedia.org" }];
    });
  };

  const getPageContent = async (): Promise<{ url: string; content: string }> => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return { url: "", content: "" };

    try {
      const content = await wv.executeJavaScript(`
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

      return {
        url: activeTab.url,
        content: `Title: ${content.title}\n\nContent:\n${content.content}`
      };
    } catch (error) {
      console.error("Failed to get page content:", error);
      return { url: "", content: "" };
    }
  };

  const getPageDomSnapshot = async () => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return null;

    try {
      const snapshot = await wv.executeJavaScript(`
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
    const now = Date.now();
    if (pageSchema && pageSchemaUrl === activeTab.url && now - pageSchemaUpdatedAt < 120000) {
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
      setPageSchemaUrl(activeTab.url);
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
      .filter((action) => action && allowed.has(action.type))
      .map((action) => ({
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

  const executeActionPlan = async (plan: ActionPlan) => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return { executed: 0, attempted: 0 };

    try {
      const results = await wv.executeJavaScript(`
        (() => {
          const plan = ${JSON.stringify(plan)};
          const results = [];
          const resolveEl = (selector) => {
            if (!selector) return null;
            try {
              return document.querySelector(selector);
            } catch (e) {
              return null;
            }
          };
          const dispatch = (el, type) => el && el.dispatchEvent(new Event(type, { bubbles: true }));

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
              const el = resolveEl(selector);
              if (el) {
                const key = action.key || 'Enter';
                el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
                el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
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
          }
          return results;
        })()
      `);

      const executed = Array.isArray(results)
        ? results.filter((entry) => entry.status === 'ok').length
        : 0;
      const attempted = Array.isArray(results) ? results.length : 0;
      return { executed, attempted, results: Array.isArray(results) ? results : [] };
    } catch (error) {
      console.error('Failed to execute action plan:', error);
      return { executed: 0, attempted: 0, results: [] };
    }
  };

  const applyExtensionsToWebview = async (wv: any, url: string) => {
    const enabledExtensions = extensionsRef.current.filter(ext => ext.enabled);
    if (!enabledExtensions.length) return;

    for (const ext of enabledExtensions) {
      if (ext.match && !url.includes(ext.match)) continue;
      try {
        await wv.executeJavaScript(ext.code);
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
      await wv.executeJavaScript(ext.code);
    } catch (error) {
      console.error(`Failed to run extension: ${ext.name}`, error);
    }
  };

  const handleAIFeature = async (feature: AIFeature) => {
    setIsLoading(true);
    setAiResult("");
    
    const { url, content } = await getPageContent();
    const title = activeTab.title || "Untitled";
    
    try {
      let response = "";
      
      switch (feature.id) {
        case "summarize":
          response = await cerebrasService.summarizePage(content, url, title);
          setPageSummary(response);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "explain-simple":
          response = await cerebrasService.explainLike12(content, title);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "key-facts":
          response = await cerebrasService.extractKeyFacts(content, title);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "to-json":
          response = await cerebrasService.convertToJson(content, title, url);
          setJsonOutput(response);
          setJsonPanelOpen(true);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "checklist":
          response = await cerebrasService.turnIntoChecklist(content, title);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        case "action-items":
          response = await cerebrasService.findActionItems(content, title);
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
          break;
        default:
          response = "Feature not implemented yet.";
      }
      
      setAiResult(response);
    } catch (error: any) {
      const errorMsg = error.message || "An error occurred";
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    }
    
    setIsLoading(false);
  };

  const convertToJson = (content: string, title: string, url: string): string => {
    const titleMatch = content.match(/Title:\s*(.+)/);
    const pageTitle = titleMatch ? titleMatch[1] : title;
    const bodyContent = content.replace(/Title:\s*.+\n\nContent:\n/, '');

    // Extract structured data
    const paragraphs = bodyContent.split('\n\n').filter(p => p.trim().length > 20);
    const sentences = bodyContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    const jsonData = {
      metadata: {
        title: pageTitle,
        url: url,
        extractedAt: new Date().toISOString(),
        contentLength: bodyContent.length
      },
      content: {
        summary: sentences.slice(0, 3).map(s => s.trim()).join('. '),
        keyPoints: sentences.slice(0, 5).map((s, i) => ({
          id: i + 1,
          text: s.trim()
        })),
        sections: paragraphs.slice(0, 5).map((p, i) => ({
          id: i + 1,
          heading: `Section ${i + 1}`,
          content: p.trim().substring(0, 200),
          wordCount: p.split(/\s+/).length
        }))
      },
      analysis: {
        estimatedReadingTime: Math.ceil(bodyContent.split(/\s+/).length / 200),
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        complexity: sentences.length > 50 ? 'High' : sentences.length > 20 ? 'Medium' : 'Low'
      }
    };

    return JSON.stringify(jsonData, null, 2);
  };

  const generateSummary = (content: string, url: string): string => {
    const titleMatch = content.match(/Title:\s*(.+)/);
    const title = titleMatch ? titleMatch[1] : "Current Page";
    const bodyContent = content.replace(/Title:\s*.+\n\nContent:\n/, '');

    const sentences = bodyContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keySentences = sentences.slice(0, 5);
    
    return `# Summary: ${title}\n\n**URL:** ${url}\n\n## Main Points\n\n${keySentences.map((s, i) => `${i + 1}. ${s.trim()}.`).join('\n')}\n\n## Quick Takeaway\n\n${bodyContent.substring(0, 200)}...\n\n*Generated based on page content analysis*`;
  };

  const handleQuickSummarize = async () => {
    setAiSidebarOpen(true);
    setIsLoading(true);
    setPageSummary(null);
    setMessages([]);

    const { url, content } = await getPageContent();
    const title = activeTab.title || "Untitled";
    
    try {
      const summary = await cerebrasService.summarizePage(content, url, title);
      setPageSummary(summary);
      setMessages([{ role: 'assistant', content: summary }]);
    } catch (error: any) {
      const errorMsg = error.message || "An error occurred";
      setMessages([{ role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    }
    
    setIsLoading(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput("");
    setIsLoading(true);

    try {
      const schemaBundle = await ensurePageSchema();
      const schemaText = schemaBundle?.schemaText || null;
      const domSnapshot = schemaBundle?.snapshot || null;

      if (schemaText) {
        try {
          const actionPlanRaw = await cerebrasService.planPageActions(userMessage, schemaText);
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
                  content: `✅ Executed ${executed}/${attempted} page action(s).`,
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
            { role: 'assistant', content: '⚠️ Unable to run page actions, continuing with answer.' }
          ]);
        }
      }

      const { content } = await getPageContent();
      const title = activeTab.title || "Untitled";
      const response = await cerebrasService.chatWithPageAndSchema(
        userMessage,
        content,
        title,
        schemaText || undefined,
        domSnapshot || undefined
      );
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error: any) {
      const errorMsg = error.message || "An error occurred";
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${errorMsg}` }]);
    }
    
    setIsLoading(false);
  };

  const getPageContentSync = () => {
    const wv = webviewsRef.current[activeId];
    if (!wv) return { url: activeTab.url, content: "" };
    return { url: activeTab.url, content: "Page content would be extracted here" };
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
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      title,
      url,
      date: Date.now()
    };
    setHistory(prev => [newItem, ...prev].slice(0, 100));
  };

  const openHistoryItem = (url: string) => {
    setOmnibox(url);
    setTabs(prev =>
      prev.map(t => (t.id === activeId ? { ...t, url } : t))
    );
    setHistoryPanelOpen(false);
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
      await wv.executeJavaScript(`
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
      await wv.executeJavaScript(`
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
        const content = await wv.executeJavaScript(`
          (() => {
            return document.body?.innerText?.substring(0, 1000) || "";
          })()
        `);
        
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
      await wv.executeJavaScript(`
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

  return (
    <div className="app-shell">
      {/* Tabs */}
      <div className="tabs-bar">
        <button onClick={newTab} style={btnSmall}>＋</button>

        <div className="tabs-list">
          {tabs.map(t => (
            <div
              key={t.id}
              className={`tab ${t.id === activeId ? "tab--active" : ""}`}
              onClick={() => {
                setActiveId(t.id);
                setOmnibox(t.url);
              }}
              style={{
                background: t.id === activeId ? "rgba(34, 211, 238, 0.18)" : "var(--surface-2)",
                borderColor: t.id === activeId ? "rgba(34, 211, 238, 0.5)" : "var(--border)",
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t.title || "New Tab"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                style={btnX}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button 
          style={{...btnSmall, background: aiSidebarOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
        >
          AI
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button style={btn} onClick={() => nav("back")}>←</button>
        <button style={btn} onClick={() => nav("forward")}>→</button>
        <button style={btn} onClick={() => nav("reload")}>⟳</button>

        <input
          value={omnibox}
          onChange={(e) => setOmnibox(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          className="omnibox"
        />

        <button style={btn} onClick={go}>Go</button>
        
        <button 
          style={{...btn, background: "var(--accent)", borderColor: "rgba(34, 211, 238, 0.6)"}}
          onClick={handleQuickSummarize}
        >
          📝 Summarize
        </button>

        <button 
          style={{...btn, background: isBookmarked ? "var(--warning)" : "var(--surface-2)"}}
          onClick={toggleBookmark}
          title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          {isBookmarked ? "★" : "☆"}
        </button>

        <button 
          style={{...btn, background: adBlockEnabled ? "var(--success)" : "var(--surface-2)"}}
          onClick={() => setAdBlockEnabled(!adBlockEnabled)}
          title={adBlockEnabled ? "Ad blocking enabled" : "Ad blocking disabled"}
        >
          🛡️
        </button>

        <button 
          style={{...btn, background: highlightsEnabled ? "rgba(34, 211, 238, 0.35)" : "var(--surface-2)"}}
          onClick={toggleHighlights}
          title={highlightsEnabled ? "AI highlights on" : "AI highlights off"}
        >
          ✨
        </button>

        <button 
          style={{...btn, background: isPageWatched ? "var(--danger)" : "var(--surface-2)"}}
          onClick={toggleWatchPage}
          title={isPageWatched ? "Stop watching this page" : "Watch this page for changes"}
        >
          👁️
        </button>

        <button 
          style={{...btn, background: "var(--surface-2)"}}
          onClick={autoFillForms}
          title="Auto-fill forms on this page"
        >
          📝 Fill
        </button>
      </div>

      {/* Secondary Toolbar */}
      <div className="toolbar toolbar-secondary">
        <button 
          style={{...btnSmall, background: bookmarksPanelOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => {
            setBookmarksPanelOpen(!bookmarksPanelOpen);
            setHistoryPanelOpen(false);
            setDownloadsPanelOpen(false);
            setWatchedPagesPanelOpen(false);
            setResearchPanelOpen(false);
            setJsonPanelOpen(false);
            setExtensionsPanelOpen(false);
          }}
        >
          📑 Bookmarks
        </button>
        <button 
          style={{...btnSmall, background: historyPanelOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => {
            setHistoryPanelOpen(!historyPanelOpen);
            setBookmarksPanelOpen(false);
            setDownloadsPanelOpen(false);
            setWatchedPagesPanelOpen(false);
            setResearchPanelOpen(false);
            setJsonPanelOpen(false);
            setExtensionsPanelOpen(false);
          }}
        >
          🕐 History
        </button>
        <button 
          style={{...btnSmall, background: downloadsPanelOpen ? "var(--accent)" : "var(--surface-2)", position: "relative"}}
          onClick={() => {
            setDownloadsPanelOpen(!downloadsPanelOpen);
            setBookmarksPanelOpen(false);
            setHistoryPanelOpen(false);
            setWatchedPagesPanelOpen(false);
            setResearchPanelOpen(false);
            setJsonPanelOpen(false);
            setExtensionsPanelOpen(false);
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
          style={{...btnSmall, background: watchedPagesPanelOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => {
            setWatchedPagesPanelOpen(!watchedPagesPanelOpen);
            setBookmarksPanelOpen(false);
            setHistoryPanelOpen(false);
            setDownloadsPanelOpen(false);
            setResearchPanelOpen(false);
            setJsonPanelOpen(false);
            setExtensionsPanelOpen(false);
          }}
        >
          👁️ Watched
        </button>
        <button 
          style={{...btnSmall, background: researchPanelOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => {
            setResearchPanelOpen(!researchPanelOpen);
            setBookmarksPanelOpen(false);
            setHistoryPanelOpen(false);
            setDownloadsPanelOpen(false);
            setWatchedPagesPanelOpen(false);
            setJsonPanelOpen(false);
            setCustomizationPanelOpen(false);
            setExtensionsPanelOpen(false);
          }}
        >
          🔬 Research
        </button>
        <button 
          style={{...btnSmall, background: customizationPanelOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => {
            setCustomizationPanelOpen(!customizationPanelOpen);
            setBookmarksPanelOpen(false);
            setHistoryPanelOpen(false);
            setDownloadsPanelOpen(false);
            setWatchedPagesPanelOpen(false);
            setResearchPanelOpen(false);
            setJsonPanelOpen(false);
            setExtensionsPanelOpen(false);
            setSettingsPanelOpen(false);
          }}
        >
          🎨 Customize
        </button>
        <button 
          style={{...btnSmall, background: extensionsPanelOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => {
            setExtensionsPanelOpen(!extensionsPanelOpen);
            setBookmarksPanelOpen(false);
            setHistoryPanelOpen(false);
            setDownloadsPanelOpen(false);
            setWatchedPagesPanelOpen(false);
            setResearchPanelOpen(false);
            setJsonPanelOpen(false);
            setCustomizationPanelOpen(false);
            setSettingsPanelOpen(false);
          }}
        >
          🧩 Extensions
        </button>
        <button 
          style={{...btnSmall, background: settingsPanelOpen ? "var(--accent)" : "var(--surface-2)"}}
          onClick={() => {
            setSettingsPanelOpen(!settingsPanelOpen);
            setBookmarksPanelOpen(false);
            setHistoryPanelOpen(false);
            setDownloadsPanelOpen(false);
            setWatchedPagesPanelOpen(false);
            setResearchPanelOpen(false);
            setJsonPanelOpen(false);
            setCustomizationPanelOpen(false);
            setExtensionsPanelOpen(false);
          }}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Main content area with panels */}
      <div className="main-content">
        {/* Left side panels */}
        {(bookmarksPanelOpen || historyPanelOpen || downloadsPanelOpen || watchedPagesPanelOpen || researchPanelOpen || jsonPanelOpen || customizationPanelOpen || extensionsPanelOpen || settingsPanelOpen) && (
          <div className="side-panel" style={{ 
            width: "300px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            {/* Bookmarks Panel */}
            {bookmarksPanelOpen && (
              <>
                <div className="panel-header">
                  <span className="panel-title">📑 Bookmarks</span>
                  <button 
                    onClick={() => setBookmarksPanelOpen(false)}
                    style={btnClosePanel}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {bookmarks.length === 0 ? (
                    <div style={{ color: "#666", fontSize: "13px", textAlign: "center", paddingTop: "20px" }}>
                      No bookmarks yet.<br />Click ☆ to bookmark a page.
                    </div>
                  ) : (
                    bookmarks.map(b => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setOmnibox(b.url);
                          setTabs(prev => prev.map(t => t.id === activeId ? { ...t, url: b.url } : t));
                        }}
                        style={{
                          padding: "10px",
                          marginBottom: "4px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: "#111",
                          border: "1px solid #222",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#1a1a1a"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#111"}
                      >
                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>
                          {b.title}
                        </div>
                        <div style={{ color: "#666", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {b.url}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookmarks(prev => prev.filter(bookmark => bookmark.id !== b.id));
                          }}
                          style={{
                            marginTop: "6px",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #333",
                            background: "#1a1a1a",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "11px"
                          }}
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
                    style={btnClosePanel}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {history.length === 0 ? (
                    <div style={{ color: "#666", fontSize: "13px", textAlign: "center", paddingTop: "20px" }}>
                      No history yet.
                    </div>
                  ) : (
                    history.map(h => (
                      <div
                        key={h.id}
                        onClick={() => openHistoryItem(h.url)}
                        style={{
                          padding: "10px",
                          marginBottom: "4px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: "#111",
                          border: "1px solid #222",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#1a1a1a"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#111"}
                      >
                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>
                          {h.title}
                        </div>
                        <div style={{ color: "#666", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" }}>
                          {h.url}
                        </div>
                        <div style={{ color: "#444", fontSize: "10px" }}>
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
                    style={btnClosePanel}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {downloads.length === 0 ? (
                    <div style={{ color: "#666", fontSize: "13px", textAlign: "center", paddingTop: "20px" }}>
                      No downloads yet.
                    </div>
                  ) : (
                    downloads.map(d => (
                      <div
                        key={d.id}
                        style={{
                          padding: "10px",
                          marginBottom: "4px",
                          borderRadius: "6px",
                          background: "#111",
                          border: "1px solid #222"
                        }}
                      >
                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>
                          {d.filename}
                        </div>
                        <div style={{ color: "#666", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "6px" }}>
                          {d.url}
                        </div>
                        {d.status === 'downloading' && (
                          <div style={{ marginBottom: "6px" }}>
                            <div style={{ 
                              height: "4px", 
                              background: "#222", 
                              borderRadius: "2px",
                              overflow: "hidden"
                            }}>
                              <div style={{ 
                                height: "100%", 
                                background: "#2563eb", 
                                width: `${d.progress}%`,
                                transition: "width 0.3s"
                              }} />
                            </div>
                            <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>
                              {Math.round(d.progress)}%
                            </div>
                          </div>
                        )}
                        {d.status === 'completed' && (
                          <div style={{ color: "#10b981", fontSize: "11px", fontWeight: "bold" }}>
                            ✓ Completed
                          </div>
                        )}
                        {d.status === 'failed' && (
                          <div style={{ color: "#ef4444", fontSize: "11px", fontWeight: "bold" }}>
                            ✗ Failed
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => addDownload(`file-${Date.now()}.pdf`, activeTab.url)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginTop: "8px",
                      borderRadius: "6px",
                      border: "1px solid #333",
                      background: "#151515",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
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
                    style={btnClosePanel}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  {watchedPages.length === 0 ? (
                    <div style={{ color: "#666", fontSize: "13px", textAlign: "center", paddingTop: "20px" }}>
                      No watched pages yet.<br />Click 👁️ to watch a page for changes.
                    </div>
                  ) : (
                    watchedPages.map(w => (
                      <div
                        key={w.id}
                        style={{
                          padding: "10px",
                          marginBottom: "4px",
                          borderRadius: "6px",
                          background: "#111",
                          border: "1px solid #222"
                        }}
                      >
                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>
                          {w.title}
                        </div>
                        <div style={{ color: "#666", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" }}>
                          {w.url}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ color: "#444", fontSize: "10px" }}>
                            Last checked: {new Date(w.lastChecked).toLocaleString()}
                          </span>
                          <span style={{ color: w.notificationsEnabled ? "#10b981" : "#666", fontSize: "10px" }}>
                            {w.notificationsEnabled ? "🔔 On" : "🔕 Off"}
                          </span>
                        </div>
                        <button
                          onClick={() => setWatchedPages(prev => prev.filter(wp => wp.id !== w.id))}
                          style={{
                            width: "100%",
                            padding: "6px",
                            borderRadius: "4px",
                            border: "1px solid #333",
                            background: "#1a1a1a",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "11px"
                          }}
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
                    style={btnClosePanel}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      placeholder="Enter research topic..."
                      onKeyDown={(e) => e.key === "Enter" && startResearch()}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #333",
                        background: "#111",
                        color: "white",
                        outline: "none",
                        fontSize: "13px",
                        marginBottom: "8px"
                      }}
                    />
                    <button
                      onClick={startResearch}
                      disabled={!researchQuery.trim()}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "6px",
                        border: "none",
                        background: !researchQuery.trim() ? "#1a1a1a" : "#2563eb",
                        color: "white",
                        cursor: !researchQuery.trim() ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        fontWeight: "bold"
                      }}
                    >
                      🚀 Start Research
                    </button>
                  </div>

                  {researchAgents.length === 0 ? (
                    <div style={{ color: "#666", fontSize: "13px", textAlign: "center", paddingTop: "20px" }}>
                      No research yet.<br />Enter a topic above to start.
                    </div>
                  ) : (
                    researchAgents.map(agent => (
                      <div
                        key={agent.id}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "6px",
                          background: "#111",
                          border: "1px solid #222"
                        }}
                      >
                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>
                          {agent.query}
                        </div>
                        {agent.status === 'researching' && (
                          <div style={{ marginBottom: "8px" }}>
                            <div style={{ 
                              height: "4px", 
                              background: "#222", 
                              borderRadius: "2px",
                              overflow: "hidden"
                            }}>
                              <div style={{ 
                                height: "100%", 
                                background: "#8b5cf6", 
                                width: `${agent.progress}%`,
                                transition: "width 0.3s"
                              }} />
                            </div>
                            <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>
                              Researching... {agent.progress}%
                            </div>
                          </div>
                        )}
                        {agent.status === 'completed' && (
                          <div style={{ color: "#10b981", fontSize: "11px", fontWeight: "bold", marginBottom: "8px" }}>
                            ✓ Research Complete - Found {agent.results.length} results
                          </div>
                        )}
                        {agent.results.length > 0 && (
                          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {agent.results.map((result, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "8px",
                                  marginBottom: "6px",
                                  borderRadius: "4px",
                                  background: "#1a1a1a",
                                  border: "1px solid #333"
                                }}
                              >
                                <div style={{ color: "#fff", fontSize: "12px", fontWeight: "500", marginBottom: "2px" }}>
                                  {result.title}
                                </div>
                                <div style={{ color: "#666", fontSize: "10px", marginBottom: "4px" }}>
                                  {result.url}
                                </div>
                                <div style={{ color: "#888", fontSize: "11px" }}>
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
                    style={btnClosePanel}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  <div style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "rgba(12, 18, 28, 0.8)",
                    marginBottom: "12px"
                  }}>
                    <div style={{ color: "var(--muted)", fontSize: "12px", marginBottom: "6px" }}>
                      Describe the extension you want to generate (e.g., "Add a dark mode toggle to this page")
                    </div>
                    <textarea
                      value={extensionPrompt}
                      onChange={(e) => setExtensionPrompt(e.target.value)}
                      placeholder="What should the extension do on this page?"
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "rgba(10, 15, 25, 0.8)",
                        color: "var(--text)",
                        outline: "none",
                        fontSize: "12px",
                        resize: "vertical",
                        marginBottom: "8px"
                      }}
                    />
                    <button
                      onClick={handleGenerateExtension}
                      disabled={!extensionPrompt.trim() || extensionStatus === 'generating'}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(34, 211, 238, 0.6)",
                        background: "var(--accent)",
                        color: "#0b0f14",
                        cursor: !extensionPrompt.trim() || extensionStatus === 'generating' ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}
                    >
                      {extensionStatus === 'generating' ? '⚡ Generating...' : '✨ Generate Extension'}
                    </button>
                    {extensionStatus === 'error' && (
                      <div style={{ color: "var(--danger)", fontSize: "11px", marginTop: "6px" }}>
                        Failed to generate extension. Try a simpler request.
                      </div>
                    )}
                  </div>

                  {extensions.length === 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: "12px", textAlign: "center", paddingTop: "20px" }}>
                      No extensions yet. Generate one above.
                    </div>
                  ) : (
                    extensions.map(ext => (
                      <div
                        key={ext.id}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          background: "rgba(12, 18, 28, 0.8)",
                          border: "1px solid var(--border)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <div style={{ color: "var(--text)", fontSize: "13px", fontWeight: 600 }}>
                            {ext.name}
                          </div>
                          <label style={{ fontSize: "11px", color: "var(--muted)", display: "flex", gap: "6px", alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={ext.enabled}
                              onChange={(e) => {
                                setExtensions(prev => prev.map(item => item.id === ext.id ? { ...item, enabled: e.target.checked, updatedAt: Date.now() } : item));
                              }}
                            />
                            Auto-run
                          </label>
                        </div>
                        {ext.description && (
                          <div style={{ color: "var(--muted)", fontSize: "11px", marginBottom: "6px" }}>
                            {ext.description}
                          </div>
                        )}
                        {ext.match && (
                          <div style={{ color: "var(--muted)", fontSize: "10px", marginBottom: "6px" }}>
                            Match: {ext.match}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                          <button
                            onClick={() => runExtensionOnce(ext.id)}
                            style={{
                              flex: 1,
                              padding: "6px",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              background: "var(--surface-2)",
                              color: "var(--text)",
                              cursor: "pointer",
                              fontSize: "11px"
                            }}
                          >
                            ▶ Run Now
                          </button>
                          <button
                            onClick={() => toggleExtensionDetails(ext.id)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              background: "var(--surface-2)",
                              color: "var(--text)",
                              cursor: "pointer",
                              fontSize: "11px"
                            }}
                          >
                            {expandedExtensions[ext.id] ? "Hide Code" : "View Code"}
                          </button>
                          <button
                            onClick={() => setExtensions(prev => prev.filter(item => item.id !== ext.id))}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              background: "transparent",
                              color: "var(--danger)",
                              cursor: "pointer",
                              fontSize: "11px"
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        {expandedExtensions[ext.id] && (
                          <pre style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: "10px",
                            background: "rgba(10, 15, 25, 0.8)",
                            borderRadius: "8px",
                            padding: "10px",
                            border: "1px solid var(--border)",
                            color: "var(--text)"
                          }}>
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
                    style={btnClosePanel}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                  <pre style={{ 
                    color: "#e0e0e0", 
                    fontSize: "11px", 
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: "#1a1a1a",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #333"
                  }}>
                    {jsonOutput}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(jsonOutput);
                      setMessages(prev => [...prev, { role: 'assistant', content: '✅ JSON copied to clipboard!' }]);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginTop: "8px",
                      borderRadius: "6px",
                      border: "1px solid #333",
                      background: "#151515",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    📋 Copy to Clipboard
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Webviews */}
        <div ref={webviewContainerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {tabs.map(t => {
            const isActive = t.id === activeId;
            return (
              <webview
                key={t.id}
                ref={(el) => {
                  if (el) {
                    webviewsRef.current[t.id] = el;
                    el.addEventListener('dom-ready', async () => {
                      (el as any).executeJavaScript(`
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
                      setTabs(prev => prev.map(x => x.id === t.id ? { ...x, url: newUrl } : x));
                    });
                    el.addEventListener('page-title-updated', (e: any) => {
                      const title = e?.title ?? "Tab";
                      setTabs(prev => prev.map(x => x.id === t.id ? { ...x, title } : x));
                    });
                    el.addEventListener('did-fail-load', (e: any) => {
                      console.error(`Failed to load ${e.url}: ${e.errorDescription}`);
                    });
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

        {/* AI Sidebar */}
        {aiSidebarOpen && (
          <div className="ai-sidebar" style={{ 
            width: "350px", 
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            <div className="panel-header">
              <span className="panel-title">AI Assistant</span>
              <button 
                onClick={() => setAiSidebarOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "18px",
                  padding: 0
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column" }}>
              {AI_FEATURES.map(feature => (
                <button
                  key={feature.id}
                  onClick={() => handleAIFeature(feature)}
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginBottom: "8px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    background: "#151515",
                    color: "#fff",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.background = "#1f1f1f";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#151515";
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{feature.icon}</span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "13px" }}>
                      {feature.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                      {feature.description}
                    </div>
                  </div>
                </button>
              ))}

              {(messages.length > 0 || isLoading) && (
                <div style={{ 
                  marginTop: "16px",
                  flex: 1,
                  overflowY: "auto",
                  minHeight: "200px",
                  maxHeight: "400px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  {messages.map((msg, idx) => {
                    const isActionLog = msg.kind === 'action-log' && Array.isArray(msg.actions);
                    const logId = msg.id || `action-log-${idx}`;
                    return (
                      <div
                        key={logId}
                        style={{
                          padding: "12px",
                          borderRadius: "12px",
                          maxWidth: "85%",
                          background: msg.role === "user" ? "#2563eb" : "#111",
                          border: msg.role === "user" ? "none" : "1px solid #222",
                          alignSelf: msg.role === "user" ? "flex-end" : "flex-start"
                        }}
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]} className="chat-content">
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    );
                  })}
                  
                  {isLoading && (
                    <div style={{ 
                      padding: "12px", 
                      borderRadius: "12px",
                      background: "#111",
                      border: "1px solid #222",
                      alignSelf: "flex-start"
                    }}>
                      <div style={{ color: "#888", fontSize: "13px" }}>
                        🤔 Thinking...
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}

              <form onSubmit={handleChatSubmit} style={{ 
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid #222"
              }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about this page..."
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #333",
                      background: "#111",
                      color: "white",
                      outline: "none",
                      fontSize: "13px"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !chatInput.trim()}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#2563eb",
                      color: "white",
                      cursor: isLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                      fontSize: "13px",
                      fontWeight: "bold"
                    }}
                  >
                    Send
                  </button>
                </div>
              </form>

              {!aiResult && !isLoading && messages.length === 0 && (
                <div style={{ 
                  marginTop: "16px", 
                  padding: "16px", 
                  background: "#111", 
                  borderRadius: "8px",
                  border: "1px solid #222",
                  textAlign: "center"
                }}>
                  <div style={{ color: "#666", fontSize: "13px" }}>
                    Select an AI feature above or click "📝 Summarize" to analyze the current page
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  cursor: "pointer",
  boxShadow: "0 1px 0 rgba(0, 0, 0, 0.4), 0 10px 20px rgba(0, 0, 0, 0.25)",
  transition: "transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease",
};

const btnSmall: React.CSSProperties = {
  ...btn,
  padding: "6px 10px",
};

const btnX: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "rgba(15, 23, 42, 0.6)",
  color: "var(--text)",
  cursor: "pointer",
};

const btnClosePanel: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: "18px",
  padding: 0,
  lineHeight: 1
};
