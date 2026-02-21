'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Monitor, Moon, Sun, Wifi } from 'lucide-react'
import type { ThemePreference } from '@/lib/theme'
import {
	getCustomSignalingUrl,
	getDefaultSignalingUrl,
	getSignalingUrls,
	setCustomSignalingUrl,
} from '@/lib/constants'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

function currentSignalingDisplay(): string {
	const url = getSignalingUrls()[0]
	if (url) return url
	return getDefaultSignalingUrl() ? '默认' : '未配置'
}

export function SettingsSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { theme: current, setTheme } = useTheme()
	const [signalingDisplay, setSignalingDisplay] = useState('')
	const [editOpen, setEditOpen] = useState(false)
	const [editValue, setEditValue] = useState('')

	const refreshDisplay = useCallback(() => {
		setSignalingDisplay(currentSignalingDisplay())
	}, [])

	useEffect(() => {
		if (open) {
			refreshDisplay()
		}
	}, [open, refreshDisplay])

	const openEdit = () => {
		setEditValue(getCustomSignalingUrl())
		setEditOpen(true)
	}

	const handleEditSave = () => {
		setCustomSignalingUrl(editValue)
		refreshDisplay()
		setEditOpen(false)
	}

	const handleEditReset = () => {
		setCustomSignalingUrl('')
		setEditValue('')
		refreshDisplay()
		setEditOpen(false)
	}

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="bottom" className="flex flex-col rounded-t-2xl">
					<SheetHeader className="text-left">
						<SheetTitle>设置</SheetTitle>
					</SheetHeader>
					<div className="space-y-6 px-5 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
						<div className="space-y-3">
							<p className="text-sm font-medium text-muted-foreground">主题</p>
							<div className="flex flex-col gap-1">
								{THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
									<Button
										key={value}
										variant={current === value ? 'secondary' : 'ghost'}
										className="h-12 min-h-[44px] justify-start gap-3 px-4"
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
						<div className="space-y-2">
							<p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
								<Wifi className="h-4 w-4" />
								信令服务器
							</p>
							<Button
								variant="ghost"
								className="h-12 min-h-[44px] w-full justify-between gap-2 px-4 font-normal"
								onClick={openEdit}
							>
								<span className="truncate text-left text-muted-foreground">
									{signalingDisplay}
								</span>
								<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent showCloseButton className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>编辑信令服务器</DialogTitle>
					</DialogHeader>
					<div>
						<Input
							aria-label="信令服务器地址"
							type="url"
							inputMode="url"
							autoComplete="off"
							placeholder={getDefaultSignalingUrl() || 'wss://…'}
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							className="min-h-[44px]"
						/>
					</div>
					<DialogFooter showCloseButton={false} className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={handleEditReset}>
							恢复默认
						</Button>
						<Button onClick={handleEditSave}>确定</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
