import { Check, Dices, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { NotionAvatarConfig } from '@/lib/notion-avatar'
import type { AvatarType } from '@/lib/user'
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
import { getRandomNotionAvatarConfig } from '@/lib/notion-avatar'
import { UserAvatar } from '@/components/notion-style-avatar'
import { cn } from '@/lib/utils'

interface ProfileSheetProps {
	trigger?: React.ReactNode
}

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false)
	useEffect(() => {
		const m = window.matchMedia('(pointer: coarse)')
		const update = () => setIsMobile(m.matches)
		update()
		m.addEventListener('change', update)
		return () => m.removeEventListener('change', update)
	}, [])
	return isMobile
}

export function ProfileSheet({ trigger }: ProfileSheetProps) {
	const { user, update } = useLocalUser()
	const [nickname, setNickname] = useState(user.nickname)
	// 草稿：仅保存后生效
	const [draftAvatarType, setDraftAvatarType] = useState<AvatarType>(
		user.avatarType,
	)
	const [draftColor, setDraftColor] = useState(user.avatarColor)
	const [draftNotionConfig, setDraftNotionConfig] = useState<
		NotionAvatarConfig | undefined
	>(user.notionAvatarConfig)
	const [open, setOpen] = useState(false)
	const isMobile = useIsMobile()

	const handleSave = () => {
		const trimmed = nickname.trim()
		if (trimmed.length > 0) {
			update({
				nickname: trimmed,
				avatarType: draftAvatarType,
				avatarColor: draftColor,
				notionAvatarConfig:
					draftAvatarType === 'notion' ? draftNotionConfig : undefined,
			})
		}
		setOpen(false)
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			setNickname(user.nickname)
			setDraftAvatarType(user.avatarType)
			setDraftColor(user.avatarColor)
			setDraftNotionConfig(user.notionAvatarConfig)
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
					<SheetDescription>修改你的昵称和头像，保存后生效</SheetDescription>
				</SheetHeader>

				<div className="space-y-6 px-5 pt-4 pb-4">
					{/* 预览（草稿） */}
					<div className="flex items-center gap-3">
						<UserAvatar
							userId={user.id}
							name={nickname || '?'}
							avatarColor={draftColor}
							avatarType={draftAvatarType}
							notionConfig={draftNotionConfig}
							size="lg"
							className="h-14 w-14 text-xl"
						/>
						<div>
							<p className="font-medium">{nickname || '未设置'}</p>
							<p className="text-xs text-muted-foreground">
								ID: {user.id.slice(0, 8)}...
							</p>
						</div>
					</div>

					<Separator />

					{/* 昵称 */}
					<div className="space-y-2.5">
						<label className="block text-sm font-medium">昵称</label>
						{isMobile ? (
							<div className="flex items-center gap-3">
								<span className="min-w-0 flex-1 truncate text-base text-foreground">
									{nickname || '未设置'}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="shrink-0"
									onClick={() => {
										const value = window.prompt('输入你的昵称', nickname || '')
										if (value !== null) {
											setNickname(value.trim().slice(0, 20))
										}
									}}
								>
									修改昵称
								</Button>
							</div>
						) : (
							<Input
								value={nickname}
								onChange={(e) => setNickname(e.target.value)}
								placeholder="输入你的昵称"
								maxLength={20}
								className="text-base"
							/>
						)}
					</div>

					{/* 头像：色块 = 文本头像，骰子 = 随机 Notion 头像 */}
					<div className="space-y-2.5">
						<label className="block text-sm font-medium">头像</label>
						<div className="flex flex-wrap items-center gap-3">
							{AVATAR_COLORS.map((color) => {
								const selected =
									draftAvatarType === 'text' && draftColor === color
								return (
									<button
										key={color}
										type="button"
										onClick={() => {
											setDraftAvatarType('text')
											setDraftColor(color)
										}}
										className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
										style={{ backgroundColor: color }}
									>
										{selected && (
											<Check className="h-5 w-5 text-white drop-shadow-sm" />
										)}
									</button>
								)
							})}
							{/* 骰子：随机 Notion 头像 */}
							<button
								type="button"
								onClick={() => {
									setDraftAvatarType('notion')
									setDraftNotionConfig(getRandomNotionAvatarConfig())
								}}
								className={cn(
									'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-transform active:scale-95',
									draftAvatarType === 'notion'
										? 'border-primary bg-primary/10 text-primary'
										: 'border-muted-foreground/30 bg-muted text-muted-foreground',
								)}
								title="随机 Notion 头像"
							>
								<Dices className="h-5 w-5" />
							</button>
						</div>
					</div>

					{/* 保存后头像才生效 */}
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
