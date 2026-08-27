import React from 'react';

export type StoryIconName =
  | 'fact'
  | 'testimony'
  | 'hypothesis'
  | 'person'
  | 'location'
  | 'record'
  | 'protocol'
  | 'event'
  | 'search'
  | 'close'
  | 'warning';

export interface StoryIconProps extends React.SVGProps<SVGSVGElement> {
  name: StoryIconName;
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}

export const StoryIcon: React.FC<StoryIconProps> = ({
  name,
  size = 16,
  strokeWidth = 1.75,
  className = '',
  ...props
}) => {
  const renderPath = () => {
    switch (name) {
      case 'fact':
        return (
          <>
            <polygon points="12 2 22 12 12 22 2 12 12 2" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </>
        );
      case 'testimony':
        return (
          <>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="8" y1="9" x2="16" y2="9" />
            <line x1="8" y1="13" x2="14" y2="13" />
          </>
        );
      case 'hypothesis':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        );
      case 'person':
        return (
          <>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        );
      case 'location':
        return (
          <>
            <path d="M12 21s-7-4.35-7-10a7 7 0 1 1 14 0c0 5.65-7 10-7 10z" />
            <circle cx="12" cy="11" r="2.5" />
          </>
        );
      case 'record':
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </>
        );
      case 'protocol':
        return (
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </>
        );
      case 'event':
        return <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />;
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </>
        );
      case 'close':
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      case 'warning':
        return (
          <>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {renderPath()}
    </svg>
  );
};
