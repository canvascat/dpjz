'use client'

import { Delete } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface NumericKeypadProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	/** 最多位数，不传则不限制 */
	maxLength?: number
	/** 已达位数上限时用户继续输入时的回调，用于显示提示 */
	onLimitReached?: () => void
	/** 是否仅整数（不显示小数点键），默认 true */
	integerOnly?: boolean
	/** 是否显示上方数字展示区，默认 true；为 false 时仅渲染键盘，由外部提供展示 */
	showDisplay?: boolean
	/** 展示区 / 键盘容器 class */
	className?: string
	/** 展示区 class（仅当 showDisplay 为 true 时生效） */
	displayClassName?: string
	/** 键盘按钮触感反馈：按下时缩小，可选 */
	feedback?: boolean
}

const KEYS_1_9 = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function NumericKeypad({
	value,
	onChange,
	placeholder = '0',
	maxLength,
	onLimitReached,
	integerOnly = true,
	showDisplay = true,
	className,
	displayClassName,
	feedback = true,
}: NumericKeypadProps) {
	const handleDigit = (digit: string) => {
		if (maxLength != null && value.length >= maxLength) {
			onLimitReached?.()
			return
		}
		onChange(value + digit)
	}

	const handleBackspace = () => {
		onChange(value.slice(0, -1))
	}

	const btnClass = cn(
		'flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-xl font-semibold transition-colors select-none',
		'bg-muted hover:bg-muted/80 active:bg-muted/90',
		feedback && 'active:scale-95',
	)

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			{showDisplay && (
				<div
					role="textbox"
					tabIndex={0}
					aria-readonly
					className={cn(
						'border-input flex min-h-[48px] w-full min-w-0 items-center justify-center rounded-md border bg-transparent px-3 py-2 text-center text-2xl font-semibold tabular-nums shadow-xs outline-none transition-[color,box-shadow]',
						'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						value ? 'text-foreground' : 'text-muted-foreground',
						displayClassName,
					)}
				>
					{value || placeholder}
				</div>
			)}

			<div className="grid grid-cols-3 gap-2">
				{KEYS_1_9.map((d) => (
					<button
						key={d}
						type="button"
						className={btnClass}
						onClick={() => handleDigit(d)}
						aria-label={`数字 ${d}`}
					>
						{d}
					</button>
				))}
				{/* 第二行末尾留空，第三行 0 占两格、退格一格 */}
				<button
					type="button"
					className={cn(btnClass, 'col-span-2')}
					onClick={() => handleDigit('0')}
					aria-label="数字 0"
				>
					0
				</button>
				<button
					type="button"
					className={btnClass}
					onClick={handleBackspace}
					aria-label="退格"
				>
					<Delete className="size-5" />
				</button>
			</div>
		</div>
	)
}
