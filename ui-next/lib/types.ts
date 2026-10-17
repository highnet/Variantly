// The shapes variantly's server sends. Mirrors src/session.mjs and
// src/server.mjs; only what the UI reads is typed.

export type VariantStatus = 'queued' | 'preparing' | 'running' | 'reviewing' | 'committing' | 'done' | 'failed' | 'cancelled';

export type Usage = { inputTokens: number; outputTokens: number; cachedInputTokens?: number };

export type Audit = {
  lighthouse: { accessibility: number; performance: number; bestPractices: number; seo: number };
  axe: { total: number; violations: { impact: string; help: string; nodes: number }[] };
};

export type Variant = {
  n: number;
  direction: string;
  status: VariantStatus;
  summary: string;
  files: string[];
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  costUsd?: number;
  usage?: Usage;
  picked?: string;
  credits?: number;
  step?: number;
  review?: string;
  audit?: Audit;
  auditState?: 'running' | 'failed' | 'done';
  auditError?: string;
  chat?: ChatTurn[];
};

/** One turn of a variant's chat with the agent. */
export type ChatTurn = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  at: number;
  status?: 'running' | 'done' | 'failed';
  files?: string[];
};

export type ServerState = { id: string; state: 'ready' | 'starting' | 'sleeping' | 'failed' | string; proxyPort: number; log?: string[]; error?: string };

export type Snapshot = {
  repo: string;
  phase: 'setup' | 'generating' | 'ready' | 'rolling-out' | 'finalized';
  runId?: string;
  config?: Form & { agent: string; audit?: boolean };
  variants: Variant[];
  servers?: ServerState[];
  chosen: number | null;
  result: { files: string[]; conflicts: string[]; depsChanged: boolean; rollout?: string; rolloutError?: string } | null;
  baseline?: Audit;
  baselineError?: string;
};

export type Agent = {
  id: string;
  name: string;
  installed: boolean;
  version?: string;
  impeccable: boolean;
  signedIn?: boolean;
  install?: string;
};

export type Candidate = { rel: string; stackId: string; name: string; command: string; defaultUrl: string; running?: boolean; needsInstall?: boolean; note?: string };

export type Form = {
  appRel: string;
  stackId: string;
  command: string;
  originalUrl: string;
  agent: string;
  model: string;
  permissions: 'safe' | 'full';
  approach: 'redesign' | 'refine';
  count: number;
  directions: string[];
  product: { users: string; purpose: string; keep: string };
  brief: string;
  routes: string[];
  extras: string[];
  concurrency: number;
  maxLive: number;
  deps: 'link' | 'install';
  agentTimeoutMin: number;
  browser?: boolean;
  review?: boolean;
  audit?: boolean;
};

export type Detect = {
  repo: string;
  name: string;
  branch: string;
  head: string;
  hasCommits: boolean;
  dirty: boolean;
  untracked: number;
  candidates: Candidate[];
  stacks: { id: string; name: string }[];
  agents: Agent[];
  hasProduct: boolean;
  hasDesign: boolean;
  routes: string[];
  extras: { id: string; label: string; hint: string }[];
  chrome?: string | boolean;
  suggested: Form;
};
