import { cn } from '@/lib/utils';

type PageSkeletonProps = {
  className?: string;
};

/*
 * Stands in for a demo page while its frame loads: nav, hero, copy and a row
 * of product cards, every block shimmering. Fades out once the page is in.
 */
const PageSkeleton = ({ className }: PageSkeletonProps) => (
  <div
    aria-hidden="true"
    className={cn(
      'bg-surface absolute inset-0 grid content-start gap-8 overflow-hidden p-6 transition-opacity duration-500 sm:p-10',
      className,
    )}
  >
    <div className="flex items-center justify-between gap-6">
      <div className="skeleton h-6 w-32" />
      <div className="hidden gap-5 sm:flex">
        <div className="skeleton h-3 w-14" />
        <div className="skeleton h-3 w-14" />
        <div className="skeleton h-3 w-14" />
        <div className="skeleton h-8 w-24" />
      </div>
    </div>
    <div className="grid items-center gap-8 md:grid-cols-2">
      <div className="grid gap-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-10 w-11/12" />
        <div className="skeleton h-10 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6" />
        <div className="mt-2 flex gap-3">
          <div className="skeleton h-10 w-32" />
          <div className="skeleton h-10 w-28" />
        </div>
      </div>
      <div className="skeleton aspect-[4/3] w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid gap-2">
          <div className="skeleton aspect-square w-full" />
          <div className="skeleton h-3 w-3/4" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      ))}
    </div>
  </div>
);

export { PageSkeleton };
