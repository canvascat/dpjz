import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { PokerMember } from '@/hooks/useYjsPoker'
import type { NotionAvatarConfig } from '@/lib/notion-avatar'

import { UserAvatar } from '@/components/notion-style-avatar'
import { Button } from '@/components/ui/button'
import { NumericKeypad } from '@/components/ui/numeric-keypad'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

/** 用于预览中展示的「支出方」信息 */
export interface TransferFromUser {
	userId: string
	nickname: string
	avatarColor: string
	avatarType?: 'text' | 'notion'
	notionAvatarConfig?: NotionAvatarConfig
}

interface PokerTransferSheetProps {
	/** 接收方，null 时关闭 */
	target: PokerMember | null
	/** 当前用户（支出方），用于预览头像 */
	fromUser: TransferFromUser
	/** 当前茶位费率 */
	teaRate: number
	/** 茶位费累计上限（分），达到后不再扣 */
	teaCap: number
	/** 当前茶池已累计（分） */
	teaBalance: number
	onConfirm: (toUserId: string, amount: number) => void
	onClose: () => void
}

export function PokerTransferSheet({
	target,
	fromUser,
	teaRate,
	teaCap,
	teaBalance,
	onConfirm,
	onClose,
}: PokerTransferSheetProps) {
	const [value, setValue] = useState('')

	useEffect(() => {
		if (target) setValue('')
	}, [target])

	const amount = value.trim() === '' ? 0 : parseInt(value, 10)
	const isValid =
		value.trim() !== '' && Number.isInteger(amount) && amount > 0
	// 茶位费已满（剩余可扣为 0）时不再扣，也不显示茶相关提示
	const effectiveCap = teaCap >= 1 ? teaCap : 0
	const remainingCap = Math.max(0, effectiveCap - teaBalance)
	const teaAmount =
		isValid && remainingCap > 0 && teaRate > 0
			? Math.min(
					Math.max(1, Math.floor(amount * teaRate)),
					remainingCap,
				)
			: 0
	const netAmount = isValid ? amount - teaAmount : 0
	const showTeaHint = teaRate > 0 && remainingCap > 0

	const handleConfirm = () => {
		if (!target || !isValid) return
		onConfirm(target.userId, amount)
		onClose()
	}

	return (
		<Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
			<SheetContent side="bottom" className="rounded-t-2xl">
				<SheetHeader className="text-left">
					<SheetTitle className="flex items-center gap-2">
						<span>转分给</span>
						{target && (
							<span className="inline-flex items-center gap-1.5">
								<UserAvatar
									userId={target.userId}
									name={target.nickname}
									avatarColor={target.avatarColor}
									avatarType={target.avatarType}
									notionConfig={target.notionAvatarConfig}
									size="sm"
								/>
								<span>{target.nickname}</span>
							</span>
						)}
					</SheetTitle>
					<SheetDescription>
						输入要转出的分数
						{showTeaHint
							? `，当前茶位费 ${Math.round(teaRate * 100)}%`
							: ''}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-5 pt-4 pb-4">
					{/* 预览：有输入时显示双方头像与分数，无输入时仅占位以保持弹层高度不变 */}
					<div className="flex min-h-[52px] items-center justify-center gap-3 rounded-lg bg-muted/60 p-3 text-sm">
						{isValid && target && (
							<>
								<div className="flex items-center gap-2">
									<UserAvatar
										userId={fromUser.userId}
										name={fromUser.nickname}
										avatarColor={fromUser.avatarColor}
										avatarType={fromUser.avatarType}
										notionConfig={fromUser.notionAvatarConfig}
										size="default"
										className="shrink-0"
									/>
									<span className="font-medium text-red-500">-{amount}</span>
								</div>
								<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
								<div className="flex items-center gap-2">
									<UserAvatar
										userId={target.userId}
										name={target.nickname}
										avatarColor={target.avatarColor}
										avatarType={target.avatarType}
										notionConfig={target.notionAvatarConfig}
										size="default"
										className="shrink-0"
									/>
									<span className="font-medium text-green-600">+{netAmount}</span>
								</div>
								{teaAmount > 0 && (
									<span className="text-xs text-muted-foreground">
										(茶 {teaAmount})
									</span>
								)}
							</>
						)}
					</div>

					{/* 页内数字键盘 */}
					<NumericKeypad
						value={value}
						onChange={(v) => {
							if (v === '') {
								setValue('')
								return
							}
							const n = parseInt(v, 10)
							if (!Number.isNaN(n)) setValue(String(Math.min(9999, n)))
						}}
						placeholder="输入分数"
						maxLength={4}
						showDisplay
						onLimitReached={() => toast.info('最多 9999 分')}
					/>

					{/* 确认 */}
					<Button
						onClick={handleConfirm}
						disabled={!isValid}
						className="w-full"
						size="lg"
					>
						确认转分
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
