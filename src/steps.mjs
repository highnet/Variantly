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
const WRITE = /^→\s*(edit|write|create|str_replace|apply_patch|patch|multiedit|update)/i;

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
  if (WRITE.test(l) && CODE.test(l)) to = index('build');
  if (current >= index('build') && /\bdetect\b|critique|craft.?floor|finish review|\btsc\b|typecheck|lint/i.test(l)) to = index('check');
  if (WRITE.test(l) && /DESIGN\.md/.test(l)) to = index('document');
  if (/^Committed \d+/.test(l)) to = index('save');
  return to > current ? to : -1;
};
