import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PokerMember } from '@/hooks/useYjsPoker'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

interface PokerTransferSheetProps {
	/** 接收方，null 时关闭 */
	target: PokerMember | null
	/** 当前茶位费率 */
	teaRate: number
	onConfirm: (toUserId: string, amount: number) => void
	onClose: () => void
}

export function PokerTransferSheet({
	target,
	teaRate,
	onConfirm,
	onClose,
}: PokerTransferSheetProps) {
	const [value, setValue] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	// 打开时清空并聚焦
	useEffect(() => {
		if (target) {
			setValue('')
			setTimeout(() => inputRef.current?.focus(), 100)
		}
	}, [target])

	const amount = Number(value)
	const isValid = value.trim() !== '' && Number.isFinite(amount) && amount > 0
	const teaAmount = isValid ? Math.round(amount * teaRate * 100) / 100 : 0
	const netAmount = isValid ? amount - teaAmount : 0

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
								<span
									className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
									style={{ backgroundColor: target.avatarColor }}
								>
									{target.nickname.charAt(0).toUpperCase()}
								</span>
								<span>{target.nickname}</span>
							</span>
						)}
					</SheetTitle>
					<SheetDescription>
						输入要转出的分数
						{teaRate > 0 ? `，当前茶位费 ${Math.round(teaRate * 100)}%` : ''}
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-1 pt-4 pb-6">
					{/* 输入框 */}
					<Input
						ref={inputRef}
						type="number"
						inputMode="decimal"
						min="1"
						step="1"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleConfirm()
						}}
						placeholder="输入分数"
						className="min-h-[48px] text-center text-2xl font-semibold"
					/>

					{/* 预览 */}
					{isValid && (
						<div className="flex items-center justify-center gap-3 rounded-lg bg-muted/60 p-3 text-sm">
							<span className="font-medium text-red-500">-{amount}</span>
							<ArrowRight className="h-4 w-4 text-muted-foreground" />
							<span className="font-medium text-green-600">+{netAmount}</span>
							{teaAmount > 0 && (
								<span className="text-xs text-muted-foreground">
									(茶 {teaAmount})
								</span>
							)}
						</div>
					)}

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
