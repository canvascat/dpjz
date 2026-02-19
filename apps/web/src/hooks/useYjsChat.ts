import { useCallback, useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import type { IndexeddbPersistence } from 'y-indexeddb'
import type { WebrtcProvider } from 'y-webrtc'

import type { LocalUser } from '@/lib/user'
import type { NotionAvatarConfig } from '@/lib/notion-avatar'

/** 聊天消息数据结构 */
export interface ChatMessage {
	id: string
	text: string
	userId: string
	nickname: string
	avatarColor: string
	avatarType?: 'text' | 'notion'
	notionAvatarConfig?: NotionAvatarConfig
	timestamp: number
}

/** awareness 中的成员信息 */
export interface PeerInfo {
	userId: string
	nickname: string
	avatarColor: string
	avatarType?: 'text' | 'notion'
	notionAvatarConfig?: NotionAvatarConfig
}

/** 针对自己的剪切板请求（用于弹窗同意/拒绝） */
export interface PendingClipboardRequest {
	requestId: string
	fromUserId: string
	fromNickname: string
}

/** 收到的剪切板内容（我发起的请求得到的响应） */
export interface ReceivedClipboard {
	requestId: string
	content: string
	fromNickname: string
}

interface UseYjsChatReturn {
	messages: Array<ChatMessage>
	sendMessage: (text: string) => void
	/** 在线成员列表（含自己） */
	peers: Array<PeerInfo>
	peerCount: number
	connected: boolean
	/** 请求读取某人的剪切板（toNickname 用于收到响应时展示） */
	requestClipboard: (toUserId: string, toNickname: string) => void
	/** 针对自己的待处理剪切板请求 */
	pendingClipboardRequests: Array<PendingClipboardRequest>
	/** 同意并发送剪切板 / 拒绝请求 */
	respondToClipboardRequest: (
		requestId: string,
		accept: boolean,
	) => Promise<void>
	/** 收到的剪切板内容（我请求后对方同意发来的） */
	receivedClipboard: ReceivedClipboard | null
	/** 消费并清除已展示的剪切板响应，并从 Yjs 删除 */
	consumeClipboardResponse: () => void
}

/**
 * 增强版 Yjs P2P 聊天 hook
 * 支持 userId 身份标识、awareness 在线成员信息
 */
export function useYjsChat(
	roomId: string,
	localUser: LocalUser,
): UseYjsChatReturn {
	const [messages, setMessages] = useState<Array<ChatMessage>>([])
	const [peers, setPeers] = useState<Array<PeerInfo>>([])
	const [connected, setConnected] = useState(false)
	const [pendingClipboardRequests, setPendingClipboardRequests] = useState<
		Array<PendingClipboardRequest>
	>([])
	const [receivedClipboard, setReceivedClipboard] =
		useState<ReceivedClipboard | null>(null)

	// 用 ref 持有可变引用，避免 effect 依赖抖动
	const localUserRef = useRef(localUser)
	localUserRef.current = localUser
	const myRequestIdsRef = useRef<Set<string>>(new Set())
	const myPendingRequestsRef = useRef<Map<string, { toNickname: string }>>(
		new Map(),
	)
	const receivedClipboardRef = useRef<ReceivedClipboard | null>(null)
	receivedClipboardRef.current = receivedClipboard

	const yjsRef = useRef<
		Partial<{
			doc: Y.Doc
			messagesArray: Y.Array<Y.Map<string | number>>
			clipboardRequests: Y.Map<unknown>
			clipboardResponses: Y.Map<unknown>
			webrtcProvider: WebrtcProvider
			indexeddbProvider: IndexeddbPersistence
		}>
	>({})

	useEffect(() => {
		if (typeof window === 'undefined' || !roomId) return

		let disposed = false
		const doc = new Y.Doc()
		const messagesArray = doc.getArray<Y.Map<string | number>>('messages')
		const clipboardRequests = doc.getMap<Y.Map<string | number>>(
			'clipboardRequests',
		)
		const clipboardResponses = doc.getMap('clipboardResponses')

		const parseNotionConfig = (
			raw: unknown,
		): NotionAvatarConfig | undefined => {
			if (!raw || typeof raw !== 'string') return undefined
			try {
				const o = JSON.parse(raw) as NotionAvatarConfig
				return o && typeof o.face === 'number' ? o : undefined
			} catch {
				return undefined
			}
		}

		const readMessages = (): Array<ChatMessage> => {
			const msgs: Array<ChatMessage> = []
			messagesArray.forEach((yMap) => {
				msgs.push({
					id: yMap.get('id') as string,
					text: yMap.get('text') as string,
					userId: yMap.get('userId') as string,
					nickname: yMap.get('nickname') as string,
					avatarColor: (yMap.get('avatarColor') as string) || '#3b82f6',
					avatarType: (yMap.get('avatarType') as 'text' | 'notion') || 'text',
					notionAvatarConfig: parseNotionConfig(yMap.get('notionAvatarConfig')),
					timestamp: yMap.get('timestamp') as number,
				})
			})
			msgs.sort((a, b) => a.timestamp - b.timestamp)
			return msgs
		}

		// 直接在 effect 内注册 observer —— 保证与 cleanup 配对
		const observer = () => {
			setMessages(readMessages())
		}
		messagesArray.observeDeep(observer)

		// 立即读取一次（IndexedDB 可能已有本地缓存）
		setMessages(readMessages())

		const notifiedRequestIdsRef = { current: new Set<string>() }
		const readPendingRequests = () => {
			const list: Array<PendingClipboardRequest> = []
			clipboardRequests.forEach((val, requestId) => {
				const yMap = val as Y.Map<string | number>
				const toUserId = yMap.get('toUserId') as string
				if (toUserId === localUserRef.current.id) {
					list.push({
						requestId,
						fromUserId: yMap.get('fromUserId') as string,
						fromNickname: yMap.get('fromNickname') as string,
					})
				}
			})
			if (!disposed) {
				setPendingClipboardRequests(list)
				// 可选优化：页面在后台时用 Notification 提醒
				if (
					list.length > 0 &&
					typeof document !== 'undefined' &&
					document.visibilityState === 'hidden' &&
					'Notification' in window
				) {
					const first = list[0]
					if (!notifiedRequestIdsRef.current.has(first.requestId)) {
						notifiedRequestIdsRef.current.add(first.requestId)
						if (Notification.permission === 'granted') {
							new Notification('读取剪切板请求', {
								body: `${first.fromNickname} 请求读取你的剪切板`,
							})
						} else if (Notification.permission === 'default') {
							Notification.requestPermission().then((p) => {
								if (p === 'granted' && !disposed) {
									new Notification('读取剪切板请求', {
										body: `${first.fromNickname} 请求读取你的剪切板`,
									})
								}
							})
						}
					}
				}
			}
		}
		const observerRequests = () => {
			readPendingRequests()
		}
		clipboardRequests.observe(observerRequests)
		readPendingRequests()

		const checkResponses = () => {
			if (!disposed) {
				clipboardResponses.forEach((content, requestId) => {
					if (myRequestIdsRef.current.has(requestId)) {
						const toNickname =
							myPendingRequestsRef.current.get(requestId)?.toNickname ?? '对方'
						myRequestIdsRef.current.delete(requestId)
						myPendingRequestsRef.current.delete(requestId)
						setReceivedClipboard({
							requestId,
							content: String(content),
							fromNickname: toNickname,
						})
					}
				})
			}
		}
		clipboardResponses.observe(checkResponses)
		checkResponses()

		// 可选优化：超时未响应的请求从 clipboardRequests 移除（2 分钟）
		const CLIPBOARD_REQUEST_TTL_MS = 120_000
		const cleanupStaleRequests = () => {
			if (disposed) return
			const now = Date.now()
			const toDelete: string[] = []
			clipboardRequests.forEach((val, requestId) => {
				const yMap = val as Y.Map<string | number>
				const createdAt = yMap.get('createdAt') as number | undefined
				if (
					typeof createdAt === 'number' &&
					now - createdAt > CLIPBOARD_REQUEST_TTL_MS
				) {
					toDelete.push(requestId)
				}
			})
			if (toDelete.length > 0) {
				doc.transact(() => {
					for (const id of toDelete) {
						clipboardRequests.delete(id)
					}
				})
			}
		}
		const staleCleanupInterval = setInterval(cleanupStaleRequests, 30_000)
		cleanupStaleRequests()

		// 保存到 ref 供 sendMessage / clipboard 使用
		yjsRef.current = {
			doc,
			messagesArray,
			clipboardRequests: clipboardRequests as Y.Map<unknown>,
			clipboardResponses: clipboardResponses as Y.Map<unknown>,
		}

		// 异步初始化 providers
		const initProviders = async () => {
			const [{ IndexeddbPersistence }, { WebrtcProvider }] = await Promise.all([
				import('y-indexeddb'),
				import('y-webrtc'),
			])

			// effect 已清理则不再初始化
			if (disposed) return

			const indexeddbProvider = new IndexeddbPersistence(
				`dpjz-chat-${roomId}`,
				doc,
			)

			const webrtcProvider = new WebrtcProvider(`dpjz-chat-${roomId}`, doc, {
				signaling: [import.meta.env.VITE_SIGNALING_URL],
			})

			// 设置 awareness
			const user = localUserRef.current
			webrtcProvider.awareness.setLocalStateField('user', {
				userId: user.id,
				nickname: user.nickname,
				avatarColor: user.avatarColor,
				avatarType: user.avatarType,
				notionAvatarConfig: user.notionAvatarConfig,
			})

			const updatePeers = () => {
				const states = webrtcProvider.awareness.getStates()
				const peerList: Array<PeerInfo> = []
				states.forEach((state) => {
					if (state.user) {
						peerList.push(state.user as PeerInfo)
					}
				})
				setPeers(peerList)
			}

			webrtcProvider.on('synced', () => {
				if (!disposed) {
					setConnected(true)
					// synced 后刷新一次消息（远端数据可能已到达）
					setMessages(readMessages())
				}
			})

			webrtcProvider.awareness.on('change', () => {
				if (!disposed) updatePeers()
			})
			updatePeers()

			yjsRef.current = {
				doc,
				indexeddbProvider,
				messagesArray,
				webrtcProvider,
				clipboardRequests: clipboardRequests as Y.Map<unknown>,
				clipboardResponses: clipboardResponses as Y.Map<unknown>,
			}

			// IndexedDB 加载完成后也刷新一次
			indexeddbProvider.on('synced', () => {
				if (!disposed) setMessages(readMessages())
			})
		}

		initProviders()

		return () => {
			disposed = true
			clearInterval(staleCleanupInterval)
			messagesArray.unobserveDeep(observer)
			clipboardRequests.unobserve(observerRequests)
			clipboardResponses.unobserve(checkResponses)
			yjsRef.current.webrtcProvider?.destroy()
			yjsRef.current.indexeddbProvider?.destroy()
			doc.destroy()
			yjsRef.current = {}
			setConnected(false)
			setPeers([] as Array<PeerInfo>)
			setPendingClipboardRequests([])
			setReceivedClipboard(null)
			myRequestIdsRef.current.clear()
			myPendingRequestsRef.current.clear()
		}
	}, [roomId])

	// 当 localUser 信息变化时，更新 awareness
	useEffect(() => {
		const provider = yjsRef.current.webrtcProvider
		if (provider) {
			provider.awareness.setLocalStateField('user', {
				userId: localUser.id,
				nickname: localUser.nickname,
				avatarColor: localUser.avatarColor,
				avatarType: localUser.avatarType,
				notionAvatarConfig: localUser.notionAvatarConfig,
			})
		}
	}, [
		localUser.id,
		localUser.nickname,
		localUser.avatarColor,
		localUser.avatarType,
		JSON.stringify(localUser.notionAvatarConfig),
	])

	const sendMessage = useCallback((text: string) => {
		const { doc, messagesArray } = yjsRef.current
		if (!doc || !messagesArray || !text.trim()) return

		const user = localUserRef.current
		doc.transact(() => {
			const yMap = new Y.Map<string | number>()
			yMap.set('id', crypto.randomUUID())
			yMap.set('text', text.trim())
			yMap.set('userId', user.id)
			yMap.set('nickname', user.nickname)
			yMap.set('avatarColor', user.avatarColor)
			yMap.set('avatarType', user.avatarType)
			if (user.notionAvatarConfig) {
				yMap.set('notionAvatarConfig', JSON.stringify(user.notionAvatarConfig))
			}
			yMap.set('timestamp', Date.now())
			messagesArray.push([yMap])
		})
	}, [])

	const requestClipboard = useCallback(
		(toUserId: string, toNickname: string) => {
			const { doc, clipboardRequests } = yjsRef.current
			if (!doc || !clipboardRequests) return
			const requestId = crypto.randomUUID()
			const user = localUserRef.current
			doc.transact(() => {
				const yMap = new Y.Map<string | number>()
				yMap.set('fromUserId', user.id)
				yMap.set('fromNickname', user.nickname)
				yMap.set('toUserId', toUserId)
				yMap.set('createdAt', Date.now())
				clipboardRequests.set(requestId, yMap)
			})
			myRequestIdsRef.current.add(requestId)
			myPendingRequestsRef.current.set(requestId, { toNickname })
		},
		[],
	)

	const respondToClipboardRequest = useCallback(
		async (requestId: string, accept: boolean) => {
			const { doc, clipboardRequests, clipboardResponses } = yjsRef.current
			if (!doc || !clipboardRequests || !clipboardResponses) return
			const yMap = clipboardRequests.get(requestId) as
				| Y.Map<string | number>
				| undefined
			if (!yMap) return
			if (!accept) {
				doc.transact(() => {
					clipboardRequests.delete(requestId)
				})
				return
			}
			try {
				const content = await navigator.clipboard.readText()
				doc.transact(() => {
					clipboardResponses.set(requestId, content)
					clipboardRequests.delete(requestId)
				})
			} catch {
				// 权限或非安全上下文失败，仅删除请求
				doc.transact(() => {
					clipboardRequests.delete(requestId)
				})
				throw new Error('CLIPBOARD_READ_FAILED')
			}
		},
		[],
	)

	const consumeClipboardResponse = useCallback(() => {
		const { doc, clipboardResponses } = yjsRef.current
		const current = receivedClipboardRef.current
		if (!current || !doc || !clipboardResponses) return
		doc.transact(() => {
			clipboardResponses.delete(current.requestId)
		})
		setReceivedClipboard(null)
	}, [])

	return {
		messages,
		sendMessage,
		peers,
		peerCount: peers.length || 1,
		connected,
		requestClipboard,
		pendingClipboardRequests,
		respondToClipboardRequest,
		receivedClipboard,
		consumeClipboardResponse,
	}
}
