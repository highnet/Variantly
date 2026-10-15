import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Imprint' };

// Placeholder text until the real copy is written.
const Page = () => (
  <LegalPage title="Imprint">
    <p>This page is a placeholder.</p>
    <h2>Operator</h2>
    <p>[Name and address of the operator — placeholder]</p>
    <h2>Contact</h2>
    <p>[Email address — placeholder]</p>
    <h2>Responsible for content</h2>
    <p>[Name — placeholder]</p>
  </LegalPage>
);

export default Page;
