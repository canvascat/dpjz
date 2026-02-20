import type { Balances, PokerMember } from '@/hooks/useYjsPoker'

export interface SettleItem {
	fromUserId: string
	fromNickname: string
	toUserId: string
	toNickname: string
	amount: number
}

/**
 * 根据各成员余额计算结算方案：谁给谁多少（贪心，使转账笔数尽量少）。
 * 不包含茶池，仅成员间结算。
 */
export function computeSettlePlan(
	balances: Balances,
	members: Array<PokerMember>,
): SettleItem[] {
	const result: SettleItem[] = []
	const userIdToMember = new Map(members.map((m) => [m.userId, m]))

	// 只考虑成员，排除 tea
	const debtors: Array<{ userId: string; amount: number }> = []
	const creditors: Array<{ userId: string; amount: number }> = []

	for (const m of members) {
		const b = balances[m.userId] ?? 0
		if (b < 0) debtors.push({ userId: m.userId, amount: -b })
		if (b > 0) creditors.push({ userId: m.userId, amount: b })
	}

	// 贪心：每次取欠最多的和收最多的，结算 min(欠, 收)
	while (debtors.length > 0 && creditors.length > 0) {
		debtors.sort((a, b) => b.amount - a.amount)
		creditors.sort((a, b) => b.amount - a.amount)
		const d = debtors[0]
		const c = creditors[0]
		const amount = Math.min(d.amount, c.amount)
		if (amount <= 0) break

		const from = userIdToMember.get(d.userId)
		const to = userIdToMember.get(c.userId)
		if (from && to) {
			result.push({
				fromUserId: d.userId,
				fromNickname: from.nickname,
				toUserId: c.userId,
				toNickname: to.nickname,
				amount,
			})
		}

		d.amount -= amount
		c.amount -= amount
		if (d.amount <= 0) debtors.shift()
		if (c.amount <= 0) creditors.shift()
	}

	return result
}
