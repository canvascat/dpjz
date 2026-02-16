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
	/** 茶位费累计上限（分），达到后不再扣 */
	teaCap: number
	onSave: (rate: number, teaCap: number) => void
	onClose: () => void
}

export function PokerTeaSheet({
	open,
	currentRate,
	teaBalance,
	teaCap,
	onSave,
	onClose,
}: PokerTeaSheetProps) {
	const [value, setValue] = useState('')
	const [capValue, setCapValue] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (open) {
			setValue(String(Math.round(currentRate * 100)))
			setCapValue(String(teaCap))
			setTimeout(() => inputRef.current?.focus(), 100)
		}
	}, [open, currentRate, teaCap])

	const percent = Number(value)
	const capNum = Number(capValue)
	const isRateValid =
		value.trim() !== '' &&
		Number.isFinite(percent) &&
		percent >= 0 &&
		percent <= 100
	const isCapValid =
		capValue.trim() !== '' &&
		Number.isInteger(capNum) &&
		capNum >= 1
	const isValid = isRateValid && isCapValid

	const handleSave = () => {
		if (!isValid) return
		onSave(percent / 100, Math.max(1, Math.floor(capNum)))
		onClose()
	}

	return (
		<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
			<SheetContent side="bottom" className="rounded-t-2xl">
				<SheetHeader className="text-left">
					<SheetTitle>茶位费设置</SheetTitle>
					<SheetDescription>
					设置扣除比例与累计上限，修改后从下一笔生效。每笔扣除为整数、最少 1
					分；累计达到上限后不再扣。
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-4 px-5 pt-4 pb-6">
					{/* 当前累计 / 上限 */}
					<div className="rounded-lg bg-muted/60 p-3 text-center">
						<p className="text-xs text-muted-foreground">
							茶池累计 / 当前上限 {teaCap}
						</p>
						<p className="text-2xl font-bold tabular-nums">
							{Number.isInteger(teaBalance)
								? teaBalance
								: teaBalance.toFixed(1)}
							<span className="text-base font-normal text-muted-foreground">
								{' '}
								/ {teaCap}
							</span>
						</p>
					</div>

					{/* 累计上限（可配置） */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							累计上限（分）
						</label>
						<Input
							type="number"
							inputMode="numeric"
							min={1}
							step={1}
							value={capValue}
							onChange={(e) => setCapValue(e.target.value)}
							placeholder="50"
							className="min-h-[44px] text-center"
						/>
						<p className="text-xs text-muted-foreground">
							茶位费累计达到此值后，后续转分不再扣茶位费。最小 1。
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
							设为 0 表示不收茶位费。例如设 10%，则每转 100
							分扣 10 分茶位费，接收方实得 90 分（扣除为整数，最少 1 分）。
						</p>
					</div>

					{/* 快捷选项 */}
					<div className="flex flex-wrap gap-2">
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
