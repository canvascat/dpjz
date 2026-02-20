/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Calculator, Clock, MessageCircle, QrCode, Settings, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { RoomType } from '@/lib/user'

import { ProfileSheet } from '@/components/profile-sheet'
import { ScanRoomSheet } from '@/components/scan-room-sheet'
import { SettingsSheet } from '@/components/settings-sheet'
import { UserAvatar } from '@/components/notion-style-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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

function formatTime(ts: number): string {
	const now = Date.now()
	const diff = now - ts
	if (diff < 60_000) return '刚刚'
	if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
	if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
	const d = new Date(ts)
	return `${d.getMonth() + 1}/${d.getDate()}`
}

const ROOM_TYPE_META: Record<
	RoomType,
	{ icon: typeof MessageCircle; label: string; color: string }
> = {
	chat: {
		icon: MessageCircle,
		label: '聊天室',
		color: 'bg-blue-500/10 text-blue-600',
	},
	poker: {
		icon: Calculator,
		label: '记账房',
		color: 'bg-amber-500/10 text-amber-600',
	},
}

function HomePage() {
	const navigate = useNavigate()
	const { user } = useLocalUser()
	const { rooms, remove: removeRoom } = useRecentRooms()
	const [joinInput, setJoinInput] = useState('')
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [scanOpen, setScanOpen] = useState(false)
	const lastScannedRef = useRef<{ text: string; at: number } | null>(null)

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

	const handleScanSuccess = (text: string) => {
		const now = Date.now()
		const last = lastScannedRef.current
		if (last && last.text === text && now - last.at < 2000) return
		lastScannedRef.current = { text, at: now }
		const result = extractRoom(text)
		if (!result) return
		if (result.type === 'poker') {
			navigate({ to: '/poker/$roomId', params: { roomId: result.roomId } })
		} else {
			navigate({ to: '/chat/$roomId', params: { roomId: result.roomId } })
		}
		setScanOpen(false)
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
									onClick={() => setScanOpen(true)}
									variant="outline"
									size="icon"
									className="min-h-[44px] min-w-[44px] shrink-0"
									aria-label="扫码加入"
								>
									<QrCode className="h-5 w-5" />
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

				{/* 最近房间：仅此区域可滚动，左右边距与上方一致 */}
				{rooms.length > 0 && (
					<div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6">
						<Separator className="shrink-0" />
						<div className="mx-auto flex w-full max-w-lg shrink-0 items-center gap-2 py-3 text-sm font-medium text-muted-foreground">
							<Clock className="h-4 w-4" />
							<span>最近房间</span>
						</div>
						<ScrollArea className="min-h-0 flex-1 w-full">
							<div className="mx-auto max-w-lg space-y-2.5 pb-2">
								{rooms.map((room) => {
									const type: RoomType = room.type || 'chat'
									const meta = ROOM_TYPE_META[type]
									const Icon = meta.icon

									return (
										<Card
											key={room.id}
											className="flex cursor-pointer flex-row items-center gap-3 rounded-xl border p-3 py-3 shadow-none transition-colors hover:bg-muted/50 active:bg-muted"
											onClick={() => navigateToRoom(room.id, type)}
										>
											<div
												className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
											>
												<Icon className="h-5 w-5" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<CardTitle className="truncate text-sm">
														{room.id}
													</CardTitle>
													<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
														{meta.label}
													</span>
												</div>
												<CardDescription className="text-xs">
													{formatTime(room.lastVisited)}
												</CardDescription>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
												onClick={(e) => {
													e.stopPropagation()
													removeRoom(room.id)
												}}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</Card>
									)
								})}
							</div>
						</ScrollArea>
					</div>
				)}
			</main>

			{/* 底部说明 */}
			<footer className="shrink-0 border-t pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-center text-xs text-muted-foreground">
				P2P 模式 · 数据通过 WebRTC 直接传输 · 本地 IndexedDB 持久化
			</footer>
		</div>
	)
}

export const Route = createFileRoute('/')({ component: HomePage })
