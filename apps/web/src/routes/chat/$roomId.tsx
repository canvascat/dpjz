import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Send, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ChatMessages from '@/components/chat-messages'
import { ProfileSheet } from '@/components/profile-sheet'
import { ShareDialog } from '@/components/share-dialog'
import { Button } from '@/components/ui/button'
import { useLocalUser } from '@/hooks/useLocalUser'
import { useRecentRooms } from '@/hooks/useRecentRooms'
import { useYjsChat } from '@/hooks/useYjsChat'

function ChatRoom() {
	const { roomId } = Route.useParams()
	const { user } = useLocalUser()
	const { add: addRecentRoom } = useRecentRooms()
	const { messages, sendMessage, peers, peerCount, connected } = useYjsChat(
		roomId,
		user,
	)
	const [input, setInput] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	// 记录到最近房间
	useEffect(() => {
		if (roomId) addRecentRoom(roomId, 'chat')
	}, [roomId])

	// 自动滚动
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

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

	return (
		<div className="flex h-dvh flex-col bg-background">
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
						<div
							key={`${p.userId}-${i}`}
							className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-medium text-white"
							style={{ backgroundColor: p.avatarColor }}
							title={p.nickname}
						>
							{p.nickname.charAt(0).toUpperCase()}
						</div>
					))}
					{peers.length > 5 && (
						<div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
							+{peers.length - 5}
						</div>
					)}
				</div>

				<ShareDialog roomId={roomId} />

				<ProfileSheet
					trigger={
						<Button variant="ghost" size="icon" className="h-9 w-9">
							<Users className="h-4 w-4" />
						</Button>
					}
				/>
			</header>

			{/* 消息区域 */}
			<div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
				<ChatMessages messages={messages} currentUserId={user.id} />
				<div ref={messagesEndRef} />
			</div>

			{/* 输入区域 */}
			<div className="shrink-0 border-t bg-background px-3 py-3 sm:px-4">
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
			</div>
		</div>
	)
}

export const Route = createFileRoute('/chat/$roomId')({
	component: ChatRoom,
})
