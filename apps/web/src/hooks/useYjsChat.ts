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

interface UseYjsChatReturn {
	messages: Array<ChatMessage>
	sendMessage: (text: string) => void
	/** 在线成员列表（含自己） */
	peers: Array<PeerInfo>
	peerCount: number
	connected: boolean
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

	// 用 ref 持有可变引用，避免 effect 依赖抖动
	const localUserRef = useRef(localUser)
	localUserRef.current = localUser

	const yjsRef = useRef<
		Partial<{
			doc: Y.Doc
			messagesArray: Y.Array<Y.Map<string | number>>
			webrtcProvider: WebrtcProvider
			indexeddbProvider: IndexeddbPersistence
		}>
	>({})

	useEffect(() => {
		if (typeof window === 'undefined' || !roomId) return

		const doc = new Y.Doc()
		const messagesArray = doc.getArray<Y.Map<string | number>>('messages')

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

		// 保存到 ref 供 sendMessage 使用
		yjsRef.current = { doc, messagesArray }

		// 异步初始化 providers
		let disposed = false

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

			yjsRef.current = { doc, indexeddbProvider, messagesArray, webrtcProvider }

			// IndexedDB 加载完成后也刷新一次
			indexeddbProvider.on('synced', () => {
				if (!disposed) setMessages(readMessages())
			})
		}

		initProviders()

		return () => {
			disposed = true
			messagesArray.unobserveDeep(observer)
			yjsRef.current.webrtcProvider?.destroy()
			yjsRef.current.indexeddbProvider?.destroy()
			doc.destroy()
			yjsRef.current = {}
			setConnected(false)
			setPeers([] as Array<PeerInfo>)
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

	return {
		messages,
		sendMessage,
		peers,
		peerCount: peers.length || 1,
		connected,
	}
}
