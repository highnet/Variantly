import { Typography } from '@/components/ui/Typography';

const ROWS: { label: string; live: string; variantly: string }[] = [
  {
    label: 'What changes',
    live: 'One element you click on: a hero, a card, a button.',
    variantly:
      'The whole site: colours, fonts, layout and components, in every file that needs it.',
  },
  {
    label: 'How you compare',
    live: 'Versions swap in place on your running page.',
    variantly:
      'Each design runs as its own copy of your site. Flick between them and slide before/after.',
  },
  {
    label: 'What you choose',
    live: 'The best version of a detail.',
    variantly: 'A direction, from several deliberately different ones.',
  },
  {
    label: 'Cost',
    live: 'Quick and light.',
    variantly: 'One full AI session per design, so more time and usage. Start with four.',
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
      <p className="text-steel m-0 text-[16px] leading-relaxed">
        variantly is built on{' '}
        <a href="https://impeccable.style" className="text-ink underline underline-offset-2">
          Impeccable
        </a>{' '}
        by{' '}
        <a href="https://x.com/pbakaus" className="text-ink underline underline-offset-2">
          Paul Bakaus
        </a>
        , the design skill that does the actual redesigning, and needs it installed.
        Impeccable&apos;s live mode tunes one element at a time. variantly does the same thing for
        the whole site. Use variantly to choose a direction, then live mode to polish the one you
        kept.
      </p>
    </div>
    <div className="rounded-pass border-rule bg-surface overflow-x-auto border">
      <table className="w-full min-w-[640px] border-collapse text-left text-[15px] leading-snug">
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
