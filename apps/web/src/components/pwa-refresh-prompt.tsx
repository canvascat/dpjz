'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { onPwaNeedRefresh, pwaApplyUpdate } from '@/lib/pwa'
import { Button } from '@/components/ui/button'

/**
 * PWA 有新版本时在页面底部显示「发现新版本，点击刷新」条，点击后执行 skipWaiting 并刷新
 */
export function PwaRefreshPrompt() {
	const [show, setShow] = useState(false)
	const [refreshing, setRefreshing] = useState(false)

	useEffect(() => {
		const unsub = onPwaNeedRefresh(() => setShow(true))
		return unsub
	}, [])

	const handleRefresh = () => {
		setRefreshing(true)
		pwaApplyUpdate()
	}

	if (!show) return null

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<Loader2
				className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
				aria-hidden
			/>
			<span className="text-sm text-foreground">发现新版本</span>
			<Button
				size="sm"
				onClick={handleRefresh}
				disabled={refreshing}
			>
				{refreshing ? (
					<>
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						刷新中…
					</>
				) : (
					'点击刷新'
				)}
			</Button>
		</div>
	)
}
