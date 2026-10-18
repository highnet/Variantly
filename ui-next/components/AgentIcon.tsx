// Each agent's mark, drawn in the text colour so dark logos read on any theme.
import { siClaude, siCursor, siGithubcopilot, siGooglegemini, siOpenai } from 'simple-icons';

const PATHS: Record<string, string> = {
  claude: siClaude.path,
  codex: siOpenai.path,
  copilot: siGithubcopilot.path,
  gemini: siGooglegemini.path,
  cursor: siCursor.path,
  // OpenCode and Pi: from simple-icons 16 (CC0); this app pins 15, which still
  // has OpenAI's mark.
  opencode: 'M22 24H2V0h20zM17 4.8H7v14.4h10z',
  pi: 'M0 0v24h6v-6h6v-6H6V6h6v6h6V0Zm18 12v12h6V12Z',
};

/** Agents with no mark in simple-icons get a plain initial, not a lookalike logo. */
const INITIALS: Record<string, string> = { grok: 'G', hermes: 'H' };

type AgentIconProps = { id: string };

const AgentIcon = ({ id }: AgentIconProps) => {
  const d = PATHS[id];
  return (
    <svg className="agent-icon" viewBox="0 0 24 24" aria-hidden="true">
      {d ? (
        <path d={d} fill="currentColor" />
      ) : INITIALS[id] ? (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="system-ui, sans-serif" fill="currentColor">
            {INITIALS[id]}
          </text>
        </>
      ) : (
        // The demo agent: a plain dashed ring, not a brand.
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
      )}
    </svg>
  );
};

/** "GitHub Copilot CLI 1.0.98." or "2.1.301 (Claude Code)" → "1.0.98", "2.1.301". */
const shortVersion = (version: string) => version.match(/\d+(?:\.\d+)+/)?.[0] ?? version;

export { AgentIcon, shortVersion };
