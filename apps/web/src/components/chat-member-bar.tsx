import type { PeerInfo } from '@/hooks/useYjsChat'
import { UserAvatar } from '@/components/notion-style-avatar'

interface ChatMemberBarProps {
	peers: Array<PeerInfo>
	currentUserId: string
	onPeerClick: (peer: PeerInfo) => void
	onSelfClick?: () => void
}

export function ChatMemberBar({
	peers,
	currentUserId,
	onPeerClick,
	onSelfClick,
}: ChatMemberBarProps) {
	return (
		<div className="flex shrink-0 items-start gap-1 overflow-x-auto border-b px-3 py-3 sm:px-4">
			{peers.map((p) => {
				const isMe = p.userId === currentUserId
				return (
					<button
						key={p.userId}
						disabled={isMe && !onSelfClick}
						onClick={() => (isMe ? onSelfClick?.() : onPeerClick(p))}
						className="flex min-w-[56px] flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-100 disabled:hover:bg-transparent"
					>
						<div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
							<UserAvatar
								userId={p.userId}
								name={p.nickname}
								avatarColor={p.avatarColor}
								avatarType={p.avatarType}
								notionConfig={p.notionAvatarConfig}
								size="lg"
								className="h-full w-full"
							/>
							{isMe && (
								<span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[8px] leading-3 text-primary-foreground">
									我
								</span>
							)}
						</div>
						<span className="max-w-[56px] truncate text-[10px] leading-tight text-muted-foreground">
							{p.nickname}
						</span>
					</button>
				)
			})}
		</div>
	)
}
