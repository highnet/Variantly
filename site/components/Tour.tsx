import { Rich } from '@/components/ui/Rich';
import { Typography } from '@/components/ui/Typography';
import { TOUR } from '@/lib/content';

type ShotProps = {
  shot: string;
  alt: string;
  eager: boolean;
};

/*
 * One screen of the local app in both themes, captured twice: on a phone
 * (390 wide) for small screens, where a shrunk desktop capture is
 * unreadable, and on a laptop (1440 wide) for the rest. Only the theme
 * matching the site's is displayed, so the browser fetches just that one.
 */
const Shot = ({ shot, alt, eager }: ShotProps) => (
  <>
    {(['light', 'dark'] as const).map((t) => (
      <picture key={t} className={t === 'light' ? 'vy-shot-light block' : 'vy-shot-dark'}>
        <source
          media="(max-width: 1023px)"
          srcSet={`/how/${shot}-${t}-phone.webp 390w, /how/${shot}-${t}-phone@2x.webp 780w`}
          sizes="390px"
          width={390}
          height={844}
        />
        {}
        <img
          src={`/how/${shot}-${t}.webp`}
          srcSet={`/how/${shot}-${t}.webp 1440w, /how/${shot}-${t}@2x.webp 2880w`}
          sizes="66vw"
          width={1440}
          height={900}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="block h-auto w-full"
        />
      </picture>
    ))}
  </>
);

/*
 * The run, screen by screen. The narration sticks beside its screenshot on
 * wide screens; the numbers carry the order of a real run.
 */
const Tour = () => (
  <ol className="m-0 grid list-none gap-24 p-0 lg:gap-32">
    {TOUR.map((s, i) => (
      <li
        key={s.shot}
        className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,9fr)] lg:gap-12"
      >
        <div className="grid content-start gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border-ink flex items-baseline justify-between gap-4 border-t-2 pt-4">
            <span
              className="figure text-ink text-[clamp(3rem,5vw,4.5rem)] leading-[0.8] tabular-nums"
              aria-hidden="true"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <Typography variant="label" color="steel" className="text-right">
              {s.where}
            </Typography>
          </div>
          <Typography variant="headline" as="h2">
            <span className="sr-only">Step {i + 1}: </span>
            {s.title}
          </Typography>
          <p className="text-ink m-0 max-w-[44ch] text-[17px] leading-relaxed text-pretty">
            <Rich text={s.body} />
          </p>
          <ul className="border-rule m-0 grid list-none gap-2 border-t p-0 pt-4">
            {s.notes.map((n) => (
              <li
                key={n}
                className="text-steel grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2 text-[15px] leading-snug"
              >
                <span className="bg-steel mt-[0.6em] h-px w-full" aria-hidden="true" />
                <span>
                  <Rich text={n} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <figure className="m-0 grid gap-3">
          <div className="rounded-pass bg-surface shadow-lift mx-auto w-full max-w-[390px] overflow-hidden lg:max-w-none">
            <Shot shot={s.shot} alt={s.alt} eager={i === 0} />
          </div>
          <figcaption className="mx-auto flex w-full max-w-[390px] flex-wrap items-baseline justify-between gap-x-4 gap-y-1 lg:max-w-none">
            <Typography variant="data" color="steel">
              localhost:4477
            </Typography>
            <Typography variant="label" color="steel">
              Demo agent · Northgate Cycles
            </Typography>
          </figcaption>
        </figure>
      </li>
    ))}
  </ol>
);

export { Tour };
