import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'How variantly.style handles your data: hosting, third-party services and your rights.',
  alternates: { canonical: '/privacy' },
};

// Placeholder text until the real copy is written.
const Page = () => (
  <LegalPage title="Privacy policy">
    <p>This page is a placeholder.</p>
    <h2>Overview</h2>
    <p>[Placeholder: what data this site collects, why, and for how long.]</p>
    <h2>Hosting</h2>
    <p>[Placeholder: the hosting provider and the server logs it keeps.]</p>
    <h2>Third-party services</h2>
    <p>
      The demo video is embedded from YouTube in privacy-enhanced mode (youtube-nocookie.com), which
      loads once you scroll near it. &ldquo;Book a live demo&rdquo; links to Calendly; anything you
      enter there is handled under Calendly&rsquo;s own privacy policy.
    </p>
    <h2>Your rights</h2>
    <p>[Placeholder: access, correction, deletion and how to ask for them.]</p>
  </LegalPage>
);

export default Page;
