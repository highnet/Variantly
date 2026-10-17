import { COMMANDS, FLAGS } from '@/components/QuickDocs';
import { PROMPTS } from '@/lib/content';
import { INSTALL, REPO_URL, SKILLS_URL } from '@/lib/site';

const STEPS = [
  {
    command: `curl -fsSL ${SKILLS_URL}`,
    what: 'Read the manual first. It is short and written for you.',
  },
  {
    command: 'npx variantly doctor',
    what: 'Fix every ✗: a commit, an agent CLI. The Impeccable skill installs itself when missing.',
  },
  {
    command: 'npx variantly --yes --agent claude --count 4 --brief "<their words>"',
    what: 'Start a run in the background and give the person the URL it prints.',
  },
  {
    command: 'npx variantly status',
    what: 'Poll until "phase" is "ready". Cheap: it reads a file.',
  },
  {
    command: 'npx variantly keep <n>',
    what: 'Only after the person names a variant. Then stop the background process.',
  },
];

type DefListProps = {
  rows: readonly (readonly [string, string])[];
};

const DefList = ({ rows }: DefListProps) => (
  <dl>
    {rows.map(([term, what]) => (
      <div key={term}>
        <dt>
          <code>{term}</code>
        </dt>
        <dd>{what}</dd>
      </div>
    ))}
  </dl>
);

/*
 * The agent's view: a plain document, like a README or llms.txt rendered as
 * HTML. No graphics, no motion: semantic headings, the commands as <pre>, and
 * links. Styled only by `.agent-doc` in globals.css, close to browser defaults.
 */
const AgentDoc = () => (
  <div className="agent-doc">
    <main>
      <h1>variantly: agent quickstart</h1>
      <p>
        variantly makes N whole-page redesigns of a web project with the person&apos;s own agent and
        the <a href="https://impeccable.style">Impeccable</a> skill, runs each as the real site, and
        opens a local before/after comparison. Your job: check the project, start the run, let the
        person choose.
      </p>
      <p>
        Full manual: <a href="/SKILLS.md">/SKILLS.md</a> (Markdown). Source:{' '}
        <a href={REPO_URL}>{REPO_URL}</a>
      </p>

      <h2>Install</h2>
      <pre>{INSTALL}</pre>
      <p>Claude Code plugin:</p>
      <pre>/plugin marketplace add highnet/variantly</pre>

      <h2>Steps</h2>
      <ol>
        {STEPS.map((s) => (
          <li key={s.command}>
            <pre>{s.command}</pre>
            <p>{s.what}</p>
          </li>
        ))}
      </ol>

      <h2>Constraints</h2>
      <ul>
        <li>Never pick a variant for the person unless they told you which one.</li>
        <li>
          Each variant is one full session of their agent, on their account. Say so before a large
          run.
        </li>
        <li>
          Nothing touches their working tree until keep; the change lands unstaged for them to
          review.
        </li>
        <li>
          For one element instead of the whole page, use Impeccable live in their agent:
          <pre>/impeccable live</pre>
        </li>
      </ul>

      <h2 id="docs">Commands</h2>
      <DefList rows={COMMANDS} />

      <h2>Flags</h2>
      <DefList rows={FLAGS} />

      <h2>Agent prompt</h2>
      <p>What a person pastes into their assistant to get set up:</p>
      <pre>{PROMPTS.setup}</pre>
    </main>
  </div>
);

export { AgentDoc };
