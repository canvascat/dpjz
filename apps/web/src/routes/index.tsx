/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	Calculator,
	Clock,
	MessageCircle,
	QrCode,
	Settings,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { RoomType } from '@/lib/user'

import { ProfileSheet } from '@/components/profile-sheet'
import { ScanRoomSheet } from '@/components/scan-room-sheet'
import { SettingsSheet } from '@/components/settings-sheet'
import { UserAvatar } from '@/components/notion-style-avatar'
import { RecentRoomList } from '@/components/recent-room-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useLocalUser } from '@/hooks/useLocalUser'
import { useRecentRooms } from '@/hooks/useRecentRooms'

/** 生成短随机 ID（6 位字母数字） */
function generateRoomId(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
	let id = ''
	for (let i = 0; i < 6; i++) {
		id += chars[Math.floor(Math.random() * chars.length)]
	}
	return id
}

/** 从粘贴的链接或纯文本中提取 roomId 和 type */
function extractRoom(input: string): { roomId: string; type: RoomType } | null {
	const trimmed = input.trim()
	if (!trimmed) return null

	// 尝试解析完整 URL
	try {
		const url = new URL(trimmed)
		const pokerMatch = url.pathname.match(/\/poker\/([^/]+)/)
		if (pokerMatch) return { roomId: pokerMatch[1], type: 'poker' }
		const chatMatch = url.pathname.match(/\/chat\/([^/]+)/)
		if (chatMatch) return { roomId: chatMatch[1], type: 'chat' }
	} catch {
		// 不是 URL
	}

	// 纯文本默认作为 chat 房间号
	return { roomId: trimmed, type: 'chat' }
}

