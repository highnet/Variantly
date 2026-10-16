import { Typography } from '@/components/ui/Typography';

const ROWS: { label: string; live: string; variantly: string }[] = [
  {
    label: 'What changes',
    live: 'One element: a hero, card, button.',
    variantly: 'The whole site: colours, fonts, layout, components.',
  },
  {
    label: 'How you compare',
    live: 'Swaps in place on your running page.',
    variantly: 'Each design runs as its own site. Flick and slide before/after.',
  },
  {
    label: 'What you choose',
    live: 'The best version of a detail.',
    variantly: 'A direction, from several distinct ones.',
  },
  {
    label: 'Cost',
    live: 'Quick and light.',
    variantly: 'One AI session per design. Start with four.',
  },
];

/*
 * variantly beside the tool it is built on: same idea, one level up.
 * Framed as a sequence, never as a contest.
 */
const WithLive = () => (
  <section aria-labelledby="live-title" className="grid gap-6">
    <div className="grid max-w-[68ch] gap-3">
      <Typography variant="headline" as="h2" id="live-title">
        Pick a direction, then fine-tune it
      </Typography>
      <ul className="text-steel m-0 grid list-disc gap-1.5 pl-5 text-[16px] leading-relaxed">
        <li>
          Built on{' '}
          <a href="https://impeccable.style" className="text-ink underline underline-offset-2">
            Impeccable
          </a>{' '}
          by{' '}
          <a href="https://x.com/pbakaus" className="text-ink underline underline-offset-2">
            Paul Bakaus
          </a>
          : the design skill doing the work. <strong className="text-ink">Required</strong>, and variantly
          installs it for you if it&apos;s missing.
        </li>
        <li>
          <strong className="text-ink">Live mode</strong> tunes{' '}
          <strong className="text-ink">one element</strong>; variantly redesigns the{' '}
          <strong className="text-ink">whole site</strong>.
        </li>
        <li>
          <strong className="text-ink">variantly</strong> to choose a direction, then{' '}
          <strong className="text-ink">live mode</strong> to polish it.
        </li>
      </ul>
    </div>
    {/* Phones: one card per question, both answers stacked. */}
    <dl className="m-0 grid gap-3 md:hidden">
      {ROWS.map((r) => (
        <div
          key={r.label}
          className="rounded-pass border-rule bg-surface grid overflow-hidden border"
        >
          <dt className="text-steel px-4 pt-4 text-[14px] font-semibold">{r.label}</dt>
          <dd className="m-0 grid gap-1 px-4 py-3">
            <Typography variant="label" color="steel">
              Impeccable live mode
            </Typography>
            <span className="text-steel text-[15px] leading-snug">{r.live}</span>
          </dd>
          <dd className="bg-panel m-0 grid gap-1 px-4 py-3">
            <Typography variant="label">variantly</Typography>
            <span className="text-[15px] leading-snug">{r.variantly}</span>
          </dd>
        </div>
      ))}
    </dl>
    <div className="rounded-pass border-rule bg-surface hidden overflow-hidden border md:block">
      <table className="w-full border-collapse text-left text-[15px] leading-snug">
        <thead>
          <tr className="border-rule border-b">
            <th scope="col" className="w-[18%] p-4">
              <span className="sr-only">Compare</span>
            </th>
            <th scope="col" className="p-4">
              <Typography variant="title" as="span">
                Impeccable live mode
              </Typography>
            </th>
            <th scope="col" className="bg-panel p-4">
              <Typography variant="title" as="span">
                variantly
              </Typography>
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label} className="border-rule border-b last:border-b-0">
              <th scope="row" className="text-steel p-4 align-top text-[14px] font-semibold">
                {r.label}
              </th>
              <td className="text-steel p-4 align-top">{r.live}</td>
              <td className="bg-panel p-4 align-top">{r.variantly}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export { WithLive };
