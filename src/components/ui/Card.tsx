import React from 'react';
import { cn } from './Button';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = ({ className, glass = false, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-3xl p-4 md:p-6 soft-shadow transition-colors duration-300',
        glass ? 'glass' : 'bg-white dark:bg-dark-card dark:border dark:border-dark-border',
        className
      )}
      {...props}
    />
  );
};
