import type { ChatMessage } from '@/hooks/useYjsChat'

/** 格式化时间：只显示时:分 */
function formatTime(ts: number): string {
	const d = new Date(ts)
	return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/**
 * 判断两条消息是否可以合并显示（同一个人 5 分钟内连续消息）
 */
function shouldMerge(
	prev: ChatMessage | undefined,
	curr: ChatMessage,
): boolean {
	if (!prev) return false
	return (
		prev.userId === curr.userId &&
		curr.timestamp - prev.timestamp < 5 * 60 * 1000
	)
}

interface ChatMessagesProps {
	messages: Array<ChatMessage>
	currentUserId: string
}

export default function ChatMessages({
	messages,
	currentUserId,
}: ChatMessagesProps) {
	if (messages.length === 0) {
		return (
			<div className="flex h-full items-center justify-center px-4">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">还没有消息</p>
					<p className="mt-1 text-xs text-muted-foreground/60">
						发送第一条消息开始聊天吧
					</p>
				</div>
			</div>
		)
	}

	return (
		<>
			{messages.map((msg, i) => {
				const isMe = msg.userId === currentUserId
				const merged = shouldMerge(messages[i - 1], msg)

				return (
					<div
						key={msg.id}
						className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${merged ? 'mt-0.5' : 'mt-3'}`}
					>
						<div
							className={`flex max-w-[80%] items-end gap-2 ${
								isMe ? 'flex-row-reverse' : 'flex-row'
							}`}
						>
							{/* 头像 */}
							{!merged ? (
								<div
									className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
									style={{ backgroundColor: msg.avatarColor }}
								>
									{msg.nickname.charAt(0).toUpperCase()}
								</div>
							) : (
								<div className="w-8 shrink-0" />
							)}

							{/* 消息内容 */}
							<div className={isMe ? 'text-right' : 'text-left'}>
								{/* 昵称 + 时间 */}
								{!merged && (
									<div
										className={`mb-1 flex items-center gap-2 text-xs text-muted-foreground ${
											isMe ? 'justify-end' : 'justify-start'
										}`}
									>
										{!isMe && (
											<span className="font-medium">{msg.nickname}</span>
										)}
										<span>{formatTime(msg.timestamp)}</span>
									</div>
								)}

								{/* 气泡 */}
								<div
									className={`inline-block rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
										isMe
											? 'rounded-br-md bg-primary text-primary-foreground'
											: 'rounded-bl-md bg-muted text-foreground'
									}`}
								>
									{msg.text}
								</div>
							</div>
						</div>
					</div>
				)
			})}
		</>
	)
}
