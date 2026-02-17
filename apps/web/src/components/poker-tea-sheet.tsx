import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { NumericKeypad } from '@/components/ui/numeric-keypad'
import { cn } from '@/lib/utils'
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
	/** 茶位费累计上限（分），达到后不再扣 */
	teaCap: number
	onSave: (rate: number, teaCap: number) => void
	onClose: () => void
}

export function PokerTeaSheet({
	open,
	currentRate,
	teaCap,
	onSave,
	onClose,
}: PokerTeaSheetProps) {
	const [value, setValue] = useState('')
	const [capValue, setCapValue] = useState('')
	/** 当前正在用页内键盘编辑的字段 */
	const [activeField, setActiveField] = useState<'rate' | 'cap'>('rate')

	useEffect(() => {
		if (open) {
			setValue(String(Math.round(currentRate * 100)))
			setCapValue(String(teaCap))
			setActiveField('rate')
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

				<div className="space-y-4 px-5 pt-4 pb-4">
					{/* 累计上限（可配置）- 点击切换为键盘编辑对象 */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							累计上限（分）
						</label>
						<button
							type="button"
							onClick={() => setActiveField('cap')}
							className={cn(
								'border-input flex w-full min-h-[44px] items-center justify-center rounded-md border bg-transparent text-center text-lg font-semibold tabular-nums shadow-xs outline-none transition-[color,box-shadow]',
								activeField === 'cap'
									? 'border-ring ring-ring/50 ring-[3px]'
									: 'hover:bg-muted/50',
							)}
						>
							{capValue || '50'}
						</button>
						<p className="text-xs text-muted-foreground">
							茶位费累计达到此值后，后续转分不再扣茶位费。最小 1。
						</p>
					</div>

					{/* 扣除比例 - 点击切换为键盘编辑对象 */}
					<div className="space-y-2">
						<label className="text-sm font-medium">扣除比例 (%)</label>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setActiveField('rate')}
								className={cn(
									'border-input flex min-h-[48px] flex-1 items-center justify-center rounded-md border bg-transparent text-center text-xl font-semibold tabular-nums shadow-xs outline-none transition-[color,box-shadow]',
									activeField === 'rate'
										? 'border-ring ring-ring/50 ring-[3px]'
										: 'hover:bg-muted/50',
								)}
							>
								{value || '0'}
							</button>
							<span className="text-lg font-medium text-muted-foreground">
								%
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							设为 0 表示不收茶位费。例如设 10%，则每转 100
							分扣 10 分茶位费，接收方实得 90 分（扣除为整数，最少 1 分）。
						</p>
					</div>

					{/* 页内数字键盘：比例最大 100%，累计上限最大 9999 */}
					<NumericKeypad
						value={activeField === 'rate' ? value : capValue}
						onChange={(v) => {
							if (v === '') {
								activeField === 'rate' ? setValue('') : setCapValue('')
								return
							}
							const n = parseInt(v, 10)
							if (Number.isNaN(n)) return
							if (activeField === 'rate') {
								setValue(String(Math.min(100, n)))
							} else {
								setCapValue(String(Math.min(9999, n)))
							}
						}}
						placeholder={activeField === 'rate' ? '0' : '50'}
						maxLength={activeField === 'rate' ? 3 : 4}
						showDisplay={false}
					/>

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
