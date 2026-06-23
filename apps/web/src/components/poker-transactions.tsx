import { ArrowRight } from 'lucide-react'
import type { PokerMember, PokerTransaction } from '@/hooks/useYjsPoker'
import { UserAvatar } from '@/components/notion-style-avatar'

function formatTime(ts: number): string {
	const d = new Date(ts)
	const now = new Date()
	const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
	// 不是今天则加日期
	if (d.toDateString() !== now.toDateString()) {
		return `${d.getMonth() + 1}/${d.getDate()} ${time}`
	}
	return time
}

interface PokerTransactionsProps {
	transactions: Array<PokerTransaction>
	members: Array<PokerMember>
	currentUserId: string
}

export function PokerTransactions({
	transactions,
	members,
	currentUserId,
}: PokerTransactionsProps) {
	const memberByUserId = (userId: string) =>
		members.find((m) => m.userId === userId)

	if (transactions.length === 0) {
		return (
			<div className="flex h-full items-center justify-center px-4">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">暂无流水</p>
					<p className="mt-1 text-xs text-muted-foreground/60">
						点击其他成员头像开始转分
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-1">
			{transactions.map((t) => {
				const isFrom = t.fromUserId === currentUserId
				const isTo = t.toUserId === currentUserId
				const netReceived = t.amount - t.teaAmount
				// 用当前成员资料展示，找不到则用流水快照
				const fromMember = memberByUserId(t.fromUserId)
				const toMember = memberByUserId(t.toUserId)
				const fromName = fromMember?.nickname ?? t.fromNickname
				const toName = toMember?.nickname ?? t.toNickname
				const fromAvatarColor = fromMember?.avatarColor ?? t.fromAvatarColor
				const toAvatarColor = toMember?.avatarColor ?? t.toAvatarColor
				const fromAvatarType = fromMember?.avatarType ?? t.fromAvatarType
				const toAvatarType = toMember?.avatarType ?? t.toAvatarType
				const fromNotionConfig =
					fromMember?.notionAvatarConfig ?? t.fromNotionAvatarConfig
				const toNotionConfig =
					toMember?.notionAvatarConfig ?? t.toNotionAvatarConfig

				return (
					<div
						key={t.id}
						className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
					>
						{/* 发送方头像：优先当前成员资料 */}
						<UserAvatar
							userId={t.fromUserId}
							name={fromName}
							avatarColor={fromAvatarColor}
							avatarType={fromAvatarType}
							notionConfig={fromNotionConfig}
							size="default"
						/>

						{/* 箭头 */}
						<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

						{/* 接收方头像：优先当前成员资料 */}
						<UserAvatar
							userId={t.toUserId}
							name={toName}
							avatarColor={toAvatarColor}
							avatarType={toAvatarType}
							notionConfig={toNotionConfig}
							size="default"
						/>

						{/* 内容 */}
						<div className="min-w-0 flex-1">
							<div className="flex items-baseline gap-1 text-sm">
								<span
									className={`font-medium ${isFrom ? 'text-red-500' : isTo ? 'text-green-600' : ''}`}
								>
									{t.amount}
								</span>
								<span className="text-muted-foreground">分</span>
								{t.teaAmount > 0 && (
									<span className="text-xs text-amber-600">
										(茶 {t.teaAmount})
									</span>
								)}
							</div>
							<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<span>{fromName}</span>
								<span>→</span>
								<span>{toName}</span>
								{isTo && <span className="text-green-600">+{netReceived}</span>}
								{isFrom && <span className="text-red-500">-{t.amount}</span>}
							</div>
						</div>

						{/* 时间 */}
						<span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
							{formatTime(t.timestamp)}
						</span>
					</div>
				)
			})}
		</div>
	)
}
