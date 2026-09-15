import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border
   font-medium tabular-nums transition-colors`,
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        /** 工具栏里的状态条：只做背景衬托，颜色留给里面的图标去表达 */
        muted:
          'border-transparent bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300',
      },
      size: {
        sm: 'h-6 px-2 text-[11px]',
        default: 'h-7 px-2.5 text-xs',
        lg: 'h-9 px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/** 需要 forwardRef：工具栏里它会作为 Tooltip 的 trigger（asChild）挂 ref */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
