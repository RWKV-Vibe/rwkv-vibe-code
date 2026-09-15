'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/cn';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'end', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        `z-50 rounded-xl border border-gray-200 bg-white p-1 shadow-lg outline-none
         dark:border-white/10 dark:bg-[#2a2a2a]`,
        `animate-in fade-in-0 zoom-in-95
         data-[state=closed]:animate-out data-[state=closed]:fade-out-0
         data-[state=closed]:zoom-out-95
         data-[side=bottom]:slide-in-from-top-1
         data-[side=top]:slide-in-from-bottom-1`,
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
