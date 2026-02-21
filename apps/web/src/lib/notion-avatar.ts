/**
 * Notion 风格头像：基于 Mayandev/notion-avatar 的 part 叠放方案，资源为 CC0（Noto avatar）。
 * 根据 userId 确定性生成各部件索引，叠放顺序：face → nose → mouth → eyes → eyebrows → hair。
 */

/** 各 part 的选项数量（与 public/avatar/preview 下官方 notion-avatar 一致） */
export const NOTION_AVATAR_PART_COUNTS = {
	face: 6,
	nose: 5,
	mouth: 5,
	eyes: 5,
	eyebrows: 5,
	hair: 8,
} as const

export type NotionAvatarPart = keyof typeof NOTION_AVATAR_PART_COUNTS

export type NotionAvatarConfig = {
	[K in NotionAvatarPart]: number
}

/** 简单 hash 字符串为数字种子 */
function hashString(s: string): number {
	let h = 0
	for (let i = 0; i < s.length; i++) {
		h = (h << 5) - h + s.charCodeAt(i)
		h |= 0
	}
	return Math.abs(h)
}

/** 根据 userId 确定性生成 Notion 头像配置，同一 id 永远得到相同组合 */
export function getNotionAvatarConfig(userId: string): NotionAvatarConfig {
	const seed = hashString(userId)
	const config = {} as NotionAvatarConfig
	let s = seed
	const parts = Object.keys(
		NOTION_AVATAR_PART_COUNTS,
	) as Array<NotionAvatarPart>
	for (const part of parts) {
		const count = NOTION_AVATAR_PART_COUNTS[part]
		s = (s * 9301 + 49297) % 233280
		config[part] = s % count
	}
	return config
}

/** 随机生成一套 Notion 头像配置 */
export function getRandomNotionAvatarConfig(): NotionAvatarConfig {
	const config = {} as NotionAvatarConfig
	const parts = Object.keys(
		NOTION_AVATAR_PART_COUNTS,
	) as Array<NotionAvatarPart>
	for (const part of parts) {
		const count = NOTION_AVATAR_PART_COUNTS[part]
		config[part] = Math.floor(Math.random() * count)
	}
	return config
}

/** 叠放顺序（从底到顶） */
export const NOTION_AVATAR_LAYER_ORDER: Array<NotionAvatarPart> = [
	'face',
	'nose',
	'mouth',
	'eyes',
	'eyebrows',
	'hair',
]


const partModules = import.meta.glob<string>(
	'./**/*.svg',
	{
		eager: true,
		query: '?raw',
		import: 'default',
		base: '../assets/notion-avatar',
	},
)

// path 格式为 ./type/index.svg（如 ./face/0.svg）
const avatars = Object.entries(partModules).map(([path, raw]) => {
	const [type, index] = path.slice(2, -4).split('/')
	return { type, index, raw }
})

export const AVATAR_MAP = avatars.reduce(
	(map, { type, index, raw }) => {
		;(map[type as NotionAvatarPart] ??= [])[+index] = raw
		return map
	},
	Object.create(null) as Partial<Record<NotionAvatarPart, Array<string>>>,
)
 