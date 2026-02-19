/** 本地用户身份模块 — 基于 localStorage 持久化 */

import type { NotionAvatarConfig } from '@/lib/notion-avatar'

const STORAGE_KEY = 'dpjz-local-user'

/** 预设头像颜色 */
export const AVATAR_COLORS = [
	'#3b82f6', // blue-500
	'#10b981', // emerald-500
	'#8b5cf6', // violet-500
	'#ec4899', // pink-500
	'#f59e0b', // amber-500
	'#06b6d4', // cyan-500
	'#ef4444', // red-500
	'#84cc16', // lime-500
] as const

export type AvatarType = 'text' | 'notion'

export interface LocalUser {
	/** 唯一标识（UUID） */
	id: string
	/** 昵称 */
	nickname: string
	/** 头像类型：文本（首字母+颜色）或 Notion 风格 */
	avatarType: AvatarType
	/** 头像背景色（hex），文本头像时使用 */
	avatarColor: string
	/** Notion 风格头像各部件索引，仅当 avatarType 为 notion 时使用 */
	notionAvatarConfig?: NotionAvatarConfig
}

/** 随机取一个头像颜色 */
function randomAvatarColor(): string {
	return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

/** 生成随机昵称 */
function randomNickname(): string {
	const adjectives = [
		'快乐的',
		'勇敢的',
		'聪明的',
		'可爱的',
		'神秘的',
		'阳光的',
		'优雅的',
		'灵动的',
	]
	const nouns = [
		'小猫',
		'小狗',
		'兔子',
		'狐狸',
		'熊猫',
		'企鹅',
		'独角兽',
		'小龙',
	]
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
	const noun = nouns[Math.floor(Math.random() * nouns.length)]
	return `${adj}${noun}`
}

/**
 * 获取本地用户信息，不存在则自动创建
 */
export function getLocalUser(): LocalUser {
	if (typeof window === 'undefined') {
		return {
			id: '',
			nickname: '',
			avatarType: 'text',
			avatarColor: AVATAR_COLORS[0],
		}
	}

	const raw = localStorage.getItem(STORAGE_KEY)
	if (raw) {
		try {
			const parsed = JSON.parse(raw) as LocalUser & { avatarType?: AvatarType }
			if (parsed.id && parsed.nickname && parsed.avatarColor) {
				const rawType = (parsed as { avatarType?: AvatarType }).avatarType
				const avatarType: AvatarType =
					rawType === 'text' || rawType === 'notion'
						? rawType
						: (parsed.notionAvatarConfig ? 'notion' : 'text')
				return {
					...parsed,
					avatarType,
					notionAvatarConfig: parsed.notionAvatarConfig,
				}
			}
		} catch {
			// 解析失败，重建
		}
	}

	// 首次访问，自动生成
	const user: LocalUser = {
		id: crypto.randomUUID(),
		nickname: randomNickname(),
		avatarType: 'text',
		avatarColor: randomAvatarColor(),
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
	return user
}

/**
 * 更新本地用户信息（合并更新）
 */
export function updateLocalUser(
	updates: Partial<Omit<LocalUser, 'id'>>,
): LocalUser {
	const current = getLocalUser()
	const updated: LocalUser = {
		...current,
		...updates,
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
	// 通知其他监听者
	window.dispatchEvent(
		new CustomEvent('local-user-changed', { detail: updated }),
	)
	return updated
}

/** 房间类型 */
export type RoomType = 'chat' | 'poker'

/** 最近房间记录 */
export interface RecentRoom {
	id: string
	/** 房间类型 */
	type: RoomType
	/** 最后访问时间 */
	lastVisited: number
}

const ROOMS_STORAGE_KEY = 'dpjz-recent-rooms'

/** 获取最近访问的房间列表（按时间倒序，最多保留 20 条） */
export function getRecentRooms(): Array<RecentRoom> {
	if (typeof window === 'undefined') return []
	try {
		const raw = localStorage.getItem(ROOMS_STORAGE_KEY)
		if (!raw) return []
		return JSON.parse(raw) as Array<RecentRoom>
	} catch {
		return []
	}
}

/** 记录访问房间 */
export function addRecentRoom(roomId: string, type: RoomType = 'chat'): void {
	if (typeof window === 'undefined') return
	const rooms = getRecentRooms().filter((r) => r.id !== roomId)
	rooms.unshift({ id: roomId, type, lastVisited: Date.now() })
	// 最多保留 20 条
	localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms.slice(0, 20)))
	window.dispatchEvent(new CustomEvent('recent-rooms-changed'))
}

/** 删除一条最近房间记录 */
export function removeRecentRoom(roomId: string): void {
	if (typeof window === 'undefined') return
	const rooms = getRecentRooms().filter((r) => r.id !== roomId)
	localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms))
	window.dispatchEvent(new CustomEvent('recent-rooms-changed'))
}
