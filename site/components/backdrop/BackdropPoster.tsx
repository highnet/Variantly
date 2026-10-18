import { CONCEPT_POSTERS } from '@/concepts/posters';
import { LIVE_IDS } from '@/concepts/metas';

// Only the concept html[data-variant] names shows (set before first paint);
// the agent view shows none.
const SHOW = [
  '[data-art]{display:none}',
  ...LIVE_IDS.map((id) => `:root[data-variant='${id}'] [data-art='${id}']{display:block}`),
  ":root[data-audience='agent'] .vy-backdrop-art{display:none}",
].join('');

/*
 * Every live concept's background art (concepts/<id>/Backdrop.tsx), rendered
 * on the server so the shapes paint with the first frame, before the title and
 * long before the three.js scene. CSS shows the active one, so a concept swap
 * restyles it instantly, inside the view transition. Drafts are not in it: the
 * client Backdrop loads a previewed draft's art lazily.
 */
export const BackdropPoster = () => (
  <div
    className="vy-backdrop vy-backdrop-art pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    aria-hidden="true"
  >
    <style>{SHOW}</style>
    <div className="vy-blobs vy-art absolute inset-0">
      {LIVE_IDS.map((id) => {
        const Art = CONCEPT_POSTERS[id];
        return (
          <div key={id} data-art={id} className="absolute inset-0">
            <Art />
          </div>
        );
      })}
    </div>
  </div>
);
