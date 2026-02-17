import { Coffee } from 'lucide-react'
import type { Balances, PokerMember } from '@/hooks/useYjsPoker'
import { UserAvatar } from '@/components/notion-style-avatar'

interface PokerMemberBarProps {
	members: Array<PokerMember>
	balances: Balances
	currentUserId: string
	onlineUserIds: Set<string>
	teaRate: number
	teaBalance: number
	onMemberClick: (member: PokerMember) => void
	onTeaClick: () => void
}

function formatScore(n: number): string {
	if (n === 0) return '0'
	const sign = n > 0 ? '+' : ''
	// 整数不显示小数
	return `${sign}${Number.isInteger(n) ? n : n.toFixed(1)}`
}

function scoreColor(n: number): string {
	if (n > 0) return 'text-green-600'
	if (n < 0) return 'text-red-500'
	return 'text-muted-foreground'
}

export function PokerMemberBar({
	members,
	balances,
	currentUserId,
	onlineUserIds,
	teaRate,
	teaBalance,
	onMemberClick,
	onTeaClick,
}: PokerMemberBarProps) {
	return (
		<div className="flex shrink-0 items-start gap-1 overflow-x-auto border-b px-3 py-3 sm:px-4">
			{/* 成员列表 */}
			{members.map((m) => {
				const balance = balances[m.userId] ?? 0
				const isMe = m.userId === currentUserId
				const isOnline = onlineUserIds.has(m.userId)

				return (
					<button
						key={m.userId}
						disabled={isMe}
						onClick={() => onMemberClick(m)}
						className="flex min-w-[56px] flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-100 disabled:hover:bg-transparent"
					>
						{/* 头像 */}
						<div className="relative">
							<UserAvatar
								userId={m.userId}
								name={m.nickname}
								avatarColor={m.avatarColor}
								avatarType={m.avatarType}
								notionConfig={m.notionAvatarConfig}
								size="lg"
							/>
							{/* 在线指示灯 */}
							{isOnline && (
								<span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
							)}
							{isMe && (
								<span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[8px] leading-3 text-primary-foreground">
									我
								</span>
							)}
						</div>
						{/* 昵称 */}
						<span className="max-w-[56px] truncate text-[10px] leading-tight text-muted-foreground">
							{m.nickname}
						</span>
						{/* 分数 */}
						<span
							className={`text-xs font-semibold tabular-nums ${scoreColor(balance)}`}
						>
							{formatScore(balance)}
						</span>
					</button>
				)
			})}

			{/* 分隔线 */}
			{members.length > 0 && (
				<div className="mx-1 h-16 w-px shrink-0 self-center bg-border" />
			)}

			{/* 茶位费角色 */}
			<button
				onClick={onTeaClick}
				className="flex min-w-[56px] flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60 active:bg-muted"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
					<Coffee className="h-5 w-5" />
				</div>
				<span className="text-[10px] leading-tight text-muted-foreground">
					茶{teaRate > 0 ? ` ${Math.round(teaRate * 100)}%` : ''}
				</span>
				<span
					className={`text-xs font-semibold tabular-nums ${scoreColor(teaBalance)}`}
				>
					{formatScore(teaBalance)}
				</span>
			</button>
		</div>
	)
}
