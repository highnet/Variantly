// @ts-check
/*
 * `variantly install-skill`: put the variantly skill where each agent reads
 * skills, so the agent knows how to drive variantly when someone asks for a
 * redesign. One SKILL.md serves every agent (they share the format: YAML
 * front matter with name and description, then Markdown); it is the same file
 * the Claude Code plugin ships.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS } from './agents.mjs';

export const SKILL_SOURCE = fileURLToPath(new URL('../plugins/variantly/skills/variantly/SKILL.md', import.meta.url));

/**
 * @typedef {object} InstallResult
 * @property {string} agent
 * @property {string} file
 * @property {'written' | 'updated' | 'unchanged'} status
 */

/**
 * @param {{ providers: string[], scope: 'global' | 'project', projectRoot?: string, home?: string, env?: NodeJS.ProcessEnv }} opts
 * @returns {Promise<InstallResult[]>}
 */
export async function installSkill(opts) {
  const unknown = opts.providers.filter((id) => !AGENTS.some((a) => a.id === id));
  if (unknown.length) throw new Error(`Unknown provider ${unknown.join(', ')}. Use ${AGENTS.map((a) => a.id).join(', ')}.`);
  if (opts.scope === 'project' && !opts.projectRoot) throw new Error('A project install needs a project folder.');
  const home = opts.home ?? os.homedir();
  const env = opts.env ?? process.env;
  const content = await readFile(SKILL_SOURCE, 'utf8');
  /** @type {InstallResult[]} */
  const results = [];
  for (const agent of AGENTS.filter((a) => opts.providers.includes(a.id))) {
    const root =
      opts.scope === 'project'
        ? path.join(/** @type {string} */ (opts.projectRoot), agent.skills.project[0])
        : agent.skills.global(home, env)[0];
    const file = path.join(root, 'variantly', 'SKILL.md');
    const before = await readFile(file, 'utf8').catch(() => null);
    if (before !== content) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
    }
    results.push({ agent: agent.id, file, status: before === null ? 'written' : before === content ? 'unchanged' : 'updated' });
  }
  return results;
}

/**
 * Parse `--providers=claude,codex` into ids; empty when the flag is absent.
 * @param {string | undefined} value
 */
export function parseProviders(value) {
  if (!value) return [];
  return [...new Set(value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];
}
