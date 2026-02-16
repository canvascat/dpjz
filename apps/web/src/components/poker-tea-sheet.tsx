import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

interface PokerTeaSheetProps {
	open: boolean
	currentRate: number
	teaBalance: number
	onSave: (rate: number) => void
	onClose: () => void
}

export function PokerTeaSheet({
	open,
	currentRate,
	teaBalance,
	onSave,
	onClose,
}: PokerTeaSheetProps) {
	const [value, setValue] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (open) {
			setValue(String(Math.round(currentRate * 100)))
			setTimeout(() => inputRef.current?.focus(), 100)
		}
	}, [open, currentRate])

	const percent = Number(value)
	const isValid =
		value.trim() !== '' &&
		Number.isFinite(percent) &&
		percent >= 0 &&
		percent <= 100

	const handleSave = () => {
		if (!isValid) return
		onSave(percent / 100)
		onClose()
	}

	return (
		<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
			<SheetContent side="bottom" className="rounded-t-2xl">
				<SheetHeader className="text-left">
					<SheetTitle>茶位费设置</SheetTitle>
					<SheetDescription>
						设置每笔转分时自动扣除的比例，修改后从下一笔生效
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-1 pt-4 pb-6">
					{/* 当前累计 */}
					<div className="rounded-lg bg-muted/60 p-3 text-center">
						<p className="text-xs text-muted-foreground">茶池累计</p>
						<p className="text-2xl font-bold tabular-nums">
							{Number.isInteger(teaBalance)
								? teaBalance
								: teaBalance.toFixed(1)}
						</p>
					</div>

					{/* 比例输入 */}
					<div className="space-y-2">
						<label className="text-sm font-medium">扣除比例 (%)</label>
						<div className="flex items-center gap-2">
							<Input
								ref={inputRef}
								type="number"
								inputMode="decimal"
								min="0"
								max="100"
								step="1"
								value={value}
								onChange={(e) => setValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleSave()
								}}
								placeholder="0"
								className="min-h-[48px] text-center text-xl font-semibold"
							/>
							<span className="text-lg font-medium text-muted-foreground">
								%
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							设为 0 表示不收茶位费。例如设 10，则每转 100 分，接收方实得 90
							分。
						</p>
					</div>

					{/* 快捷选项 */}
					<div className="flex gap-2">
						{[0, 5, 10, 15, 20].map((p) => (
							<Button
								key={p}
								variant={percent === p ? 'default' : 'outline'}
								size="sm"
								className="flex-1"
								onClick={() => setValue(String(p))}
							>
								{p}%
							</Button>
						))}
					</div>

					{/* 保存 */}
					<Button
						onClick={handleSave}
						disabled={!isValid}
						className="w-full"
						size="lg"
					>
						保存
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
