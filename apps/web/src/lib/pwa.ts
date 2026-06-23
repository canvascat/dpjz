/**
 * PWA 更新：供 main 注册后写入，供 UI 调起刷新
 */
let applyUpdate: (() => void) | null = null

export function setPwaApplyUpdate(fn: () => void): void {
	applyUpdate = fn
}

export function pwaApplyUpdate(): void {
	applyUpdate?.()
}

const PWA_NEED_REFRESH = 'pwa-need-refresh'

export function dispatchPwaNeedRefresh(): void {
	window.dispatchEvent(new CustomEvent(PWA_NEED_REFRESH))
}

export function onPwaNeedRefresh(callback: () => void): () => void {
	const handler = () => callback()
	window.addEventListener(PWA_NEED_REFRESH, handler)
	return () => window.removeEventListener(PWA_NEED_REFRESH, handler)
}
