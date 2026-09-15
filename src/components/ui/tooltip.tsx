'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        `z-50 overflow-hidden rounded-md bg-gray-900 px-2.5 py-1.5 text-xs
         font-medium text-white shadow-md dark:bg-gray-100 dark:text-gray-900`,
        `animate-in fade-in-0 zoom-in-95
         data-[state=closed]:animate-out data-[state=closed]:fade-out-0
         data-[state=closed]:zoom-out-95
         data-[side=bottom]:slide-in-from-top-1
         data-[side=top]:slide-in-from-bottom-1`,
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * 图标按钮 + 文字提示的组合，头部工具栏里反复用到。
 * 原来一律靠 title 属性，延迟一秒才出、样式还跟系统走。
 */
const IconTooltip = ({
  label,
  children,
  side = 'bottom',
}: {
  label: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side}>{label}</TooltipContent>
  </Tooltip>
);

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  IconTooltip,
};
