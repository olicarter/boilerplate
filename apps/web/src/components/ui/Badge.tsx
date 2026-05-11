import type { ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'outline' | 'solid' | 'success' | 'error' | 'warning' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const cls = [styles.badge, styles[variant], className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
