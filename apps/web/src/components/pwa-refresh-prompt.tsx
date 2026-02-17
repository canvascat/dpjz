'use client'

import { useEffect, useState } from 'react'
import { onPwaNeedRefresh, pwaApplyUpdate } from '@/lib/pwa'
import { Button } from '@/components/ui/button'

/**
 * PWA 有新版本时在页面底部显示「发现新版本，点击刷新」条，点击后执行 skipWaiting 并刷新
 */
export function PwaRefreshPrompt() {
	const [show, setShow] = useState(false)

	useEffect(() => {
		const unsub = onPwaNeedRefresh(() => setShow(true))
		return unsub
	}, [])

	const handleRefresh = () => {
		pwaApplyUpdate()
		setShow(false)
	}

	if (!show) return null

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3 border-t bg-background/95 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<span className="text-sm text-foreground">发现新版本</span>
			<Button size="sm" onClick={handleRefresh}>
				点击刷新
			</Button>
		</div>
	)
}
