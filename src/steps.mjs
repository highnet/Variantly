// @ts-check
/*
 * The steps a variant moves through, read off the agent's output. Agents don't
 * announce Impeccable's phases, so this is a heuristic over what they do: the
 * files they touch and the commands they run. Steps only move forward.
 */

export const STEPS = /** @type {const} */ ([
  { id: 'setup', label: 'Setting up' },
  { id: 'read', label: 'Reading the site' },
  { id: 'direction', label: 'Choosing a direction' },
  { id: 'build', label: 'Building' },
  { id: 'check', label: 'Checking' },
  { id: 'document', label: 'Writing DESIGN.md' },
  { id: 'save', label: 'Saving' },
]);

const index = (/** @type {string} */ id) => STEPS.findIndex((s) => s.id === id);
const CODE = /\.(css|scss|sass|less|tsx?|jsx?|mjs|svelte|vue|astro|html?|php|erb|py|go|rs|templ)\b/i;
// Gemini CLI edits with `replace` and writes with `write_file`.
const WRITE = /^→\s*(edit|write|create|str_replace|apply_patch|patch|multiedit|update|replace)/i;
// Agents without an edit tool (Copilot on Windows, Codex in a shell) write
// files from the shell: PowerShell here-strings into Set-Content, redirects,
// tee, or a script that opens a file for writing.
const SHELL = /^→\s*(powershell|pwsh|bash|sh|shell|zsh|cmd|run|run_shell_command|exec|command)\b/i;
const SHELL_WRITE = /Set-Content|Out-File|Add-Content|WriteAllText|@'|@"|\btee\b|>>?\s*\S+\.\w+|cat\s*>|<<\s*['"]?\w+|write_text|writeFileSync|open\([^)]*['"][wa]['"]/i;

/**
 * The step a line points at, or -1 when it says nothing about progress.
 * @param {string} line
 * @param {number} current  the step index so far
 */
export const stepFrom = (line, current) => {
  const l = line.trim();
  let to = -1;
  if (/session started|^\$ /i.test(l)) to = index('read');
  if (/concept.?seed|DIRECTION:|direction contract|surface brief/i.test(l)) to = index('direction');
  // Copilot reports edits as a bare `apply_patch`, with no file name.
  if ((WRITE.test(l) && CODE.test(l)) || /^→\s*apply_patch\b/i.test(l)) to = index('build');
  // A shell write counts once the agent has a direction; a here-string is
  // often cut off before the file name shows, so it needs no extension.
  if (current >= index('direction') && SHELL.test(l) && SHELL_WRITE.test(l)) to = Math.max(to, index('build'));
  // Checking can follow the direction straight away (an agent may build and
  // check in one go), and includes looking at its work in a browser.
  if (current >= index('direction') && /\bdetect\b|critique|craft.?floor|finish review|\btsc\b|typecheck|\blint\b|playwright-browser|screenshot/i.test(l)) to = Math.max(to, index('check'));
  if (WRITE.test(l) && /DESIGN\.md/.test(l)) to = index('document');
  if (/^Committed \d+/.test(l)) to = index('save');
  return to > current ? to : -1;
};
