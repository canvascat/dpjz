import { ArrowRight } from 'lucide-react'
import type { PokerTransaction } from '@/hooks/useYjsPoker'


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
	currentUserId: string
}

export function PokerTransactions({
	transactions,
	currentUserId,
}: PokerTransactionsProps) {
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

				return (
					<div
						key={t.id}
						className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40"
					>
						{/* 发送方头像 */}
						<div
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style={{ backgroundColor: t.fromAvatarColor }}
						>
							{t.fromNickname.charAt(0).toUpperCase()}
						</div>

						{/* 箭头 */}
						<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

						{/* 接收方头像 */}
						<div
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style={{ backgroundColor: t.toAvatarColor }}
						>
							{t.toNickname.charAt(0).toUpperCase()}
						</div>

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
								<span>{t.fromNickname}</span>
								<span>→</span>
								<span>{t.toNickname}</span>
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
