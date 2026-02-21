import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Clock } from 'lucide-react'
import type { RoomType } from '@/lib/user'

import { RecentRoomList } from '@/components/recent-room-list'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRecentRooms } from '@/hooks/useRecentRooms'

function AllRoomsPage() {
	const navigate = useNavigate()
	const { rooms, remove: removeRoom } = useRecentRooms()

	const handleRoomClick = (roomId: string, type: RoomType) => {
		if (type === 'poker') {
			navigate({ to: '/poker/$roomId', params: { roomId } })
		} else {
			navigate({ to: '/chat/$roomId', params: { roomId } })
		}
	}

	return (
		<div className="flex h-dvh flex-col bg-background">
			<header className="flex shrink-0 items-center gap-2 border-b px-4 py-3 sm:px-6">
				<Link to="/">
					<Button variant="ghost" size="icon" className="h-9 w-9">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
					<Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
					<span>最近房间</span>
				</div>
			</header>

			<ScrollArea className="flex-1">
				<div className="mx-auto max-w-lg px-4 py-4 pb-8 sm:px-6">
					{rooms.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							暂无最近房间
						</p>
					) : (
						<RecentRoomList
							rooms={rooms}
							onRoomClick={handleRoomClick}
							onRemoveRoom={removeRoom}
						/>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}

export const Route = createFileRoute('/rooms')({
	component: AllRoomsPage,
})
