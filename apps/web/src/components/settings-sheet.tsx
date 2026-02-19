'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import type { ThemePreference } from '@/lib/theme'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
	{ value: 'light', label: '浅色', icon: Sun },
	{ value: 'dark', label: '深色', icon: Moon },
	{ value: 'system', label: '跟随系统', icon: Monitor },
]

export function SettingsSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { theme: current, setTheme } = useTheme()

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="flex flex-col rounded-t-2xl">
				<SheetHeader className="text-left">
					<SheetTitle>设置</SheetTitle>
				</SheetHeader>
				<div className="space-y-3 px-5 pt-4 pb-4">
					<p className="text-sm font-medium text-muted-foreground">主题</p>
					<div className="flex flex-col gap-1">
						{THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
							<Button
								key={value}
								variant={current === value ? 'secondary' : 'ghost'}
								className="h-12 justify-start gap-3 px-4"
								onClick={() => setTheme(value)}
							>
								<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span>{label}</span>
								{current === value && (
									<span className="ml-auto text-xs text-muted-foreground">已选</span>
								)}
							</Button>
						))}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	)
}
