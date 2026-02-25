import { Calculator, Clock, MessageCircle, Trash2 } from 'lucide-react'
import type { RecentRoom, RoomType } from '@/lib/user'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'

export function formatTime(ts: number): string {
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

interface RecentRoomListProps {
	rooms: Array<RecentRoom>
	onRoomClick: (roomId: string, type: RoomType) => void
	onRemoveRoom: (roomId: string) => void
	/** 最多展示条数，超出时显示「更多房间」按钮 */
	maxVisible?: number
	/** 点击「更多房间」时调用 */
	onMoreClick?: () => void
}

export function RecentRoomList({
	rooms,
	onRoomClick,
	onRemoveRoom,
	maxVisible,
	onMoreClick,
}: RecentRoomListProps) {
	const showMore =
		maxVisible != null && rooms.length > maxVisible && onMoreClick
	const displayRooms = showMore ? rooms.slice(0, maxVisible) : rooms

	return (
		<div className="space-y-2.5">
			{displayRooms.map((room) => {
				const type: RoomType = room.type
				const meta = ROOM_TYPE_META[type]
				const Icon = meta.icon

				return (
					<Card
						key={room.id}
						className="flex cursor-pointer flex-row items-center gap-3 rounded-xl border p-3 py-3 shadow-none transition-colors hover:bg-muted/50 active:bg-muted"
						onClick={() => onRoomClick(room.id, type)}
					>
						<div
							className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
						>
							<Icon className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<CardTitle className="truncate text-sm">{room.id}</CardTitle>
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
								onRemoveRoom(room.id)
							}}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</Card>
				)
			})}
			{showMore && (
				<Button variant="outline" className="w-full" onClick={onMoreClick}>
					更多房间
				</Button>
			)}
		</div>
	)
}
