import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy policy' };

// Placeholder text until the real copy is written.
const Page = () => (
  <LegalPage title="Privacy policy">
    <p>This page is a placeholder.</p>
    <h2>Overview</h2>
    <p>[Placeholder: what data this site collects, why, and for how long.]</p>
    <h2>Hosting</h2>
    <p>[Placeholder: the hosting provider and the server logs it keeps.]</p>
    <h2>Your rights</h2>
    <p>[Placeholder: access, correction, deletion and how to ask for them.]</p>
  </LegalPage>
);

export default Page;
