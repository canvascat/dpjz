/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Y from 'yjs'
import type { IndexeddbPersistence } from 'y-indexeddb'
import type { WebrtcProvider } from 'y-webrtc'

import type { LocalUser } from '@/lib/user'
import type { NotionAvatarConfig } from '@/lib/notion-avatar'
import { TEA_CAP } from '@/lib/constants'

// ─── 数据类型 ───────────────────────────────────────────

/** 成员信息（持久化在 Yjs 中） */
export interface PokerMember {
	userId: string
	nickname: string
	avatarColor: string
	avatarType?: 'text' | 'notion'
	notionAvatarConfig?: NotionAvatarConfig
}

/** 一笔转账记录 */
export interface PokerTransaction {
	id: string
	fromUserId: string
	fromNickname: string
	fromAvatarColor: string
	fromAvatarType?: 'text' | 'notion'
	fromNotionAvatarConfig?: NotionAvatarConfig
	toUserId: string
	toNickname: string
	toAvatarColor: string
	toAvatarType?: 'text' | 'notion'
	toNotionAvatarConfig?: NotionAvatarConfig
	/** 发送者支出总额 */
	amount: number
	/** 成交时茶位费率 (0~1) */
	teaRate: number
	/** 茶位费金额 = amount * teaRate */
	teaAmount: number
	timestamp: number
}

/** 余额表：userId → 分数 */
export type Balances = Record<string, number>

interface UseYjsPokerReturn {
	/** 所有参与过的成员 */
	members: Array<PokerMember>
	/** 流水记录（新→旧） */
	transactions: Array<PokerTransaction>
	/** 各成员余额（含 "tea" 键） */
	balances: Balances
	/** 当前茶位费率 (0~1) */
	teaRate: number
	/** 茶位费累计上限（分），达到后不再扣 */
	teaCap: number
	/** 在线成员 userId 集合 */
	onlineUserIds: Set<string>
	connected: boolean
	/** 转分给另一个用户 */
	transfer: (toUserId: string, amount: number) => void
	/** 修改茶位费率 */
	setTeaRate: (rate: number) => void
	/** 修改茶位费累计上限 */
	setTeaCap: (cap: number) => void
}

// ─── 工具函数 ───────────────────────────────────────────

function parseNotionConfig(raw: unknown): NotionAvatarConfig | undefined {
	if (!raw || typeof raw !== 'string') return undefined
	try {
		const o = JSON.parse(raw) as NotionAvatarConfig
		return o && typeof o.face === 'number' ? o : undefined
	} catch {
		return undefined
	}
}

function readTransactions(
	arr: Y.Array<Y.Map<string | number>>,
): Array<PokerTransaction> {
	const txns: Array<PokerTransaction> = []
	arr.forEach((yMap) => {
		txns.push({
			id: yMap.get('id') as string,
			fromUserId: yMap.get('fromUserId') as string,
			fromNickname: yMap.get('fromNickname') as string,
			fromAvatarColor: (yMap.get('fromAvatarColor') as string) || '#3b82f6',
			fromAvatarType:
				(yMap.get('fromAvatarType') as 'text' | 'notion') || 'text',
			fromNotionAvatarConfig: parseNotionConfig(
				yMap.get('fromNotionAvatarConfig'),
			),
			toUserId: yMap.get('toUserId') as string,
			toNickname: yMap.get('toNickname') as string,
			toAvatarColor: (yMap.get('toAvatarColor') as string) || '#3b82f6',
			toAvatarType: (yMap.get('toAvatarType') as 'text' | 'notion') || 'text',
			toNotionAvatarConfig: parseNotionConfig(yMap.get('toNotionAvatarConfig')),
			amount: yMap.get('amount') as number,
			teaRate: yMap.get('teaRate') as number,
			teaAmount: yMap.get('teaAmount') as number,
			timestamp: yMap.get('timestamp') as number,
		})
	})
	txns.sort((a, b) => b.timestamp - a.timestamp)
	return txns
}

function readMembers(map: Y.Map<Y.Map<string>>): Array<PokerMember> {
	const members: Array<PokerMember> = []
	map.forEach((yMap, userId) => {
		members.push({
			userId,
			nickname: yMap.get('nickname') || '???',
			avatarColor: yMap.get('avatarColor') || '#3b82f6',
			avatarType: (yMap.get('avatarType') as 'text' | 'notion') || 'text',
			notionAvatarConfig: parseNotionConfig(yMap.get('notionAvatarConfig')),
		})
	})
	return members
}

function computeBalances(txns: Array<PokerTransaction>): Balances {
	const b: Balances = {}
	const ensure = (uid: string) => {
		if (!(uid in b)) b[uid] = 0
	}
	for (const t of txns) {
		ensure(t.fromUserId)
		ensure(t.toUserId)
		b[t.fromUserId] -= t.amount
		b[t.toUserId] += t.amount - t.teaAmount
		// 茶池
		if (!('tea' in b)) b['tea'] = 0
		b['tea'] += t.teaAmount
	}
	return b
}

