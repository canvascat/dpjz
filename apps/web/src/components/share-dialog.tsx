import { Check, Copy, QrCode, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useState } from 'react'

import type { RoomType } from '@/lib/user'
import { Input } from '@/components/ui/input'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ShareDialogProps {
	roomId: string
	/** 房间类型，默认 chat */
	roomType?: RoomType
	/** 触发器按钮内容（可选，默认显示图标按钮） */
	trigger?: React.ReactNode
}

export function ShareDialog({
	roomId,
	roomType = 'chat',
	trigger,
}: ShareDialogProps) {
	const [copied, setCopied] = useState(false)

	const shareUrl =
		typeof window !== 'undefined'
			? `${window.location.origin}/${roomType}/${roomId}`
			: ''

	const handleCopy = useCallback(async () => {
		if (!shareUrl) return
		try {
			await navigator.clipboard.writeText(shareUrl)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// fallback
			const input = document.createElement('input')
			input.value = shareUrl
			document.body.appendChild(input)
			input.select()
			document.execCommand('copy')
			document.body.removeChild(input)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}, [shareUrl])

	const handleShare = useCallback(async () => {
		// Runtime check: share API not in all environments
		if (typeof navigator !== 'undefined' && 'share' in navigator) {
			try {
				await navigator.share({
					title: `加入聊天室 ${roomId}`,
					url: shareUrl,
				})
			} catch {
				// 用户取消分享
			}
		} else {
			handleCopy()
		}
	}, [roomId, shareUrl, handleCopy])

	return (
		<Dialog>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button variant="ghost" size="icon" className="h-9 w-9">
						<Share2 className="h-4 w-4" />
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>邀请他人加入</DialogTitle>
					<DialogDescription>
						分享下面的链接或二维码给好友，即可加入聊天室
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* 二维码 */}
					<div className="flex justify-center">
						<div className="rounded-xl border bg-white p-4">
							<QRCodeSVG value={shareUrl} size={200} level="M" />
						</div>
					</div>

					{/* 链接 */}
					<div className="flex items-center gap-2">
						<Input value={shareUrl} readOnly className="text-sm" />
						<Button
							variant="outline"
							size="icon"
							className="shrink-0"
							onClick={handleCopy}
						>
							{copied ? (
								<Check className="h-4 w-4 text-green-500" />
							) : (
								<Copy className="h-4 w-4" />
							)}
						</Button>
					</div>

					{/* 系统分享 */}
					{'share' in navigator && (
						<Button onClick={handleShare} className="w-full gap-2">
							<Share2 className="h-4 w-4" />
							分享给好友
						</Button>
					)}

					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<QrCode className="h-3.5 w-3.5" />
						<span>让好友扫描二维码或打开链接即可加入</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
