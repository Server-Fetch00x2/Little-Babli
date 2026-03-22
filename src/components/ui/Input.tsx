import React from 'react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-2xl border-2 border-lavender-100 bg-white px-4 py-3 outline-none transition-all focus:border-lavender-300 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:border-lavender-500',
          className
        )}
        {...props}
      />
    );
  }
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-2xl border-2 border-lavender-100 bg-white px-4 py-3 outline-none transition-all focus:border-lavender-300 min-h-[150px] dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:focus:border-lavender-500',
          className
        )}
        {...props}
      />
    );
  }
);
