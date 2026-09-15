import * as React from 'react';

import { cn } from '@/lib/cn';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

/**
 * shadcn 的 Separator 原本依赖 @radix-ui/react-separator，
 * 这里只需要一条分隔线，没必要为此多装一个包 —— 语义用 role 补齐即可。
 */
const Separator = ({
  className,
  orientation = 'horizontal',
  ...props
}: SeparatorProps) => (
  <div
    role="separator"
    aria-orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
);

export { Separator };
