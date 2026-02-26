/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Send, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { PeerInfo } from '@/hooks/useYjsChat'
import { readClipboardItem, useYjsChat } from '@/hooks/useYjsChat'
import { ChatMemberBar } from '@/components/chat-member-bar'
import { ChatPeerActionSheet } from '@/components/chat-peer-action-sheet'
import { ProfileSheet } from '@/components/profile-sheet'
import { UserAvatar } from '@/components/notion-style-avatar'
import { ShareDialog } from '@/components/share-dialog'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import {
	MAX_FILE_SIZE,
	formatFileSize,
	useFileTransfer,
} from '@/hooks/useFileTransfer'
import { useLocalUser } from '@/hooks/useLocalUser'
import { useRecentRooms } from '@/hooks/useRecentRooms'

function ChatRoom() {
	const { roomId } = Route.useParams()
	const { user } = useLocalUser()
	const { add: addRecentRoom } = useRecentRooms()
	const {
		messages,
		sendMessage,
		peers,
		peerCount,
		connected,
		docReady,
		doc,
		requestClipboard,
		pendingClipboardRequests,
		respondToClipboardRequest,
		respondToClipboardRequestWithContent,
		receivedClipboard,
		consumeClipboardResponse,
	} = useYjsChat(roomId, user)
	const fileTransfer = useFileTransfer(doc, user.id, user.nickname, peers)
	const {
		incomingOffers,
		sendProgress,
		receiveProgress,
		receivedFile,
		sendFile,
		acceptOffer,
		rejectOffer,
		clearReceivedFile,
		cancelSend,
	} = fileTransfer
	const [input, setInput] = useState('')
	const [selectedPeer, setSelectedPeer] = useState<PeerInfo | null>(null)
	const [profileOpen, setProfileOpen] = useState(false)
	const [isMobile, setIsMobile] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const pendingFilePeerRef = useRef<PeerInfo | null>(null)

	// 移动端：窄屏时用 window.prompt 输入
	useEffect(() => {
		const mq = window.matchMedia('(max-width: 767px)')
		const handler = () => setIsMobile(mq.matches)
		handler()
		mq.addEventListener('change', handler)
		return () => mq.removeEventListener('change', handler)
	}, [])

	// 记录到最近房间
	useEffect(() => {
		if (roomId) addRecentRoom(roomId, 'chat')
	}, [roomId])

	// 自动滚动
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	// 收到剪切板时 Toast 提示
	useEffect(() => {
		if (receivedClipboard) {
			toast.success(`已收到 ${receivedClipboard.fromNickname} 的剪切板`)
		}
	}, [receivedClipboard])

	const handleSend = () => {
		const trimmed = input.trim()
		if (trimmed) {
			sendMessage(trimmed)
			setInput('')
			// 移动端发送后重新 focus 输入框
			inputRef.current?.focus()
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	const handleMobileInputClick = () => {
		const text = window.prompt('输入消息...')
		if (text != null && text.trim()) {
			sendMessage(text.trim())
		}
	}

	const handleRequestClipboard = (peer: PeerInfo) => {
		requestClipboard(peer.userId, peer.nickname)
		setSelectedPeer(null)
	}

	const handleRespondClipboard = async (requestId: string, accept: boolean) => {
		try {
			await respondToClipboardRequest(requestId, accept)
		} catch {
			toast.error('无法读取剪切板')
		}
	}

	/** iOS Safari 需在用户点击的同一同步调栈中启动 clipboard.read，再传入 Promise */
	const handleAcceptClipboard = (requestId: string) => {
		if (typeof navigator.clipboard?.read !== 'function') {
			toast.error('无法读取剪切板')
			return
		}
		const contentPromise = readClipboardItem()
		respondToClipboardRequestWithContent(requestId, contentPromise).catch(() =>
			toast.error('无法读取剪切板'),
		)
	}

	const handleCopyReceived = async () => {
		if (!receivedClipboard) return
		try {
			const blob = new Blob([receivedClipboard.data], {
				type: receivedClipboard.mimeType,
			})
			await navigator.clipboard.write([
				new ClipboardItem({ [receivedClipboard.mimeType]: blob }),
			])
			toast.success('已复制')
		} catch {
			toast.error('复制失败')
		}
	}

	const handleSendFileClick = (peer: PeerInfo) => {
		pendingFilePeerRef.current = peer
		fileInputRef.current?.click()
	}

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const peer = pendingFilePeerRef.current
		const file = e.target.files?.[0]
		e.target.value = ''
		pendingFilePeerRef.current = null
		if (!peer || !file) return
		if (file.size > MAX_FILE_SIZE) {
			toast.error(`文件大小超过 ${formatFileSize(MAX_FILE_SIZE)} 限制`)
			return
		}
		sendFile(peer.userId, peer.nickname, file)
		toast.success(`正在向 ${peer.nickname} 发送文件`)
	}

	const handleSaveReceivedFile = () => {
		if (!receivedFile) return
		const url = URL.createObjectURL(receivedFile.blob)
		const a = document.createElement('a')
		a.href = url
		a.download = receivedFile.fileName
		a.click()
		URL.revokeObjectURL(url)
		clearReceivedFile()
		toast.success('已保存')
	}

	const incomingFileOffer = incomingOffers[0] ?? null

	return (
		<div className="flex h-dvh flex-col bg-background">
			<input
				ref={fileInputRef}
				type="file"
				className="hidden"
				onChange={handleFileInputChange}
			/>
			{/* 顶部栏 */}
			<header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-4">
				<Link to="/">
					<Button variant="ghost" size="icon" className="h-9 w-9">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>

				<div className="min-w-0 flex-1">
					<h1 className="truncate text-sm font-semibold">{roomId}</h1>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<span
							className={`inline-block h-1.5 w-1.5 rounded-full ${
								connected ? 'bg-green-500' : 'bg-yellow-500'
							}`}
						/>
						<span>{connected ? `${peerCount} 人在线` : '连接中...'}</span>
					</div>
				</div>

				{/* 在线成员指示 */}
				<div className="flex -space-x-1.5">
					{peers.slice(0, 5).map((p, i) => (
						<UserAvatar
							key={`${p.userId}-${i}`}
							userId={p.userId}
							name={p.nickname}
							avatarColor={p.avatarColor}
							avatarType={p.avatarType}
							notionConfig={p.notionAvatarConfig}
							size="sm"
							className="h-7 w-7 border-2 border-background text-[10px]"
							title={p.nickname}
						/>
					))}
					{peers.length > 5 && (
						<div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
							+{peers.length - 5}
						</div>
					)}
				</div>

				<ShareDialog roomId={roomId} />

				<ProfileSheet
					open={profileOpen}
					onOpenChange={setProfileOpen}
					trigger={
						<Button variant="ghost" size="icon" className="h-9 w-9">
							<Users className="h-4 w-4" />
						</Button>
					}
				/>
			</header>

			{/* 成员栏 */}
			<ChatMemberBar
				peers={peers}
				currentUserId={user.id}
				onPeerClick={setSelectedPeer}
				onSelfClick={() => setProfileOpen(true)}
			/>

			{/* 消息区域 */}
			<div className="flex-1 overflow-y-auto overscroll-y-none px-3 py-3 sm:px-4">
				<ChatMessages messages={messages} currentUserId={user.id} />
				<div ref={messagesEndRef} />
			</div>

			{/* 输入区域：移动端样式同桌面，点击用 window.prompt；桌面端内联输入；底部预留安全区 */}
			<div className="shrink-0 border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
				{isMobile ? (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleMobileInputClick}
							className="min-h-[44px] flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors focus:bg-background focus:ring-2 focus:ring-ring focus:outline-none active:bg-muted"
						>
							输入消息...
						</button>
						<Button
							type="button"
							onClick={handleMobileInputClick}
							size="icon"
							className="h-11 w-11 shrink-0 rounded-xl"
						>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<input
							ref={inputRef}
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="输入消息..."
							className="min-h-[44px] flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm transition-colors focus:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
						/>
						<Button
							onClick={handleSend}
							disabled={!input.trim()}
							size="icon"
							className="h-11 w-11 shrink-0 rounded-xl"
						>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>

			{/* 点击成员后的操作列表 */}
			<ChatPeerActionSheet
				targetPeer={selectedPeer}
				onClose={() => setSelectedPeer(null)}
				onRequestClipboard={handleRequestClipboard}
				onSendFile={handleSendFileClick}
				fileTransferReady={docReady}
			/>

			{/* 对方请求读取我的剪切板：同意/拒绝 */}
			<Dialog open={!!pendingRequest}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>读取剪切板请求</DialogTitle>
						<DialogDescription>
							{pendingRequest &&
								`${pendingRequest.fromNickname} 请求读取你的剪切板，是否同意？`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter showCloseButton={false} className="flex-col gap-2">
						<Button
							variant="outline"
							onClick={() =>
								pendingRequest &&
								handleRespondClipboard(pendingRequest.requestId, false)
							}
							className="w-full min-h-[44px]"
						>
							拒绝
						</Button>
						<Button
							onClick={() => {
								if (pendingRequest)
									handleAcceptClipboard(pendingRequest.requestId)
							}}
							className="w-full min-h-[44px]"
						>
							同意并发送
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 收到的剪切板内容 */}
			<Sheet
				open={!!receivedClipboard}
				onOpenChange={(open) =>
					!open && receivedClipboard && consumeClipboardResponse()
				}
			>
				<SheetContent side="bottom" className="rounded-t-2xl">
					<SheetHeader className="text-left">
						<SheetTitle>
							{receivedClipboard &&
								`${receivedClipboard.fromNickname} 的剪切板`}
						</SheetTitle>
						<SheetDescription>可复制到剪切板</SheetDescription>
					</SheetHeader>
					<div className="space-y-4 px-5 pt-4 pb-4">
						{receivedClipboard &&
							(receivedClipboard.mimeType.startsWith('image/') ? (
								<img
									src={URL.createObjectURL(
										new Blob([receivedClipboard.data], {
											type: receivedClipboard.mimeType,
										}),
									)}
									alt="剪切板图片"
									className="max-h-[40vh] w-auto rounded-lg object-contain"
								/>
							) : (
								<pre className="max-h-[40vh] overflow-auto overscroll-y-contain rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap break-words">
									{new TextDecoder().decode(receivedClipboard.data) || '(空)'}
								</pre>
							))}
						<Button
							variant="outline"
							className="w-full min-h-[44px]"
							onClick={handleCopyReceived}
						>
							复制
						</Button>
					</div>
				</SheetContent>
			</Sheet>

			{/* 对方请求发送文件：接受/拒绝 */}
			<Dialog open={!!incomingFileOffer}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>收到文件</DialogTitle>
						<DialogDescription>
							{incomingFileOffer &&
								`${incomingFileOffer.fromNickname} 想发送 ${incomingFileOffer.fileName}（${formatFileSize(incomingFileOffer.fileSize)}），是否接受？`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter showCloseButton={false} className="flex-col gap-2">
						<Button
							variant="outline"
							className="w-full min-h-[44px]"
							onClick={() =>
								incomingFileOffer && rejectOffer(incomingFileOffer.sessionId)
							}
						>
							拒绝
						</Button>
						<Button
							className="w-full min-h-[44px]"
							onClick={() =>
								incomingFileOffer && acceptOffer(incomingFileOffer.sessionId)
							}
						>
							接受
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 发送进度 */}
			{sendProgress && (
				<div className="fixed left-3 right-3 z-40 rounded-lg border bg-background p-3 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm bottom-[calc(5rem+env(safe-area-inset-bottom))]">
					<div className="flex items-center justify-between gap-2 text-sm">
						<span className="truncate">
							{sendProgress.status === 'connecting' && '连接中…'}
							{sendProgress.status === 'sending' &&
								`发送给 ${sendProgress.toNickname} ${sendProgress.percent}%`}
							{sendProgress.status === 'done' &&
								`已发送给 ${sendProgress.toNickname}`}
							{sendProgress.status === 'error' && '发送失败'}
							{sendProgress.status === 'rejected' && '对方已拒绝'}
						</span>
						{(sendProgress.status === 'connecting' ||
							sendProgress.status === 'sending') && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => cancelSend(sendProgress.sessionId)}
							>
								取消
							</Button>
						)}
					</div>
					{(sendProgress.status === 'sending' ||
						sendProgress.status === 'done') && (
						<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary transition-all"
								style={{ width: `${sendProgress.percent}%` }}
							/>
						</div>
					)}
				</div>
			)}

			{/* 接收进度 */}
			{receiveProgress && receiveProgress.status === 'receiving' && (
				<div className="fixed left-3 right-3 z-40 rounded-lg border bg-background p-3 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm bottom-[calc(5rem+env(safe-area-inset-bottom))]">
					<div className="text-sm">
						{receiveProgress.fromNickname} 发送 {receiveProgress.fileName}：
						{receiveProgress.percent}%
					</div>
					<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full bg-primary transition-all"
							style={{ width: `${receiveProgress.percent}%` }}
						/>
					</div>
				</div>
			)}

			{/* 收到的文件：保存 */}
			<Sheet
				open={!!receivedFile}
				onOpenChange={(open) => !open && receivedFile && clearReceivedFile()}
			>
				<SheetContent side="bottom" className="rounded-t-2xl">
					<SheetHeader className="text-left">
						<SheetTitle>收到文件</SheetTitle>
						<SheetDescription>
							{receivedFile &&
								`${receivedFile.fromNickname} 发送了 ${receivedFile.fileName}`}
						</SheetDescription>
					</SheetHeader>
					<div className="mt-4 px-5">
						<Button
							className="w-full min-h-[44px]"
							onClick={handleSaveReceivedFile}
						>
							保存到设备
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}

export const Route = createFileRoute('/chat/$roomId')({
	component: ChatRoom,
})
