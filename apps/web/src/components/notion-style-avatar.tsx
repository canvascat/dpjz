'use client'

import { useEffect, useMemo, useState } from 'react'
import type { NotionAvatarConfig } from '@/lib/notion-avatar'
import { cn } from '@/lib/utils'
import {
	AVATAR_MAP,
	NOTION_AVATAR_LAYER_ORDER,
	getNotionAvatarConfig,
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

/**
 * 同步拼接头像 SVG：从 AVATAR_MAP 读 part 内容，去外层 <svg>，包成 <g>，再拼成根 <svg viewBox="0 0 1080 1080">。
 * @see https://github.com/Mayandev/notion-avatar (AvatarEditor generatePreview)
 */
function generatePreview(
	config: NotionAvatarConfig,
	flipped = false,
): string {
	const parts = NOTION_AVATAR_LAYER_ORDER
	const groups = parts.map((type) => {
			const svgRaw = AVATAR_MAP[type]?.[config[type]] ?? ''
			if (!svgRaw) throw new Error(`Avatar part ${type} index ${config[type]} not found`)
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
		})
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
	const config = configOverride ?? getNotionAvatarConfig(userId)

	const previewSvg = useMemo(() => {
		if (failed) return null
		try {
			return generatePreview(config, false)
		} catch {
			return null
		}
	}, [
		config.face,
		config.nose,
		config.mouth,
		config.eyes,
		config.eyebrows,
		config.hair,
		failed,
	])

	useEffect(() => {
		if (previewSvg === null && !failed) {
			setFailed(true)
			onError?.()
		}
	}, [previewSvg, failed, onError])

	if (failed || previewSvg === null) return null

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
