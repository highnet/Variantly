import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
 * SKILLS.md, served from the site so an agent can fetch the manual with one
 * short command:  curl -fsSL https://variantly.style/SKILLS.md
 * The file lives at the repository root, next to the CLI it documents.
 */
export const GET = () => {
  const skills = readFileSync(path.join(process.cwd(), '..', 'SKILLS.md'), 'utf8');
  return new Response(skills, {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
};