function HomePage() {
	const navigate = useNavigate()
	const { user } = useLocalUser()
	const { rooms, remove: removeRoom } = useRecentRooms()
	const [joinInput, setJoinInput] = useState('')
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [scanOpen, setScanOpen] = useState(false)
	const [scanPending, setScanPending] = useState(false) // 正在请求相机权限，未同意前不打开抽屉
	const lastScannedRef = useRef<{ text: string; at: number } | null>(null)
	const roomListContainerRef = useRef<HTMLDivElement>(null)
	const [visibleRoomCount, setVisibleRoomCount] = useState(4)

	// 根据剩余高度计算可展示的房间数量
	useEffect(() => {
		const el = roomListContainerRef.current
		if (!el) return
		const CARD_HEIGHT = 72
		const MORE_BUTTON_HEIGHT = 52
		const update = () => {
			const h = el.clientHeight
			const n = Math.max(1, Math.floor((h - MORE_BUTTON_HEIGHT) / CARD_HEIGHT))
			setVisibleRoomCount(n)
		}
		update()
		const observer = new ResizeObserver(update)
		observer.observe(el)
		return () => observer.disconnect()
	}, [])

	const handleCreate = (type: RoomType) => {
		const roomId = generateRoomId()
		if (type === 'poker') {
			navigate({ to: '/poker/$roomId', params: { roomId } })
		} else {
			navigate({ to: '/chat/$roomId', params: { roomId } })
		}
	}

	const handleJoin = () => {
		const result = extractRoom(joinInput)
		if (!result) return
		if (result.type === 'poker') {
			navigate({ to: '/poker/$roomId', params: { roomId: result.roomId } })
		} else {
			navigate({ to: '/chat/$roomId', params: { roomId: result.roomId } })
		}
		setJoinInput('')
	}

	const handleJoinKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleJoin()
	}

	const handleScanClick = async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			toast.error('当前环境不支持相机')
			return
		}
		setScanPending(true)
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			})
			stream.getTracks().forEach((t) => t.stop())
			// 仅用户同意权限后再打开扫码抽屉
			setScanOpen(true)
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e)
			const text =
				msg.includes('NotAllowedError') || msg.includes('Permission')
					? '需要相机权限才能扫码'
					: '无法启动相机'
			toast.error(text)
		} finally {
			setScanPending(false)
		}
	}

	const handleScanSuccess = (text: string) => {
		const now = Date.now()
		const last = lastScannedRef.current
		if (last && last.text === text && now - last.at < 2000) return
		lastScannedRef.current = { text, at: now }
		const result = extractRoom(text)
		if (!result) return
		setScanOpen(false)
		if (result.type === 'poker') {
			navigate({ to: '/poker/$roomId', params: { roomId: result.roomId } })
		} else {
			navigate({ to: '/chat/$roomId', params: { roomId: result.roomId } })
		}
	}

	const navigateToRoom = (roomId: string, type: RoomType) => {
		if (type === 'poker') {
			navigate({ to: '/poker/$roomId', params: { roomId } })
		} else {
			navigate({ to: '/chat/$roomId', params: { roomId } })
		}
	}

	return (
		<div className="flex h-dvh flex-col bg-background">
			{/* 顶部个人信息 + 设置 */}
			<header className="shrink-0 border-b px-4 py-4 sm:px-6">
				<div className="mx-auto flex max-w-lg items-center gap-2">
					<div className="min-w-0 flex-1">
						<ProfileSheet
							trigger={
								<button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted/50 active:bg-muted">
									<UserAvatar
										userId={user.id}
										name={user.nickname}
										avatarColor={user.avatarColor}
										avatarType={user.avatarType}
										notionConfig={user.notionAvatarConfig}
										size="lg"
										className="h-12 w-12 text-lg"
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium">{user.nickname}</p>
										<p className="text-xs text-muted-foreground">
											点击编辑个人信息
										</p>
									</div>
								</button>
							}
						/>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-10 w-10 shrink-0"
						onClick={() => setSettingsOpen(true)}
						aria-label="设置"
					>
						<Settings className="h-5 w-5" />
					</Button>
				</div>
			</header>
			<SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
			<ScanRoomSheet
				open={scanOpen}
				onOpenChange={setScanOpen}
				onScanSuccess={handleScanSuccess}
			/>

			{/* 主要内容：上方固定，仅房间列表可滚动 */}
			<main className="flex min-h-0 flex-1 flex-col">
				{/* 创建房间 + 加入房间（固定不滚动） */}
				<div className="shrink-0 px-4 py-6 sm:px-6">
					<div className="mx-auto max-w-lg space-y-6">
						<div className="grid grid-cols-2 gap-3">
							<Button
								onClick={() => handleCreate('chat')}
								variant="outline"
								className="h-auto flex-col gap-2 py-5"
							>
								<MessageCircle className="h-6 w-6 text-blue-500" />
								<span>创建聊天室</span>
							</Button>
							<Button
								onClick={() => handleCreate('poker')}
								variant="outline"
								className="h-auto flex-col gap-2 py-5"
							>
								<Calculator className="h-6 w-6 text-amber-500" />
								<span>创建记账房</span>
							</Button>
						</div>
						<div className="space-y-2.5">
							<label className="block text-sm font-medium text-muted-foreground">
								加入已有房间
							</label>
							<div className="flex gap-2">
								<Input
									value={joinInput}
									onChange={(e) => setJoinInput(e.target.value)}
									onKeyDown={handleJoinKeyDown}
									placeholder="粘贴链接或输入房间号"
									className="min-h-[44px] flex-1 text-base"
								/>
								<Button
									onClick={handleScanClick}
									disabled={scanPending}
									variant="outline"
									size="icon"
									className="min-h-[44px] min-w-[44px] shrink-0"
									aria-label="扫码加入"
								>
									{scanPending ? (
										<span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
									) : (
										<QrCode className="h-5 w-5" />
									)}
								</Button>
								<Button
									onClick={handleJoin}
									disabled={!joinInput.trim()}
									variant="outline"
									className="min-h-[44px] shrink-0 px-5"
								>
									加入
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* 最近房间：根据剩余高度展示若干条，超出显示「更多房间」 */}
				{rooms.length > 0 && (
					<div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6">
						<Separator className="shrink-0" />
						<div className="mx-auto flex w-full max-w-lg shrink-0 items-center gap-2 py-3 text-sm font-medium text-muted-foreground">
							<Clock className="h-4 w-4" />
							<span>最近房间</span>
						</div>
						<div
							ref={roomListContainerRef}
							className="min-h-0 flex-1 overflow-hidden"
						>
							<div className="mx-auto max-w-lg pb-2">
								<RecentRoomList
									rooms={rooms}
									onRoomClick={navigateToRoom}
									onRemoveRoom={removeRoom}
									maxVisible={visibleRoomCount}
									onMoreClick={() => navigate({ to: '/rooms' })}
								/>
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	)
}

export const Route = createFileRoute('/')({ component: HomePage })
