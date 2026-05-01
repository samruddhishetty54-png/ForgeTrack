import React from 'react';

const Skeleton = ({ className = '', ...props }) => {
  return (
    <div 
      className={`animate-pulse rounded-md bg-surface-inset border border-border-default ${className}`} 
      {...props}
    />
  );
};

export default Skeleton;
