// Screen capture by timestamp, not by Playwright's recordVideo.
//
// recordVideo writes a fixed 25 fps stream and repeats the last frame
// whenever a repaint is late, which judders every movement in the app; the
// film then resamples that to its own rate and judders again. Here every
// frame Chromium composites arrives through the DevTools screencast with
// its own timestamp, and the clip is rebuilt at a constant 60 fps by those
// timestamps: each frame is held exactly until the next one was painted.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ffmpeg } from './common.mjs';

export const CAPTURE_FPS = 60;

/**
 * An invisible repaint on every animation frame. The screencast only sends
 * a frame when something was painted, so a still page would otherwise go
 * quiet and a stutter in the app could hide inside the gap.
 */
export const REPAINT = () => {
  if (window.top !== window) return;
  const start = () => {
    const dot = document.createElement('div');
    // 2% black on 2 px: invisible on any background. A smaller change rounds
    // to the same pixel and Chromium skips the paint (measured: 1 fps vs 46).
    dot.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;pointer-events:none;z-index:2147483647;background:#000';
    document.documentElement.append(dot);
    let flip = false;
    const tick = () => {
      flip = !flip;
      dot.style.opacity = flip ? '0.02' : '0.021';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
};

/**
 * Start capturing `page` into `dir`. Frames are written as they arrive and
 * acknowledged straight away, which is what keeps the stream at full rate.
 * @returns {Promise<{ frames: [number, string][], stop: () => Promise<void> }>}
 */
export async function startScreencast(page, dir, { width, height, quality = 90 }) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  let n = 0;
  const session = await page.context().newCDPSession(page);
  session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    const name = `${String(n++).padStart(6, '0')}.jpg`;
    writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
    frames.push([metadata.timestamp, name]);
  });
  await session.send('Page.startScreencast', { format: 'jpeg', quality, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
  return {
    frames,
    stop: async () => {
      await session.send('Page.stopScreencast').catch(() => {});
      await session.detach().catch(() => {});
    },
  };
}

/**
 * Build a constant-rate clip from timestamped frames, covering [start, end]
 * (seconds since the epoch, the screencast's clock). Each frame lasts until
 * the next one; the frame showing at `start` opens the clip.
 */
export async function encodeCfr(frames, dir, out, { start, end, width, height, fps = CAPTURE_FPS }) {
  const sorted = [...frames].sort((a, b) => a[0] - b[0]);
  if (!sorted.length) throw new Error(`No frames were captured into ${dir}`);
  let first = sorted.findIndex(([t]) => t > start) - 1;
  if (first < 0) first = sorted[0][0] > start ? 0 : sorted.length - 1;
  const used = sorted.slice(first).filter(([t]) => t < end);
  if (!used.length) used.push(sorted[first]);

  const lines = ['ffconcat version 1.0'];
  used.forEach(([t, name], i) => {
    const from = Math.max(t, start);
    const to = i + 1 < used.length ? used[i + 1][0] : end;
    lines.push(`file '${name}'`, `duration ${Math.max(0, to - from).toFixed(6)}`);
  });
  // The concat demuxer ignores the last duration unless the file repeats.
  lines.push(`file '${used.at(-1)[1]}'`);
  const list = path.join(dir, 'frames.ffconcat');
  writeFileSync(list, lines.join('\n') + '\n');

  await ffmpeg([
    '-f', 'concat', '-safe', '0', '-i', list,
    // The first frames can come in before the viewport settles (1920×993):
    // fit every frame to the film's size so the encoder sees one shape.
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:0,setsar=1,fps=${fps},format=yuv420p`,
    '-t', (end - start).toFixed(3),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-g', String(fps),
    out,
  ]);
  return { frames: used.length, seconds: end - start };
}
