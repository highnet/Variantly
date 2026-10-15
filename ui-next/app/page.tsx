'use client';

import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { Shell } from '@/components/Shell';
import { connect } from '@/lib/live';

const Page = () => {
  useEffect(() => connect(), []);
  return (
    <MotionConfig reducedMotion="user">
      <Shell />
    </MotionConfig>
  );
};

export default Page;