// ─── Hook ──────────────────────────────────────────────

export function useYjsPoker(
	roomId: string,
	localUser: LocalUser,
): UseYjsPokerReturn {
	const [transactions, setTransactions] = useState<Array<PokerTransaction>>([])
	const [members, setMembers] = useState<Array<PokerMember>>([])
	const [teaRate, setTeaRateState] = useState(0)
	const [teaCap, setTeaCapState] = useState(TEA_CAP)
	const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
	const [connected, setConnected] = useState(false)

	const localUserRef = useRef(localUser)
	localUserRef.current = localUser

	const yjsRef = useRef<
		Partial<{
			doc: Y.Doc
			transactionsArray: Y.Array<Y.Map<string | number>>
			membersMap: Y.Map<Y.Map<string>>
			settingsMap: Y.Map<number>
			webrtcProvider: WebrtcProvider
			indexeddbProvider: IndexeddbPersistence
		}>
	>({})

	useEffect(() => {
		if (typeof window === 'undefined' || !roomId) return

		const doc = new Y.Doc()
		const transactionsArray =
			doc.getArray<Y.Map<string | number>>('transactions')
		const membersMap = doc.getMap<Y.Map<string>>('members')
		const settingsMap = doc.getMap<number>('settings')

		// ── 同步状态的 observer ──

		const syncTransactions = () =>
			setTransactions(readTransactions(transactionsArray))
		const syncMembers = () => setMembers(readMembers(membersMap))
		const syncSettings = () => {
			const rate = settingsMap.get('teaRate')
			setTeaRateState(typeof rate === 'number' ? rate : 0)
			const cap = settingsMap.get('teaCap')
			setTeaCapState(typeof cap === 'number' && cap >= 1 ? cap : TEA_CAP)
		}

		transactionsArray.observeDeep(syncTransactions)
		membersMap.observeDeep(syncMembers)
		settingsMap.observe(syncSettings)

		// 初始读取
		syncTransactions()
		syncMembers()
		syncSettings()

		// 注册当前用户为成员
		const registerSelf = () => {
			const u = localUserRef.current
			if (!u.id) return
			const existing = membersMap.get(u.id)
			const notionStr = u.notionAvatarConfig
				? JSON.stringify(u.notionAvatarConfig)
				: undefined
			const existingNotion = existing?.get('notionAvatarConfig')
			if (
				!existing ||
				existing.get('nickname') !== u.nickname ||
				existing.get('avatarColor') !== u.avatarColor ||
				existing.get('avatarType') !== u.avatarType ||
				existingNotion !== notionStr
			) {
				doc.transact(() => {
					const yMap = new Y.Map<string>()
					yMap.set('nickname', u.nickname)
					yMap.set('avatarColor', u.avatarColor)
					yMap.set('avatarType', u.avatarType)
					if (u.notionAvatarConfig) {
						yMap.set('notionAvatarConfig', JSON.stringify(u.notionAvatarConfig))
					}
					membersMap.set(u.id, yMap)
				})
			}
		}
		registerSelf()

		yjsRef.current = { doc, transactionsArray, membersMap, settingsMap }

		// ── 异步初始化 providers ──
		let disposed = false

		const initProviders = async () => {
			const [{ IndexeddbPersistence }, { WebrtcProvider }] = await Promise.all([
				import('y-indexeddb'),
				import('y-webrtc'),
			])

			if (disposed) return

			const indexeddbProvider = new IndexeddbPersistence(
				`dpjz-poker-${roomId}`,
				doc,
			)
			const webrtcProvider = new WebrtcProvider(`dpjz-poker-${roomId}`, doc, {
				signaling: [import.meta.env.VITE_SIGNALING_URL],
			})

			const user = localUserRef.current
			webrtcProvider.awareness.setLocalStateField('user', {
				userId: user.id,
				nickname: user.nickname,
				avatarColor: user.avatarColor,
				avatarType: user.avatarType,
				notionAvatarConfig: user.notionAvatarConfig,
			})

			const updateOnline = () => {
				const ids = new Set<string>()
				webrtcProvider.awareness.getStates().forEach((state) => {
					if (state.user && (state.user as PokerMember).userId) {
						ids.add((state.user as PokerMember).userId)
					}
				})
				setOnlineUserIds(ids)
			}

			webrtcProvider.on('synced', () => {
				if (disposed) return
				setConnected(true)
				syncTransactions()
				syncMembers()
				syncSettings()
				// synced 后再次注册自己（确保远端也能看到）
				registerSelf()
			})

			webrtcProvider.awareness.on('change', () => {
				if (!disposed) updateOnline()
			})
			updateOnline()

			yjsRef.current = {
				doc,
				transactionsArray,
				membersMap,
				settingsMap,
				webrtcProvider,
				indexeddbProvider,
			}

			indexeddbProvider.on('synced', () => {
				if (disposed) return
				syncTransactions()
				syncMembers()
				syncSettings()
				registerSelf()
			})
		}

		initProviders()

		return () => {
			disposed = true
			transactionsArray.unobserveDeep(syncTransactions)
			membersMap.unobserveDeep(syncMembers)
			settingsMap.unobserve(syncSettings)
			yjsRef.current.webrtcProvider?.destroy()
			yjsRef.current.indexeddbProvider?.destroy()
			doc.destroy()
			yjsRef.current = {}
			setConnected(false)
			setOnlineUserIds(new Set())
		}
	}, [roomId])

	// localUser 变化时更新 awareness + 成员信息
	useEffect(() => {
		const { webrtcProvider, membersMap, doc } = yjsRef.current
		if (webrtcProvider) {
			webrtcProvider.awareness.setLocalStateField('user', {
				userId: localUser.id,
				nickname: localUser.nickname,
				avatarColor: localUser.avatarColor,
			})
		}
		if (membersMap && doc && localUser.id) {
			doc.transact(() => {
				const yMap = new Y.Map<string>()
				yMap.set('nickname', localUser.nickname)
				yMap.set('avatarColor', localUser.avatarColor)
				yMap.set('avatarType', localUser.avatarType)
				if (localUser.notionAvatarConfig) {
					yMap.set(
						'notionAvatarConfig',
						JSON.stringify(localUser.notionAvatarConfig),
					)
				}
				membersMap.set(localUser.id, yMap)
			})
		}
	}, [
		localUser.id,
		localUser.nickname,
		localUser.avatarColor,
		localUser.avatarType,
		JSON.stringify(localUser.notionAvatarConfig),
	])

	// ── 派生余额 ──
	const balances = useMemo(() => computeBalances(transactions), [transactions])

	// ── 转分 ──
	const transfer = useCallback((toUserId: string, amount: number) => {
		const { doc, transactionsArray, settingsMap } = yjsRef.current
		if (!doc || !transactionsArray || !settingsMap) return
		if (amount <= 0) return

		const from = localUserRef.current
		const toMember = yjsRef.current.membersMap?.get(toUserId)
		const toNickname = toMember?.get('nickname') || '???'
		const toAvatarColor = toMember?.get('avatarColor') || '#3b82f6'
		const toAvatarType =
			(toMember?.get('avatarType') as 'text' | 'notion') || 'text'
		const toNotionConfig = parseNotionConfig(
			toMember?.get('notionAvatarConfig'),
		)

		const currentRate = settingsMap.get('teaRate') ?? 0
		const cap = settingsMap.get('teaCap')
		const effectiveCap = typeof cap === 'number' && cap >= 1 ? cap : TEA_CAP
		// 当前茶池累计（从流水汇总）
		let currentTeaBalance = 0
		transactionsArray.forEach((yMap) => {
			currentTeaBalance += (yMap.get('teaAmount') as number | undefined) ?? 0
		})
		// 茶位费：整数，最少 1 分；累计达到上限后不再扣
		const remainingCap = Math.max(0, effectiveCap - currentTeaBalance)
		const rawTea = amount * currentRate
		const teaAmountUncapped = rawTea > 0 ? Math.max(1, Math.floor(rawTea)) : 0
		const teaAmount = Math.min(teaAmountUncapped, remainingCap)

		doc.transact(() => {
			const yMap = new Y.Map<string | number>()
			yMap.set('id', crypto.randomUUID())
			yMap.set('fromUserId', from.id)
			yMap.set('fromNickname', from.nickname)
			yMap.set('fromAvatarColor', from.avatarColor)
			yMap.set('fromAvatarType', from.avatarType)
			if (from.notionAvatarConfig) {
				yMap.set(
					'fromNotionAvatarConfig',
					JSON.stringify(from.notionAvatarConfig),
				)
			}
			yMap.set('toUserId', toUserId)
			yMap.set('toNickname', toNickname)
			yMap.set('toAvatarColor', toAvatarColor)
			yMap.set('toAvatarType', toAvatarType)
			if (toNotionConfig) {
				yMap.set('toNotionAvatarConfig', JSON.stringify(toNotionConfig))
			}
			yMap.set('amount', amount)
			yMap.set('teaRate', currentRate)
			yMap.set('teaAmount', teaAmount)
			yMap.set('timestamp', Date.now())
			transactionsArray.push([yMap])
		})
	}, [])

	// ── 修改茶位费率 ──
	const setTeaRate = useCallback((rate: number) => {
		const { doc, settingsMap } = yjsRef.current
		if (!doc || !settingsMap) return
		const clamped = Math.max(0, Math.min(1, rate))
		doc.transact(() => {
			settingsMap.set('teaRate', clamped)
		})
	}, [])

	// ── 修改茶位费累计上限 ──
	const setTeaCap = useCallback((cap: number) => {
		const { doc, settingsMap } = yjsRef.current
		if (!doc || !settingsMap) return
		const value = Math.max(1, Math.floor(cap))
		doc.transact(() => {
			settingsMap.set('teaCap', value)
		})
	}, [])

	return {
		members,
		transactions,
		balances,
		teaRate,
		teaCap,
		onlineUserIds,
		connected,
		transfer,
		setTeaRate,
		setTeaCap,
	}
}
