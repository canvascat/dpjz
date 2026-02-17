'use client'

import { useEffect, useState } from 'react'
import type {NotionAvatarConfig, NotionAvatarPart} from '@/lib/notion-avatar';
import { cn } from '@/lib/utils'
import {
	NOTION_AVATAR_LAYER_ORDER,
	
	
	getNotionAvatarConfig
} from '@/lib/notion-avatar'

export interface NotionStyleAvatarProps {
	/** 用户 ID，未传 config 时用于确定性生成头像 */
	userId: string
	/** 自定义部件配置，优先于 userId 推导 */
	config?: NotionAvatarConfig
	size?: 'sm' | 'default' | 'lg'
	className?: string
	/** 任一 part 加载失败时调用 */
	onError?: () => void
}

const sizeClasses = {
	sm: 'h-6 w-6',
	default: 'h-8 w-8',
	lg: 'h-10 w-10',
}

const sizeTextClasses = {
	sm: 'text-[10px]',
	default: 'text-xs',
	lg: 'text-sm',
}

/** 与 notion-avatar AvatarEditor 一致：使用 preview 目录，文件名为数字 */
function partUrl(part: NotionAvatarPart, index: number): string {
	return `/avatar/preview/${part}/${index}.svg`
}

/**
 * 与 notion-avatar generatePreview 完全一致：按 part 顺序拉取 preview SVG，去外层 <svg>，包成 <g>，再拼成根 <svg viewBox="0 0 1080 1080">。
 * @see https://github.com/Mayandev/notion-avatar (AvatarEditor generatePreview)
 */
async function generatePreview(
	config: NotionAvatarConfig,
	flipped = false,
): Promise<string> {
	const parts = NOTION_AVATAR_LAYER_ORDER
	const groups = await Promise.all(
		parts.map(async (type) => {
			const url = partUrl(type, config[type])
			const res = await fetch(url)
			if (!res.ok) throw new Error(url)
			const svgRaw = await res.text()
			// 与官方一致：去掉外层 <svg> 和 </svg>，只保留内部内容
			const inner = svgRaw
				.replace(/<svg[\s\S]*?>/i, '')
				.replace(/<\/svg>\s*$/i, '')
				.trim()
			const faceFill = type === 'face' ? ' fill="#ffffff"' : ''
			const flipTransform = flipped
				? ' transform="scale(-1,1) translate(-1080, 0)"'
				: ''
			return `\n<g id="notion-avatar-${type}"${faceFill}${flipTransform}>\n${inner}\n</g>\n`
		}),
	)
	const SVGFilter = ''
	const previewSvg =
		`<svg viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">${SVGFilter}<g id="notion-avatar">${groups.join('\n\n')}</g></svg>`
			.trim()
			.replace(/(\n|\t)/g, '')
	return previewSvg
}

export function NotionStyleAvatar({
	userId,
	config: configOverride,
	size = 'default',
	className,
	onError,
}: NotionStyleAvatarProps) {
	const [failed, setFailed] = useState(false)
	const [previewSvg, setPreviewSvg] = useState<string | null>(null)
	const config = configOverride ?? getNotionAvatarConfig(userId)

	useEffect(() => {
		let cancelled = false
		generatePreview(config, false)
			.then((svg) => {
				if (!cancelled) setPreviewSvg(svg)
			})
			.catch(() => {
				if (!cancelled) {
					setFailed(true)
					onError?.()
				}
			})
		return () => {
			cancelled = true
		}
	}, [JSON.stringify(config), onError])

	if (failed) return null

	if (previewSvg === null) {
		return (
			<div
				className={cn(
					'shrink-0 animate-pulse rounded-full bg-muted',
					sizeClasses[size],
					className,
				)}
				aria-hidden
			/>
		)
	}

	// 让注入的根 <svg> 填满容器，与官方预览一致缩放
	const svgWithSize = previewSvg.replace(
		/<svg /,
		'<svg style="width:100%;height:100%;display:block" ',
	)
	return (
		<div
			className={cn(
				'shrink-0 overflow-hidden rounded-full bg-muted [&_svg]:block',
				sizeClasses[size],
				className,
			)}
			aria-hidden
			dangerouslySetInnerHTML={{ __html: svgWithSize }}
		/>
	)
}

/** 用户头像：按类型显示文本头像（首字母+颜色）或 Notion 风格 */
export interface UserAvatarProps {
	userId: string
	name: string
	/** 文本头像时的背景色 */
	avatarColor: string
	/** 头像类型：文本 或 Notion */
	avatarType?: 'text' | 'notion'
	/** Notion 头像配置，仅当 avatarType 为 notion 时使用 */
	notionConfig?: NotionAvatarConfig
	size?: 'sm' | 'default' | 'lg'
	className?: string
	title?: string
}

export function UserAvatar({
	userId,
	name,
	avatarColor,
	avatarType = 'text',
	notionConfig,
	size = 'default',
	className,
	title,
}: UserAvatarProps) {
	const [useFallback, setUseFallback] = useState(false)
	const showNotion = avatarType === 'notion' && notionConfig && !useFallback

	if (!showNotion) {
		return (
			<div
				className={cn(
					'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
					sizeClasses[size],
					sizeTextClasses[size],
					className,
				)}
				style={{ backgroundColor: avatarColor }}
				title={title}
			>
				{(name || '?').charAt(0).toUpperCase()}
			</div>
		)
	}

	return (
		<span className="inline-block" title={title}>
			<NotionStyleAvatar
				userId={userId}
				config={notionConfig}
				size={size}
				className={className}
				onError={() => setUseFallback(true)}
			/>
		</span>
	)
}
