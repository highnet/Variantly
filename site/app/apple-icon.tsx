import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// The icon.svg mark (angled before/after split), redrawn at 180px for iOS home
// screens, which do not take SVG icons.
const AppleIcon = () =>
  new ImageResponse(
    <svg width="180" height="180" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#0d0d10" />
      <path d="M19.5 0H32v32H12.5Z" fill="#ffd400" />
      <rect x="5" y="9" width="8" height="2" rx="1" fill="#ffffff" opacity="0.7" />
      <rect x="5" y="14" width="6" height="2" rx="1" fill="#ffffff" opacity="0.7" />
      <rect x="5" y="19" width="7.5" height="2" rx="1" fill="#ffffff" opacity="0.7" />
      <rect x="20" y="7" width="7" height="7" rx="1.5" fill="#0d0d10" />
      <rect x="18" y="17" width="9" height="2.5" rx="1.25" fill="#0d0d10" />
      <rect x="16.5" y="22" width="8" height="2.5" rx="1.25" fill="#0d0d10" />
      <path d="M19.5 0 12.5 32" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill="#ffffff" stroke="#0d0d10" strokeWidth="1.4" />
    </svg>,
    size,
  );

export default AppleIcon;
