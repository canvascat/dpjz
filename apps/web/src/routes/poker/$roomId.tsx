import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PokerMember } from '@/hooks/useYjsPoker'

import { PokerMemberBar } from '@/components/poker-member-bar'
import { PokerSettleSheet } from '@/components/poker-settle-sheet'
import { PokerTeaSheet } from '@/components/poker-tea-sheet'
import { PokerTransferSheet } from '@/components/poker-transfer-sheet'
import { PokerTransactions } from '@/components/poker-transactions'
import { ProfileSheet } from '@/components/profile-sheet'
import { ShareDialog } from '@/components/share-dialog'
import { Button } from '@/components/ui/button'
import { useLocalUser } from '@/hooks/useLocalUser'
import { useRecentRooms } from '@/hooks/useRecentRooms'
import { useYjsPoker } from '@/hooks/useYjsPoker'

function PokerRoom() {
	const { roomId } = Route.useParams()
	const { user } = useLocalUser()
	const { add: addRecentRoom } = useRecentRooms()
	const {
		members,
		transactions,
		balances,
		teaRate,
		teaCap,
		onlineUserIds,
		connected,
		transfer,
		setTeaRate,
		setTeaCap,
	} = useYjsPoker(roomId, user)

	// 转分弹窗目标
	const [transferTarget, setTransferTarget] = useState<PokerMember | null>(null)
	// 茶位费弹窗
	const [teaOpen, setTeaOpen] = useState(false)
	// 结算弹窗
	const [settleOpen, setSettleOpen] = useState(false)
	// 个人信息抽屉（成员栏点击自己时打开）
	const [profileOpen, setProfileOpen] = useState(false)

	// 记录最近房间
	useEffect(() => {
		if (roomId) addRecentRoom(roomId, 'poker')
	}, [roomId])

	const teaBalance = balances['tea'] ?? 0

	return (
		<div className="flex h-dvh flex-col bg-background">
			{/* 顶部栏 */}
			<header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-4">
				<Link to="/">
					<Button variant="ghost" size="icon" className="h-9 w-9">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>

				<div className="min-w-0 flex-1">
					<h1 className="truncate text-sm font-semibold">{roomId}</h1>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<span
							className={`inline-block h-1.5 w-1.5 rounded-full ${
								connected ? 'bg-green-500' : 'bg-yellow-500'
							}`}
						/>
						<span>{connected ? `${members.length} 人参与` : '连接中...'}</span>
					</div>
				</div>

				<ShareDialog roomId={roomId} roomType="poker" />

				<ProfileSheet
					open={profileOpen}
					onOpenChange={setProfileOpen}
					trigger={
						<Button variant="ghost" size="icon" className="h-9 w-9">
							<User className="h-4 w-4" />
						</Button>
					}
				/>
			</header>

			{/* 成员栏 */}
			<PokerMemberBar
				members={members}
				balances={balances}
				currentUserId={user.id}
				onlineUserIds={onlineUserIds}
				teaRate={teaRate}
				teaBalance={teaBalance}
				onMemberClick={(m) => setTransferTarget(m)}
				onTeaClick={() => setTeaOpen(true)}
				onSelfClick={() => setProfileOpen(true)}
			/>

			{/* 流水记录 */}
			<div className="flex-1 overflow-y-auto overscroll-y-none px-1 py-2 sm:px-2">
				<PokerTransactions
					transactions={transactions}
					members={members}
					currentUserId={user.id}
				/>
			</div>

			{/* 底部操作栏 */}
			<footer className="flex shrink-0 items-center justify-center border-t bg-background px-4 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<Button
					variant="ghost"
					className="min-h-[44px] min-w-[44px]"
					onClick={() => setSettleOpen(true)}
				>
					结算
				</Button>
			</footer>

			{/* 转分 Sheet */}
			<PokerTransferSheet
				target={transferTarget}
				fromUser={{
					userId: user.id,
					nickname: user.nickname,
					avatarColor: user.avatarColor,
					avatarType: user.avatarType,
					notionAvatarConfig: user.notionAvatarConfig,
				}}
				teaRate={teaRate}
				teaCap={teaCap}
				teaBalance={teaBalance}
				onConfirm={transfer}
				onClose={() => setTransferTarget(null)}
			/>

			{/* 茶位费 Sheet */}
			<PokerTeaSheet
				open={teaOpen}
				currentRate={teaRate}
				teaCap={teaCap}
				onSave={(rate, cap) => {
					setTeaRate(rate)
					setTeaCap(cap)
				}}
				onClose={() => setTeaOpen(false)}
			/>

			{/* 结算 Sheet */}
			<PokerSettleSheet
				open={settleOpen}
				members={members}
				balances={balances}
				transactions={transactions}
				onClose={() => setSettleOpen(false)}
			/>
		</div>
	)
}

export const Route = createFileRoute('/poker/$roomId')({
	component: PokerRoom,
})
