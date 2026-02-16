import { useCallback, useEffect, useState } from 'react'

import type { RecentRoom, RoomType } from '@/lib/user'

import { addRecentRoom, getRecentRooms, removeRecentRoom } from '@/lib/user'

/**
 * 响应式的最近房间 hook
 */
export function useRecentRooms() {
	const [rooms, setRooms] = useState<Array<RecentRoom>>(() => getRecentRooms())

	useEffect(() => {
		setRooms(getRecentRooms())

		const handler = () => setRooms(getRecentRooms())
		window.addEventListener('recent-rooms-changed', handler)
		return () => window.removeEventListener('recent-rooms-changed', handler)
	}, [])

	const add = useCallback((roomId: string, type: RoomType = 'chat') => {
		addRecentRoom(roomId, type)
		setRooms(getRecentRooms())
	}, [])

	const remove = useCallback((roomId: string) => {
		removeRecentRoom(roomId)
		setRooms(getRecentRooms())
	}, [])

	return { rooms, add, remove }
}
