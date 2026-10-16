import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// The icon.svg mark, redrawn at 180px for iOS home screens (no SVG support).
const bar = (left: number, top: number, width: number, height: number, color: string) => (
  <div
    style={{
      position: 'absolute',
      left: (left / 32) * 180,
      top: (top / 32) * 180,
      width: (width / 32) * 180,
      height: (height / 32) * 180,
      borderRadius: 6,
      background: color,
    }}
  />
);

const AppleIcon = () =>
  new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: '#0d0d10',
      }}
    >
      {bar(6, 7, 5, 18, '#ffd400')}
      {bar(13, 10, 2, 12, '#ffffff')}
      {bar(17, 7, 5, 18, '#ffd400')}
      {bar(24, 12, 2, 8, '#ffd400')}
    </div>,
    size,
  );

export default AppleIcon;
