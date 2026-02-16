/** 消息的通用类型，兼容 db-collections 的 Message 和 yjs 的 YjsMessage */
interface BaseMessage {
	id: string | number
	text: string
	user: string
}

/**
 * 根据用户名生成对应的头像背景色
 * @param username - 用户名
 * @returns tailwind 背景色 class
 */
export const getAvatarColor = (username: string) => {
	const colors = [
		'bg-blue-500',
		'bg-green-500',
		'bg-purple-500',
		'bg-pink-500',
		'bg-indigo-500',
		'bg-red-500',
		'bg-yellow-500',
		'bg-teal-500',
	]
	const index = username
		.split('')
		.reduce((acc, char) => acc + char.charCodeAt(0), 0)
	return colors[index % colors.length]
}

/**
 * 消息列表展示组件，支持多种消息类型
 * @param messages - 消息数组
 * @param user - 当前用户名（用于区分自己和他人的消息样式）
 */
export default function Messages({
	messages,
	user,
}: {
	messages: Array<BaseMessage>
	user: string
}) {
	return (
		<>
			{messages.map((msg: BaseMessage) => (
				<div
					key={msg.id}
					className={`flex ${msg.user === user ? 'justify-end' : 'justify-start'}`}
				>
					<div
						className={`flex max-w-xs items-start space-x-3 lg:max-w-md ${
							msg.user === user ? 'flex-row-reverse space-x-reverse' : ''
						}`}
					>
						<div
							className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(
								msg.user,
							)}`}
						>
							{msg.user.charAt(0).toUpperCase()}
						</div>

						<div
							className={`rounded-2xl px-4 py-2 ${
								msg.user === user
									? 'rounded-br-md bg-blue-500 text-white'
									: 'rounded-bl-md border border-gray-200 bg-white text-gray-800'
							}`}
						>
							{msg.user !== user && (
								<p className="mb-1 text-xs font-medium text-gray-500">
									{msg.user}
								</p>
							)}
							<p className="text-sm">{msg.text}</p>
						</div>
					</div>
				</div>
			))}
		</>
	)
}
