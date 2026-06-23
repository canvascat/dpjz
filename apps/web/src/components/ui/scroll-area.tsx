'use client'

import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

const ScrollArea = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		ref={ref}
		className={cn('relative flex overflow-hidden', className)}
		{...props}
	>
		<ScrollAreaPrimitive.Viewport className="min-h-0 flex-1 rounded-[inherit] [&>div]:!block [&>div]:h-full [&>div]:min-h-full">
			{children}
		</ScrollAreaPrimitive.Viewport>
		<ScrollAreaPrimitive.Scrollbar
			className="flex shrink-0 touch-none select-none transition-colors"
			orientation="vertical"
		>
			<ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
		</ScrollAreaPrimitive.Scrollbar>
		<ScrollAreaPrimitive.Corner />
	</ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = 'ScrollArea'

const ScrollBar = ScrollAreaPrimitive.Scrollbar
const ScrollAreaViewport = ScrollAreaPrimitive.Viewport
const ScrollAreaThumb = ScrollAreaPrimitive.Thumb

export { ScrollArea, ScrollBar, ScrollAreaViewport, ScrollAreaThumb }
