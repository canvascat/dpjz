/** 剪切板「同意且不再询问」：按房间 + 对方 userId 持久化到 localStorage */

const STORAGE_KEY = 'dpjz-clipboard-auto-allow'

function loadKeys(): Array<string> {
	if (typeof window === 'undefined') return []
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw) as unknown
		return Array.isArray(parsed)
			? parsed.filter((k) => typeof k === 'string')
			: []
	} catch {
		return []
	}
}

function saveKeys(keys: Array<string>) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
	} catch {
		// ignore
	}
}

function key(roomId: string, userId: string): string {
	return `${roomId}:${userId}`
}

export function isClipboardAutoAllow(
	roomId: string,
	fromUserId: string,
): boolean {
	const keys = loadKeys()
	return keys.includes(key(roomId, fromUserId))
}

export function addClipboardAutoAllow(
	roomId: string,
	fromUserId: string,
): void {
	const keys = loadKeys()
	const k = key(roomId, fromUserId)
	if (keys.includes(k)) return
	keys.push(k)
	saveKeys(keys)
}
