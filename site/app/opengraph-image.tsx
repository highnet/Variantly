import { ImageResponse } from 'next/og';

export const alt = 'variantly — AI website redesigns, side by side. Keep one.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const OpengraphImage = () =>
  new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: '#1c2127',
        color: '#e8ebee',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, color: '#ffd400' }}>variantly</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 72, lineHeight: 1.1 }}>N redesigns of your site, side by side.</div>
        <div style={{ fontSize: 72, lineHeight: 1.1, color: '#ffd400' }}>Keep one.</div>
      </div>
      <div style={{ display: 'flex', fontSize: 32, color: '#a9b0b8' }}>npx variantly</div>
    </div>,
    size,
  );

export default OpengraphImage;
