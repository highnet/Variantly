import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Accessibility' };

// Placeholder text until the real copy is written.
const Page = () => (
  <LegalPage title="Accessibility">
    <p>This page is a placeholder.</p>
    <h2>Our commitment</h2>
    <p>[Placeholder: the accessibility standard this site aims for.]</p>
    <h2>Current status</h2>
    <p>[Placeholder: known gaps and what is being done about them.]</p>
    <h2>Feedback</h2>
    <p>[Placeholder: how to report an accessibility problem.]</p>
  </LegalPage>
);

export default Page;
