'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
	getThemePreference,
	initTheme,
	setThemePreference,
	type ThemePreference,
} from '@/lib/theme'

const ThemeContext = createContext<{
	theme: ThemePreference
	setTheme: (value: ThemePreference) => void
} | null>(null)

export function useTheme() {
	const ctx = useContext(ThemeContext)
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
	return ctx
}

/** 在根布局挂载一次，从 localStorage 恢复主题并监听系统偏好 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<ThemePreference>(() => getThemePreference())

	useEffect(() => {
		initTheme()
	}, [])

	const setTheme = (value: ThemePreference) => {
		setThemePreference(value)
		setThemeState(value)
	}

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	)
}
