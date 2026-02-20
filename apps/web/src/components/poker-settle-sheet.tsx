import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import type {
	Balances,
	PokerMember,
	PokerTransaction,
} from '@/hooks/useYjsPoker'
import { computeSettlePlan } from '@/lib/settle'

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

/** 与 SettleItem 同构，用于统一渲染成员间结算与茶位费（to 为茶位费池） */
interface SettleRow {
	fromUserId: string
	fromNickname: string
	toUserId: string
	toNickname: string
	amount: number
}

interface PokerSettleSheetProps {
	open: boolean
	members: Array<PokerMember>
	balances: Balances
	transactions: Array<PokerTransaction>
	onClose: () => void
}

/** 从流水按支出方汇总茶位费，得到「谁 → 茶位费池：N 分」 */
function computeTeaSettleRows(
	transactions: Array<PokerTransaction>,
): Array<SettleRow> {
	const byFrom = new Map<string, { nickname: string; amount: number }>()
	for (const t of transactions) {
		if (t.teaAmount <= 0) continue
		const cur = byFrom.get(t.fromUserId)
		if (cur) {
			cur.amount += t.teaAmount
		} else {
			byFrom.set(t.fromUserId, { nickname: t.fromNickname, amount: t.teaAmount })
		}
	}
	return Array.from(byFrom.entries())
		.filter(([, v]) => v.amount > 0)
		.map(([fromUserId, v]) => ({
			fromUserId,
			fromNickname: v.nickname,
			toUserId: 'tea',
			toNickname: '茶位费池',
			amount: v.amount,
		}))
}

export function PokerSettleSheet({
	open,
	members,
	balances,
	transactions,
	onClose,
}: PokerSettleSheetProps) {
	const plan = useMemo(
		() => computeSettlePlan(balances, members),
		[balances, members],
	)

	const teaRows = useMemo(
		() => computeTeaSettleRows(transactions),
		[transactions],
	)

	const allRows: Array<SettleRow> = useMemo(
		() => [...plan, ...teaRows],
		[plan, teaRows],
	)

	const hasNonZeroBalance = members.some((m) => {
		const b = balances[m.userId] ?? 0
		return b !== 0
	})

	const hasAnySettle = allRows.length > 0

	return (
		<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
			<SheetContent
				side="bottom"
				className="rounded-t-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]"
			>
				<SheetHeader className="text-left">
					<SheetTitle>结算</SheetTitle>
					<SheetDescription>
						根据当前余额生成的线下结清方案，按此转账后所有人分数归零。
					</SheetDescription>
				</SheetHeader>

				<div className="px-5 pt-2">
					{allRows.length === 0 && !hasNonZeroBalance && (
						<p className="py-6 text-center text-sm text-muted-foreground">
							当前无需结算，大家余额均为 0。
						</p>
					)}
					{plan.length === 0 && hasNonZeroBalance && (
						<p className="py-6 text-center text-sm text-muted-foreground">
							余额未平衡，请检查流水或茶位费设置。
						</p>
					)}
					{hasAnySettle && (
						<ul className="space-y-3">
							{allRows.map((item, i) => (
								<li
									key={`${item.fromUserId}-${item.toUserId}-${i}`}
									className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
								>
									<span className="min-w-0 truncate text-sm font-medium">
										{item.fromNickname}
									</span>
									<span className="flex shrink-0 items-center gap-1 text-sm tabular-nums">
										<span className="font-semibold">{item.amount}</span>
										<span className="text-muted-foreground">分</span>
										<ArrowRight className="h-4 w-4 text-muted-foreground" />
									</span>
									<span className="min-w-0 truncate text-right text-sm font-medium">
										{item.toNickname}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
