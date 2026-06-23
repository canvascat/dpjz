'use client'

import { Html5Qrcode } from 'html5-qrcode'
import { QrCode } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

const SCANNER_ELEMENT_ID = 'dpjz-qr-scanner'

export function ScanRoomSheet({
	open,
	onOpenChange,
	onScanSuccess,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onScanSuccess: (text: string) => void
}) {
	const scannerRef = useRef<Html5Qrcode | null>(null)
	const [error, setError] = useState<string | null>(null)

	const stopScanner = useCallback(async () => {
		const scanner = scannerRef.current
		if (!scanner) return
		try {
			if (scanner.isScanning) await scanner.stop()
		} catch {
			// ignore
		}
		scanner.clear()
		scannerRef.current = null
	}, [])

	useEffect(() => {
		if (!open) {
			stopScanner()
			setError(null)
			return
		}

		setError(null)
		let mounted = true

		const start = async () => {
			const el = document.getElementById(SCANNER_ELEMENT_ID)
			if (!el || !mounted) return
			try {
				const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
				scannerRef.current = scanner
				await scanner.start(
					{ facingMode: 'environment' },
					{
						fps: 10,
						qrbox: { width: 220, height: 220 },
					},
					(decodedText) => {
						if (!mounted || !scannerRef.current) return
						onScanSuccess(decodedText)
						scanner.stop().catch(() => {})
						onOpenChange(false)
					},
					() => {
						// 单帧未识别，忽略
					},
				)
			} catch (e) {
				scannerRef.current = null
				const msg = e instanceof Error ? e.message : String(e)
				setError(
					msg.includes('NotAllowedError') || msg.includes('Permission')
						? '需要相机权限才能扫码'
						: '无法启动相机',
				)
			}
		}

		// 等 Sheet 内容挂载后再创建扫码器
		const t = requestAnimationFrame(() => {
			start()
		})
		return () => {
			mounted = false
			cancelAnimationFrame(t)
			stopScanner()
		}
	}, [open, onScanSuccess, onOpenChange, stopScanner])

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="rounded-t-2xl">
				<SheetHeader className="text-left">
					<SheetTitle className="flex items-center gap-2">
						<QrCode className="h-5 w-5" />
						扫码加入房间
					</SheetTitle>
				</SheetHeader>
				<div className="space-y-3 px-5 pt-4 pb-4">
					<p className="text-sm text-muted-foreground">
						将房间邀请二维码放入框内
					</p>
					<div
						id={SCANNER_ELEMENT_ID}
						className="min-h-[240px] overflow-hidden rounded-lg bg-black"
					/>
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>
			</SheetContent>
		</Sheet>
	)
}
