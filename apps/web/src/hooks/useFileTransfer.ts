/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-type-assertion */
import { useCallback, useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import type { IncomingFileOffer, PeerInfo } from '@/hooks/useYjsChat'

const CHUNK_SIZE = 16 * 1024 // 16KB
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface SendProgress {
	sessionId: string
	toNickname: string
	percent: number
	status: 'connecting' | 'sending' | 'done' | 'error' | 'rejected'
}

export interface ReceiveProgress {
	sessionId: string
	fromNickname: string
	fileName: string
	percent: number
	status: 'receiving' | 'done' | 'error'
}

export interface ReceivedFile {
	sessionId: string
	fileName: string
	blob: Blob
	fromNickname: string
}

interface UseFileTransferReturn {
	incomingOffers: Array<IncomingFileOffer>
	sendProgress: SendProgress | null
	receiveProgress: ReceiveProgress | null
	receivedFile: ReceivedFile | null
	sendFile: (toUserId: string, toNickname: string, file: File) => void
	acceptOffer: (sessionId: string) => void
	rejectOffer: (sessionId: string) => void
	clearReceivedFile: () => void
	cancelSend: (sessionId: string) => void
}

export function useFileTransfer(
	doc: Y.Doc | null,
	localUserId: string,
	localNickname: string,
	peers: Array<PeerInfo>,
): UseFileTransferReturn {
	const [incomingOffers, setIncomingOffers] = useState<
		Array<IncomingFileOffer>
	>([])
	const [sendProgress, setSendProgress] = useState<SendProgress | null>(null)
	const [receiveProgress, setReceiveProgress] =
		useState<ReceiveProgress | null>(null)
	const [receivedFile, setReceivedFile] = useState<ReceivedFile | null>(null)

	const fileSignals = doc?.getMap<Y.Map<string | number>>('fileSignals') ?? null
	const peersRef = useRef(peers)
	peersRef.current = peers
	const localUserIdRef = useRef(localUserId)
	localUserIdRef.current = localUserId
	const localNicknameRef = useRef(localNickname)
	localNicknameRef.current = localNickname

	// 保存活跃的 PC/DC 便于取消和清理
	const sessionPeersRef = useRef<
		Map<
			string,
			{
				pc: RTCPeerConnection
				dc?: RTCDataChannel
			}
		>
	>(new Map())

	// 观察 fileSignals：发给我的 offer、我发起的 answer/ice、rejected
	useEffect(() => {
		if (!doc || !fileSignals) return

		const readIncomingOffers = () => {
			const list: Array<IncomingFileOffer> = []
			fileSignals.forEach((val, sessionId) => {
				const yMap = val
				const type = yMap.get('type') as string
				const toUserId = yMap.get('toUserId') as string
				if (type === 'offer' && toUserId === localUserIdRef.current) {
					const rejected = yMap.get('rejected')
					if (rejected) return
					list.push({
						sessionId,
						fromUserId: yMap.get('fromUserId') as string,
						fromNickname: String(yMap.get('fromNickname') ?? ''),
						fileName: String(yMap.get('fileName') ?? ''),
						fileSize: Number(yMap.get('fileSize') ?? 0),
					})
				}
			})
			setIncomingOffers(list)
		}

		const observer = () => readIncomingOffers()
		fileSignals.observe(observer)
		readIncomingOffers()
		return () => fileSignals.unobserve(observer)
	}, [doc, fileSignals])

	const clearSessionFromSignals = useCallback(
		(sessionId: string) => {
			if (!doc || !fileSignals) return
			doc.transact(() => {
				fileSignals.delete(sessionId)
			})
		},
		[doc, fileSignals],
	)

	const sendFile = useCallback(
		(toUserId: string, toNickname: string, file: File) => {
			if (!doc || !fileSignals) return
			if (file.size > MAX_FILE_SIZE) {
				return // 由 UI 层限制并提示
			}
			const sessionId = crypto.randomUUID()
			const pc = new RTCPeerConnection({
				iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
			})
			const dc = pc.createDataChannel('file', { ordered: true })
			sessionPeersRef.current.set(sessionId, { pc, dc })

			setSendProgress({
				sessionId,
				toNickname,
				percent: 0,
				status: 'connecting',
			})

			pc.onicecandidate = (e) => {
				const candidate = e.candidate
				if (candidate && doc && fileSignals) {
					doc.transact(() => {
						const m = new Y.Map<string | number>()
						m.set('type', 'ice')
						m.set('sessionId', sessionId)
						m.set('fromUserId', localUserIdRef.current)
						m.set('toUserId', toUserId)
						m.set('candidate', JSON.stringify(candidate.toJSON()))
						fileSignals.set(`${sessionId}-ice-${Date.now()}`, m)
					})
				}
			}

			pc.createOffer()
				.then((offer) => pc.setLocalDescription(offer))
				.then(() => {
					if (!doc || !fileSignals) return
					doc.transact(() => {
						const m = new Y.Map<string | number>()
						m.set('type', 'offer')
						m.set('sessionId', sessionId)
						m.set('fromUserId', localUserIdRef.current)
						m.set('fromNickname', localNicknameRef.current)
						m.set('toUserId', toUserId)
						m.set('fileName', file.name)
						m.set('fileSize', file.size)
						m.set('sdp', JSON.stringify(pc.localDescription))
						fileSignals.set(sessionId, m)
					})
				})
				.catch(() => {
					setSendProgress((p) =>
						p?.sessionId === sessionId ? { ...p, status: 'error' } : p,
					)
					sessionPeersRef.current.get(sessionId)?.pc.close()
					sessionPeersRef.current.delete(sessionId)
				})

			// 监听 answer 和 ice（来自 toUserId = 接收方）
			const checkSignals = () => {
				fileSignals.forEach((val) => {
					const yMap = val
					const sigType = yMap.get('type') as string
					const sigFrom = yMap.get('fromUserId') as string
					const sigSession = yMap.get('sessionId') as string
					if (sigSession !== sessionId || sigFrom !== toUserId) return
					if (sigType === 'answer') {
						const sdp = yMap.get('sdp') as string
						if (sdp) {
							try {
								const desc = JSON.parse(sdp)
								pc.setRemoteDescription(new RTCSessionDescription(desc)).catch(
									() => {},
								)
							} catch {}
						}
					} else if (sigType === 'ice') {
						const cand = yMap.get('candidate') as string
						if (cand) {
							try {
								const candidate = JSON.parse(cand)
								pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(
									() => {},
								)
							} catch {}
						}
					}
				})
			}
			const observer = () => checkSignals()
			fileSignals.observe(observer)
			checkSignals()

			dc.binaryType = 'arraybuffer'
			dc.onopen = () => {
				setSendProgress((p) =>
					p?.sessionId === sessionId
						? { ...p, status: 'sending', percent: 0 }
						: p,
				)
				// 发 metadata
				dc.send(
					JSON.stringify({
						fileName: file.name,
						fileSize: file.size,
						mimeType: file.type,
					}),
				)
				let offset = 0
				const sendChunk = () => {
					if (offset >= file.size) {
						setSendProgress((p) =>
							p?.sessionId === sessionId
								? { ...p, percent: 100, status: 'done' }
								: p,
						)
						dc.close()
						pc.close()
						fileSignals.unobserve(observer)
						sessionPeersRef.current.delete(sessionId)
						setTimeout(() => clearSessionFromSignals(sessionId), 500)
						return
					}
					const chunk = file.slice(offset, offset + CHUNK_SIZE)
					const reader = new FileReader()
					reader.onload = () => {
						dc.send(reader.result as ArrayBuffer)
						offset += CHUNK_SIZE
						const percent = Math.min(99, Math.round((offset / file.size) * 100))
						setSendProgress((p) =>
							p?.sessionId === sessionId ? { ...p, percent } : p,
						)
						sendChunk()
					}
					reader.readAsArrayBuffer(chunk)
				}
				sendChunk()
			}
			dc.onerror = () => {
				setSendProgress((p) =>
					p?.sessionId === sessionId ? { ...p, status: 'error' } : p,
				)
				fileSignals.unobserve(observer)
				pc.close()
				sessionPeersRef.current.delete(sessionId)
			}
		},
		[doc, fileSignals, clearSessionFromSignals],
	)

	const acceptOffer = useCallback(
		(sessionId: string) => {
			if (!doc || !fileSignals) return
			const yMap = fileSignals.get(sessionId)
			if (!yMap) return
			const type = yMap.get('type') as string
			if (type !== 'offer') return
			const fromUserId = yMap.get('fromUserId') as string
			const fromNickname = String(yMap.get('fromNickname') ?? '')
			const sdpStr = yMap.get('sdp') as string
			const fileName = String(yMap.get('fileName') ?? '')
			if (!sdpStr) return

			const pc = new RTCPeerConnection({
				iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
			})
			sessionPeersRef.current.set(sessionId, { pc })

			setReceiveProgress({
				sessionId,
				fromNickname,
				fileName,
				percent: 0,
				status: 'receiving',
			})

			pc.onicecandidate = (e) => {
				const candidate = e.candidate
				if (candidate && doc && fileSignals) {
					doc.transact(() => {
						const m = new Y.Map<string | number>()
						m.set('type', 'ice')
						m.set('sessionId', sessionId)
						m.set('fromUserId', localUserIdRef.current)
						m.set('toUserId', fromUserId)
						m.set('candidate', JSON.stringify(candidate.toJSON()))
						fileSignals.set(`${sessionId}-ice-${Date.now()}`, m)
					})
				}
			}

			pc.ondatachannel = (e) => {
				const dc = e.channel
				dc.binaryType = 'arraybuffer'
				const chunks: Array<ArrayBuffer> = []
				let meta: { fileName: string; fileSize: number } | null = null
				dc.onmessage = (ev) => {
					if (typeof ev.data === 'string') {
						meta = JSON.parse(ev.data) as {
							fileName: string
							fileSize: number
						}
						return
					}
					chunks.push(ev.data as ArrayBuffer)
					if (meta) {
						const received = chunks.reduce((a, c) => a + c.byteLength, 0)
						const percent = Math.min(
							99,
							Math.round((received / meta.fileSize) * 100),
						)
						setReceiveProgress((p) =>
							p?.sessionId === sessionId ? { ...p, percent } : p,
						)
					}
				}
				dc.onclose = () => {
					if (!meta) return
					const blob = new Blob(chunks)
					setReceiveProgress((p) =>
						p?.sessionId === sessionId
							? { ...p, percent: 100, status: 'done' }
							: p,
					)
					setReceivedFile({
						sessionId,
						fileName: meta.fileName,
						blob,
						fromNickname,
					})
					pc.close()
					sessionPeersRef.current.delete(sessionId)
					clearSessionFromSignals(sessionId)
				}
			}

			try {
				const desc = JSON.parse(sdpStr)
				pc.setRemoteDescription(new RTCSessionDescription(desc))
					.then(() => pc.createAnswer())
					.then((answer) => pc.setLocalDescription(answer))
					.then(() => {
						if (!doc || !fileSignals) return
						doc.transact(() => {
							const m = new Y.Map<string | number>()
							m.set('type', 'answer')
							m.set('sessionId', sessionId)
							m.set('fromUserId', localUserIdRef.current)
							m.set('toUserId', fromUserId)
							m.set('sdp', JSON.stringify(pc.localDescription))
							fileSignals.set(`${sessionId}-answer`, m)
						})
					})
					.catch(() => {
						setReceiveProgress((p) =>
							p?.sessionId === sessionId ? { ...p, status: 'error' } : p,
						)
						pc.close()
						sessionPeersRef.current.delete(sessionId)
					})
			} catch {
				setReceiveProgress((p) =>
					p?.sessionId === sessionId ? { ...p, status: 'error' } : p,
				)
				pc.close()
				sessionPeersRef.current.delete(sessionId)
			}

			// 处理发送方发来的 ice（key 可能是 sessionId-ice-*）
			fileSignals.forEach((val) => {
				const sigMap = val as Y.Map<string | number>
				if ((sigMap.get('sessionId') as string) !== sessionId) return
				if ((sigMap.get('toUserId') as string) !== localUserIdRef.current) return
				if ((sigMap.get('type') as string) === 'ice') {
					const cand = sigMap.get('candidate') as string
					if (cand) {
						try {
							pc.addIceCandidate(new RTCIceCandidate(JSON.parse(cand))).catch(
								() => {},
							)
						} catch {}
					}
				}
			})
			const iceObserver = () => {
				fileSignals.forEach((val) => {
					const sigMapInner = val as Y.Map<string | number>
					if ((sigMapInner.get('sessionId') as string) !== sessionId) return
					if ((sigMapInner.get('toUserId') as string) !== localUserIdRef.current)
						return
					if ((sigMapInner.get('type') as string) === 'ice') {
						const cand = sigMapInner.get('candidate') as string
						if (cand) {
							try {
								pc.addIceCandidate(new RTCIceCandidate(JSON.parse(cand))).catch(
									() => {},
								)
							} catch {}
						}
					}
				})
			}
			fileSignals.observe(iceObserver)
		},
		[doc, fileSignals, clearSessionFromSignals],
	)

	const rejectOffer = useCallback(
		(sessionId: string) => {
			if (!doc || !fileSignals) return
			doc.transact(() => {
				const existing = fileSignals.get(sessionId)
				if (existing) {
					existing.set('rejected', 1)
					fileSignals.set(sessionId, existing)
				}
			})
			setIncomingOffers((prev) => prev.filter((o) => o.sessionId !== sessionId))
		},
		[doc, fileSignals],
	)

	// 发送方：观察到 rejected 后更新状态并清理
	useEffect(() => {
		if (!doc || !fileSignals) return
		const observer = () => {
			fileSignals.forEach((val) => {
				const rejectedMap = val as Y.Map<string | number>
				if ((rejectedMap.get('fromUserId') as string) !== localUserIdRef.current)
					return
				if (!rejectedMap.get('rejected')) return
				const sigSessionId = rejectedMap.get('sessionId') as string
				if (!sigSessionId) return
				setSendProgress((p) =>
					p?.sessionId === sigSessionId ? { ...p, status: 'rejected' } : p,
				)
				sessionPeersRef.current.get(sigSessionId)?.pc.close()
				sessionPeersRef.current.delete(sigSessionId)
				clearSessionFromSignals(sigSessionId)
			})
		}
		fileSignals.observe(observer)
		return () => fileSignals.unobserve(observer)
	}, [doc, fileSignals, clearSessionFromSignals])

	const clearReceivedFile = useCallback(() => {
		setReceivedFile(null)
		setReceiveProgress(null)
	}, [])

	const cancelSend = useCallback(
		(sessionId: string) => {
			const entry = sessionPeersRef.current.get(sessionId)
			if (entry) {
				entry.pc.close()
				sessionPeersRef.current.delete(sessionId)
			}
			setSendProgress((p) => (p?.sessionId === sessionId ? null : p))
			clearSessionFromSignals(sessionId)
		},
		[clearSessionFromSignals],
	)

	return {
		incomingOffers,
		sendProgress,
		receiveProgress,
		receivedFile,
		sendFile,
		acceptOffer,
		rejectOffer,
		clearReceivedFile,
		cancelSend,
	}
}

export { formatFileSize, MAX_FILE_SIZE }
