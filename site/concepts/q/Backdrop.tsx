import type { ReactNode } from 'react';

import { Piece } from '@/components/backdrop/artKit';

/* q · Sticker Bomb: die-cut vinyl stickers crowding the edges of a brushed
   lid; the middle stays clean for the wordmark and the call to action. Two
   peel up and slap back down, one corner curls (24s, transform only). */
type StickerProps = {
  d: string;
  fill: string;
  children?: ReactNode;
};

// A die-cut sticker: drop shadow, white kiss-cut border, then the print.
const Sticker = ({ d, fill, children }: StickerProps) => (
  <>
    <path
      d={d}
      transform="translate(1.6 2.8)"
      className="fill-(--art-shadow) stroke-(--art-shadow)"
      strokeWidth="9"
      strokeLinejoin="round"
    />
    <path
      d={d}
      className="fill-(--art-cut) stroke-(--art-cut)"
      strokeWidth="9"
      strokeLinejoin="round"
    />
    <path d={d} fill={fill} />
    {children}
  </>
);

const STAR = 'M50,8 L60,36 L90,36 L66,54 L75,84 L50,66 L25,84 L34,54 L10,36 L40,36Z';
const FLAME =
  'M52,6 C58,24 76,30 80,52 C84,74 68,92 50,92 C30,92 16,78 18,58 C20,44 30,38 32,26 C40,34 40,42 44,46 C46,30 46,18 52,6Z';
const BOLT = 'M58,6 L22,54 L46,54 L36,94 L78,40 L54,40 L66,6Z';
const PILL = 'M18,32 H82 A18,18 0 0 1 82,68 H18 A18,18 0 0 1 18,32Z';
const BLOB = 'M50,10 C74,10 90,28 90,50 C90,74 72,90 50,90 C26,90 10,72 10,50 C10,26 28,10 50,10Z';
const TAG = 'M14,14 H86 V86 H14Z';

type LabelProps = {
  y: number;
  children: string;
  size?: number;
};

const Label = ({ y, children, size = 11 }: LabelProps) => (
  <text
    x="50"
    y={y}
    textAnchor="middle"
    fontSize={size}
    className="fill-(--art-ink) [font-family:var(--font-ransom)]"
  >
    {children}
  </text>
);

const Stickers = () => (
  <>
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="q-holo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="[stop-color:var(--art-1)]" />
          <stop offset="0.35" className="[stop-color:var(--art-2)]" />
          <stop offset="0.6" className="[stop-color:var(--art-3)]" />
          <stop offset="1" className="[stop-color:var(--art-1)]" />
        </linearGradient>
        <pattern id="q-check" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" className="fill-(--art-3)" />
          <path d="M0,0 H8 V8 H0Z M8,8 H16 V16 H8Z" className="fill-(--art-ink)" />
        </pattern>
      </defs>
    </svg>
    <Piece className="top-[9%] left-[-4%] size-[19vmax] rotate-[-14deg]" float={0}>
      <Sticker d={BLOB} fill="url(#q-holo)">
        <circle cx="50" cy="50" r="22" className="fill-(--art-cut)" fillOpacity="0.55" />
        <Label y={55} size={14}>
          v
        </Label>
      </Sticker>
    </Piece>
    <div className="vy-q-peel absolute top-[47%] left-[1%] size-[15vmax] rotate-[9deg] max-sm:top-[64%]">
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        <Sticker d={STAR} fill="url(#q-check)" />
      </svg>
    </div>
    <Piece className="top-[78%] left-[6%] size-[19vmax] rotate-[-6deg] max-sm:hidden">
      <Sticker d={PILL} fill="var(--art-1)">
        <Label y={54}>KEEP ONE</Label>
      </Sticker>
    </Piece>
    <Piece className="top-[5%] right-[-3%] size-[17vmax] rotate-[12deg]">
      <Sticker d={FLAME} fill="var(--art-1)">
        <path
          d="M50,40 C56,52 66,58 62,72 C58,84 42,84 38,72 C36,62 44,56 50,40Z"
          className="fill-(--art-3)"
        />
      </Sticker>
    </Piece>
    <div className="vy-q-peel vy-q-peel-b absolute top-[43%] right-[2%] size-[14vmax] rotate-[-8deg] max-sm:top-[60%]">
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        <Sticker d={BOLT} fill="var(--art-3)" />
      </svg>
    </div>
    <Piece className="top-[74%] right-[9%] size-[16vmax] rotate-[5deg]">
      <Sticker d={TAG} fill="var(--art-2)">
        <Label y={47}>npx</Label>
        <Label y={64} size={9}>
          variantly
        </Label>
        {/* the corner lifting off the lid: the sticker's white back */}
        <path
          d="M86,14 L62,14 L86,38Z"
          className="vy-q-curl fill-(--art-cut) stroke-(--art-shadow)"
          strokeWidth="0.6"
        />
      </Sticker>
    </Piece>
    <Piece className="top-[2%] left-[22%] size-[8vmax] rotate-[-20deg] max-sm:hidden">
      <Sticker d={BLOB} fill="var(--art-3)">
        <circle cx="38" cy="42" r="6" className="fill-(--art-ink)" />
        <circle cx="62" cy="42" r="6" className="fill-(--art-ink)" />
        <path
          d="M30,60 Q50,80 70,60"
          fill="none"
          className="stroke-(--art-ink)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </Sticker>
    </Piece>
    <Piece className="top-[88%] right-[30%] size-[9vmax] rotate-[16deg] max-sm:hidden">
      <Sticker d={STAR} fill="var(--art-2)" />
    </Piece>
  </>
);

export default Stickers;
