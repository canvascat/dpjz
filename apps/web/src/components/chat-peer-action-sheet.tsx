import { Clipboard } from 'lucide-react'
import type { PeerInfo } from '@/hooks/useYjsChat'
import { UserAvatar } from '@/components/notion-style-avatar'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'

interface ChatPeerActionSheetProps {
	targetPeer: PeerInfo | null
	onClose: () => void
	onRequestClipboard: (peer: PeerInfo) => void
}

export function ChatPeerActionSheet({
	targetPeer,
	onClose,
	onRequestClipboard,
}: ChatPeerActionSheetProps) {
	const handleRequestClipboard = () => {
		if (targetPeer) {
			onRequestClipboard(targetPeer)
			onClose()
		}
	}

	return (
		<Sheet open={!!targetPeer} onOpenChange={(open) => !open && onClose()}>
			<SheetContent side="bottom" className="rounded-t-2xl">
				<SheetHeader className="text-left">
					<SheetTitle className="flex items-center gap-2">
						{targetPeer && (
							<>
								<UserAvatar
									userId={targetPeer.userId}
									name={targetPeer.nickname}
									avatarColor={targetPeer.avatarColor}
									avatarType={targetPeer.avatarType}
									notionConfig={targetPeer.notionAvatarConfig}
									size="sm"
								/>
								<span>对 {targetPeer.nickname} 的操作</span>
							</>
						)}
					</SheetTitle>
					<SheetDescription>选择要执行的操作</SheetDescription>
				</SheetHeader>

				<div className="space-y-2 px-5 pt-4 pb-6">
					<Button
						variant="outline"
						className="w-full justify-start gap-3 min-h-[44px]"
						onClick={handleRequestClipboard}
					>
						<Clipboard className="h-4 w-4 shrink-0" />
						读取剪切板
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
