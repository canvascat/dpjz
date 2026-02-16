import { Check, User } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import { useLocalUser } from '@/hooks/useLocalUser'
import { AVATAR_COLORS } from '@/lib/user'

interface ProfileSheetProps {
	trigger?: React.ReactNode
}

export function ProfileSheet({ trigger }: ProfileSheetProps) {
	const { user, update } = useLocalUser()
	const [nickname, setNickname] = useState(user.nickname)
	const [selectedColor, setSelectedColor] = useState(user.avatarColor)
	const [open, setOpen] = useState(false)

	const handleSave = () => {
		const trimmed = nickname.trim()
		if (trimmed.length > 0) {
			update({ nickname: trimmed, avatarColor: selectedColor })
		}
		setOpen(false)
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			// 打开时同步最新数据
			setNickname(user.nickname)
			setSelectedColor(user.avatarColor)
		}
		setOpen(isOpen)
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetTrigger asChild>
				{trigger ?? (
					<Button variant="ghost" size="icon" className="h-9 w-9">
						<User className="h-4 w-4" />
					</Button>
				)}
			</SheetTrigger>
			<SheetContent side="bottom" className="rounded-t-2xl">
				<SheetHeader className="text-left">
					<SheetTitle>个人信息</SheetTitle>
					<SheetDescription>修改你的昵称和头像颜色</SheetDescription>
				</SheetHeader>

				<div className="space-y-6 px-1 pt-4 pb-6">
					{/* 预览 */}
					<div className="flex items-center gap-3">
						<div
							className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-white"
							style={{ backgroundColor: selectedColor }}
						>
							{(nickname || '?').charAt(0).toUpperCase()}
						</div>
						<div>
							<p className="font-medium">{nickname || '未设置'}</p>
							<p className="text-xs text-muted-foreground">
								ID: {user.id.slice(0, 8)}...
							</p>
						</div>
					</div>

					<Separator />

					{/* 昵称 */}
					<div className="space-y-2">
						<label className="text-sm font-medium">昵称</label>
						<Input
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							placeholder="输入你的昵称"
							maxLength={20}
							className="text-base"
						/>
					</div>

					{/* 头像颜色 */}
					<div className="space-y-2">
						<label className="text-sm font-medium">头像颜色</label>
						<div className="flex flex-wrap gap-3">
							{AVATAR_COLORS.map((color) => (
								<button
									key={color}
									onClick={() => setSelectedColor(color)}
									className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
									style={{ backgroundColor: color }}
								>
									{selectedColor === color && (
										<Check className="h-5 w-5 text-white" />
									)}
								</button>
							))}
						</div>
					</div>

					{/* 保存 */}
					<Button
						onClick={handleSave}
						className="w-full"
						size="lg"
						disabled={!nickname.trim()}
					>
						保存
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
