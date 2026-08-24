import React from 'react';
import { StoryIcon, StoryIconName } from './StoryIcon';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

function createNamedIcon(name: StoryIconName) {
  const IconComponent: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
    <StoryIcon name={name} size={size} className={className} {...props} />
  );
  IconComponent.displayName = `StoryIcon(${name})`;
  return IconComponent;
}

export const FactIcon = createNamedIcon('fact');
export const TestimonyIcon = createNamedIcon('testimony');
export const HypothesisIcon = createNamedIcon('hypothesis');
export const PersonIcon = createNamedIcon('person');
export const LocationIcon = createNamedIcon('location');
export const RecordIcon = createNamedIcon('record');
export const ProtocolIcon = createNamedIcon('protocol');
export const EventIcon = createNamedIcon('event');
export const SearchIcon = createNamedIcon('search');
export const CloseIcon = createNamedIcon('close');
export const WarningIcon = createNamedIcon('warning');
