import type { Metadata } from 'next';

import { LegalPage } from '@/components/LegalPage';
import { LEGAL_UPDATED, OPERATOR } from '@/lib/legal';
import { REPO_URL } from '@/lib/site';

export const metadata: Metadata = { title: 'Imprint' };

const Page = () => (
  <LegalPage title="Imprint">
    <p>
      Information under § 5 E-Commerce-Gesetz (ECG) and disclosure under § 25 Mediengesetz
      (MedienG).
    </p>
    <h2>Media owner and service provider</h2>
    <p>
      {OPERATOR.name}
      <br />
      {OPERATOR.street}
      <br />
      {OPERATOR.city}
      <br />
      {OPERATOR.country}
    </p>
    <h2>Contact</h2>
    <p>
      Email: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
    </p>
    <h2>Nature of this website</h2>
    <p>
      A private, non-commercial website. It is not run as a business, so there is no trade licence,
      company register entry or VAT number to state.
    </p>
    <h2>Editorial line (§ 25 (4) MedienG)</h2>
    <p>Information about variantly, a free, open-source command-line tool, and how to use it.</p>
    <h2>Responsible for content</h2>
    <p>{OPERATOR.name}, address as above.</p>
    <h2>Links to other websites</h2>
    <p>
      This site links to external websites. Their operators alone are responsible for their content.
      When a link was set, no unlawful content was apparent; if we learn of any, we remove the link.
    </p>
    <h2>Copyright</h2>
    <p>
      The variantly source code is published under the MIT licence on <a href={REPO_URL}>GitHub</a>.
      The texts and design of this website belong to {OPERATOR.name} unless stated otherwise.
    </p>
    <p>Last updated: {LEGAL_UPDATED}</p>
  </LegalPage>
);

export default Page;
