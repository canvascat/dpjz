import { useEffect, useRef, useState } from 'react'

import Messages from './demo.messages'
import { useYjsChat } from '@/hooks/demo.useYjsChat'

/** 默认房间名 */
const DEFAULT_ROOM = 'yjs-chat-demo'

/**
 * 基于 Yjs P2P 的聊天区域组件
 * 使用 y-webrtc 进行端对端同步，y-indexeddb 本地持久化
 * 无需服务器即可实现多端聊天
 */
export default function YjsChatArea() {
	// 房间名状态
	const [roomName, setRoomName] = useState(DEFAULT_ROOM)
	// 房间名输入框临时值
	const [roomInput, setRoomInput] = useState(DEFAULT_ROOM)
	// 消息输入框
	const [message, setMessage] = useState('')
	// 当前用户
	const [user, setUser] = useState('Alice')

	// 使用 yjs 聊天 hook
	const { messages, sendMessage, peerCount, connected } = useYjsChat(roomName)

	// 消息列表自动滚动到底部
	const messagesEndRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	/**
	 * 发送消息处理
	 */
	const postMessage = () => {
		if (message.trim().length) {
			sendMessage(message, user)
			setMessage('')
		}
	}

	/**
	 * 回车键发送消息
	 */
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			postMessage()
		}
	}

	/**
	 * 切换房间
	 */
	const joinRoom = () => {
		const trimmed = roomInput.trim()
		if (trimmed.length > 0 && trimmed !== roomName) {
			setRoomName(trimmed)
		}
	}

	/**
	 * 房间名输入框回车切换房间
	 */
	const handleRoomKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			joinRoom()
		}
	}

	return (
		<>
			{/* 顶部状态栏：房间信息 + 在线状态 */}
			<div className="border-b border-gray-200 bg-white px-4 py-3">
				<div className="flex items-center justify-between">
					{/* 房间名输入区 */}
					<div className="flex items-center space-x-2">
						<span className="text-sm font-medium text-gray-500">房间：</span>
						<input
							type="text"
							value={roomInput}
							onChange={(e) => setRoomInput(e.target.value)}
							onKeyDown={handleRoomKeyPress}
							className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							placeholder="输入房间名..."
						/>
						<button
							onClick={joinRoom}
							disabled={
								roomInput.trim() === roomName || roomInput.trim().length === 0
							}
							className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
						>
							加入
						</button>
					</div>

					{/* 连接状态 + 在线人数 */}
					<div className="flex items-center space-x-3">
						<div className="flex items-center space-x-1">
							{/* 连接状态指示灯 */}
							<span
								className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`}
							/>
							<span className="text-xs text-gray-500">
								{connected ? '已连接' : '连接中...'}
							</span>
						</div>
						<span className="text-xs text-gray-400">|</span>
						<span className="text-xs text-gray-500">在线：{peerCount} 人</span>
					</div>
				</div>
			</div>

			{/* 消息列表区域 */}
			<div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
				{messages.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-gray-400">
							暂无消息，发送第一条消息开始聊天吧！
						</p>
					</div>
				) : (
					<Messages messages={messages} user={user} />
				)}
				{/* 滚动锚点 */}
				<div ref={messagesEndRef} />
			</div>

			{/* 底部输入区 */}
			<div className="border-t border-gray-200 bg-white px-4 py-4">
				<div className="flex items-center space-x-3">
					{/* 用户选择 */}
					<select
						value={user}
						onChange={(e) => setUser(e.target.value)}
						className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="Alice">Alice</option>
						<option value="Bob">Bob</option>
						<option value="Charlie">Charlie</option>
					</select>

					{/* 消息输入框 */}
					<div className="relative flex-1">
						<input
							type="text"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							onKeyDown={handleKeyPress}
							placeholder="输入消息..."
							className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
						/>
					</div>

					{/* 发送按钮 */}
					<button
						onClick={postMessage}
						disabled={message.trim() === ''}
						className="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						发送
					</button>
				</div>

				{/* P2P 提示信息 */}
				<p className="mt-2 text-xs text-gray-400">
					P2P 模式 · 数据通过 WebRTC 直接在浏览器间传输 · 本地通过 IndexedDB
					持久化
				</p>
			</div>
		</>
	)
}
