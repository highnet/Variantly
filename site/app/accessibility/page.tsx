import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';
import { LEGAL_UPDATED, OPERATOR } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'How variantly.style meets accessibility standards, and how to report a barrier.',
  alternates: { canonical: '/accessibility' },
};

const Page = () => (
  <LegalPage title="Accessibility">
    <h2>Our commitment</h2>
    <p>
      We want everyone to be able to use this website. We aim to meet the Web Content Accessibility
      Guidelines (WCAG) 2.2 at level AA, the standard behind EN 301 549.
    </p>
    <h2>What the site does</h2>
    <ul className="m-0 grid list-disc gap-1 pl-5">
      <li>A &ldquo;Skip to content&rdquo; link and a logical heading structure.</li>
      <li>Everything can be used with a keyboard, with visible focus.</li>
      <li>
        An accessibility menu in the header: readable font, larger text, high contrast, calm
        colours, light or dark theme, and reduced motion.
      </li>
      <li>Your system settings for dark mode and reduced motion are respected from the start.</li>
      <li>Text can be zoomed to 200% and the layout works on small screens.</li>
    </ul>
    <h2>Current status</h2>
    <p>
      This site partially conforms to WCAG 2.2 AA. It was last checked by its maintainer, without a
      formal external audit. Known gaps:
    </p>
    <ul className="m-0 grid list-disc gap-1 pl-5">
      <li>
        The demo video is hosted on YouTube, whose player is outside our control. We provide
        captions for the narration.
      </li>
      <li>Some decorative animations in the product preview may not be fully described.</li>
    </ul>
    <h2>Feedback</h2>
    <p>
      If something on this site is hard to use, or you need content in another format, email{' '}
      <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. Tell us the page and the problem;
      we aim to reply within two weeks.
    </p>
    <p>Last updated: {LEGAL_UPDATED}</p>
  </LegalPage>
);

export default Page;
