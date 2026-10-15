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
  <div className="view-skeleton" role="status">
    <span className="sk-row">
      <i className="sk" style={{ width: 220, height: 28 }} />
    </span>
    <div className="sk-cards">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="sk-col sk-card">
          <i className="sk" style={{ width: '40%', height: 12 }} />
          <i className="sk" style={{ width: '85%', height: 18 }} />
          <i className="sk" style={{ width: '100%', height: 8 }} />
        </span>
      ))}
    </div>
    <p className="sk-label">{label}</p>
  </div>
);
