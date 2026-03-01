// ============================================================================
// Button — PulseOps V2 Design System
//
// PURPOSE: Reusable button component with variant, size, loading, and icon
// support. Used across all modules for visual consistency.
//
// USAGE:
//   import { Button } from '@shared';
//   <Button variant="primary" size="sm" onClick={handleClick}>Save</Button>
//
// VARIANTS: primary, secondary, danger, ghost
// SIZES: sm, md, lg
// ============================================================================
import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
  secondary: 'bg-surface-100 text-surface-700 hover:bg-surface-200 focus:ring-surface-400 border border-surface-300',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500',
  ghost: 'bg-transparent text-surface-600 hover:bg-surface-100 focus:ring-surface-400',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 12 : 16} />
      ) : null}
      {children}
    </button>
  );
}
