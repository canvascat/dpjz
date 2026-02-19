import { useCallback, useEffect, useState } from 'react'

import type { LocalUser } from '@/lib/user'

import { getLocalUser, updateLocalUser } from '@/lib/user'

/**
 * 响应式的本地用户 hook
 * 监听 localStorage 中用户信息的变化，自动更新组件
 */
export function useLocalUser() {
	const [user, setUser] = useState<LocalUser>(() => getLocalUser())

	useEffect(() => {
		// 组件挂载时确保拿到最新数据
		setUser(getLocalUser())

		const handler = (e: Event) => {
			const detail = (e as CustomEvent<LocalUser>).detail
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime event may have no detail
			if (detail) {
				setUser(detail)
			} else {
				setUser(getLocalUser())
			}
		}

		window.addEventListener('local-user-changed', handler)
		return () => window.removeEventListener('local-user-changed', handler)
	}, [])

	const update = useCallback((updates: Partial<Omit<LocalUser, 'id'>>) => {
		const updated = updateLocalUser(updates)
		setUser(updated)
	}, [])

	return { user, update }
}
