/** 茶位费累计上限（分），达到后后续转分不再扣茶位费。默认 50，可通过 VITE_TEA_CAP 覆盖 */
export const TEA_CAP = Number(import.meta.env.VITE_TEA_CAP) || 50

const SIGNALING_STORAGE_KEY = 'dpjz-custom-signaling'

/** 从 localStorage 读取用户配置的自定义信令地址（单个） */
export function getCustomSignalingUrl(): string {
	if (typeof localStorage === 'undefined') return ''
	const raw = localStorage.getItem(SIGNALING_STORAGE_KEY)
	return raw != null ? String(raw).trim() : ''
}

/** 保存自定义信令地址（单个） */
export function setCustomSignalingUrl(value: string) {
	try {
		if (value.trim()) {
			localStorage.setItem(SIGNALING_STORAGE_KEY, value.trim())
		} else {
			localStorage.removeItem(SIGNALING_STORAGE_KEY)
		}
	} catch {
		// ignore
	}
}

/** 默认信令地址（环境变量），未配置时为空字符串 */
export function getDefaultSignalingUrl(): string {
	const env = import.meta.env.VITE_SIGNALING_URL
	if (env != null && typeof env === 'string' && env.trim()) return env.trim()
	return ''
}

/**
 * 当前使用的信令地址：有自定义则用自定义，否则用环境变量 VITE_SIGNALING_URL。返回数组供 WebrtcProvider 使用。
 */
export function getSignalingUrls(): string[] {
	const custom = getCustomSignalingUrl()
	if (custom) return [custom]
	const env = getDefaultSignalingUrl()
	if (env) return [env]
	return []
}
