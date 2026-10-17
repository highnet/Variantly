// Shimmering stand-ins for things that are on their way: a page inside a
// compare pane, or a whole view while the app connects.
import clsx from 'clsx';

type PageSkeletonProps = { className?: string };

export const PageSkeleton = ({ className }: PageSkeletonProps) => (
  <div className={clsx('page-skeleton', className)} aria-hidden="true">
    <div className="sk-row sk-between">
      <i className="sk" style={{ width: 128, height: 24 }} />
      <span className="sk-row">
        <i className="sk" style={{ width: 56, height: 12 }} />
        <i className="sk" style={{ width: 56, height: 12 }} />
        <i className="sk" style={{ width: 96, height: 32 }} />
      </span>
    </div>
    <div className="sk-hero">
      <div className="sk-col">
        <i className="sk" style={{ width: 96, height: 12 }} />
        <i className="sk" style={{ width: '92%', height: 40 }} />
        <i className="sk" style={{ width: '72%', height: 40 }} />
        <i className="sk" style={{ width: '100%', height: 12 }} />
        <i className="sk" style={{ width: '84%', height: 12 }} />
      </div>
      <i className="sk sk-media" />
    </div>
    <div className="sk-cards">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="sk-col">
          <i className="sk sk-square" />
          <i className="sk" style={{ width: '75%', height: 12 }} />
        </span>
      ))}
    </div>
  </div>
);

type ViewSkeletonProps = { label: string };

export const ViewSkeleton = ({ label }: ViewSkeletonProps) => (
  // Shaped like the wizard that follows it: a title, the repo line, then
  // the step card, all in the same centred column.
  <div className="view-skeleton" role="status">
    <i className="sk sk-title" />
    <i className="sk" style={{ width: '70%', height: 12 }} />
    <div className="sk-col sk-card sk-panel">
      <span className="sk-row sk-steps">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className="sk sk-dot" />
        ))}
      </span>
      <i className="sk" style={{ width: 160, height: 20 }} />
      <i className="sk" style={{ width: '60%', height: 14 }} />
      <i className="sk" style={{ width: '50%', height: 14 }} />
      <span className="sk-row sk-end">
        <i className="sk" style={{ width: 180, height: 36, borderRadius: 999 }} />
      </span>
    </div>
    <p className="sk-label">{label}</p>
  </div>
);
