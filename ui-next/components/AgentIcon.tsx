// Each agent's mark, drawn in the text colour so dark logos read on any theme.
import { siClaude, siCursor, siGithubcopilot, siGooglegemini, siOpenai } from 'simple-icons';

const PATHS: Record<string, string> = {
  claude: siClaude.path,
  codex: siOpenai.path,
  copilot: siGithubcopilot.path,
  gemini: siGooglegemini.path,
  cursor: siCursor.path,
};

type AgentIconProps = { id: string };

const AgentIcon = ({ id }: AgentIconProps) => {
  const d = PATHS[id];
  return (
    <svg className="agent-icon" viewBox="0 0 24 24" aria-hidden="true">
      {d ? (
        <path d={d} fill="currentColor" />
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
