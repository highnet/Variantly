import type { Metadata } from 'next';

import { AgentDoc } from '@/components/AgentDoc';
import { SiteShell } from '@/components/SiteShell';

export const metadata: Metadata = {
  title: 'For agents',
  description:
    'The variantly quickstart for AI coding agents: commands, flags and the full manual.',
  alternates: { canonical: '/agents' },
};

const AgentsPage = () => (
  <SiteShell plain>
    <AgentDoc />
  </SiteShell>
);

export default AgentsPage;
