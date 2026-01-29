export type SkillActionPlan = {
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

export type SkillStep =
  | { type: 'open_url'; url: string; inNewTab?: boolean }
  | { type: 'page_actions'; plan: SkillActionPlan };

export type SkillTreeNode = {
  id: string;
  parentId?: string | null;
  type: 'navigate' | 'action' | 'decision' | 'note';
  label: string;
  url?: string;
  selector?: string;
  notes?: string;
};

export type SkillRefinement = {
  generalizedTrigger: string;
  generalizedGoal?: string;
  algorithm: string[];
  example?: string;
  tree?: SkillTreeNode[];
  reusableSubpaths?: string[];
  notes?: string;
  confidence?: number;
  refinedAt: number;
};

export type SkillEntry = {
  id: string;
  trigger: string;
  signature: string;
  goal?: string;
  steps: SkillStep[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  useCount: number;
  successCount: number;
  refinement?: SkillRefinement;
};

type SkillState = {
  skills: SkillEntry[];
};

const STORAGE_KEY = 'skillMemory:v1';
const MAX_SKILLS = 60;
const MAX_STEPS = 40;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const compactSteps = (steps: SkillStep[]) => {
  const next: SkillStep[] = [];
  let lastKey = '';
  for (const step of steps) {
    const key = JSON.stringify(step);
    if (key === lastKey) continue;
    next.push(step);
    lastKey = key;
  }
  return next.slice(0, MAX_STEPS);
};

const isSkillUrl = (url: string) =>
  url.startsWith('http://') || url.startsWith('https://');

export class SkillMemoryService {
  private static instance: SkillMemoryService;
  private state: SkillState = { skills: [] };

  private constructor() {
    this.load();
  }

  static getInstance(): SkillMemoryService {
    if (!SkillMemoryService.instance) {
      SkillMemoryService.instance = new SkillMemoryService();
    }
    return SkillMemoryService.instance;
  }

  private load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SkillState;
      if (!parsed || typeof parsed !== 'object') return;
      this.state = {
        skills: Array.isArray(parsed.skills) ? parsed.skills : []
      };
    } catch (error) {
      console.error('Failed to load skill memory:', error);
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save skill memory:', error);
    }
  }

  getSignature(text: string): string {
    return normalizeText(text || '');
  }

  findSkill(query: string): SkillEntry | null {
    const signature = this.getSignature(query);
    if (!signature) return null;
    return this.state.skills.find(skill => skill.signature === signature) || null;
  }

  getSkills(): SkillEntry[] {
    return [...this.state.skills].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  saveSkill(payload: { trigger: string; signature: string; goal?: string; steps: SkillStep[] }): SkillEntry | null {
    const signature = payload.signature || this.getSignature(payload.trigger);
    if (!signature) return null;
    const filteredSteps = payload.steps.filter(step =>
      step.type !== 'open_url' || (step.url && isSkillUrl(step.url))
    );
    const steps = compactSteps(filteredSteps);
    if (!steps.length) return null;

    const now = Date.now();
    const existing = this.state.skills.find(skill => skill.signature === signature);
    if (existing) {
      existing.trigger = payload.trigger;
      existing.goal = payload.goal;
      existing.steps = steps;
      existing.updatedAt = now;
      existing.successCount += 1;
      this.save();
      return existing;
    } else {
      const created: SkillEntry = {
        id: crypto.randomUUID(),
        trigger: payload.trigger,
        signature,
        goal: payload.goal,
        steps,
        createdAt: now,
        updatedAt: now,
        useCount: 0,
        successCount: 1
      };
      this.state.skills.unshift(created);
      this.state.skills = this.state.skills.slice(0, MAX_SKILLS);
      this.save();
      return created;
    }
  }

  recordUse(id: string) {
    const skill = this.state.skills.find(item => item.id === id);
    if (!skill) return;
    skill.useCount += 1;
    skill.lastUsedAt = Date.now();
    this.save();
  }

  updateSkill(id: string, patch: Partial<SkillEntry>) {
    const skill = this.state.skills.find(item => item.id === id);
    if (!skill) return;
    Object.assign(skill, patch, { updatedAt: Date.now() });
    this.save();
  }

  deleteSkill(id: string) {
    const next = this.state.skills.filter(item => item.id !== id);
    if (next.length === this.state.skills.length) return;
    this.state.skills = next;
    this.save();
  }
}
