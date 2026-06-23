const STORAGE_KEY = 'dpjz-theme'

export type ThemePreference = 'light' | 'dark' | 'system'

export function getThemePreference(): ThemePreference {
	if (typeof document === 'undefined') return 'system'
	try {
		const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
		if (stored === 'light' || stored === 'dark' || stored === 'system')
			return stored
	} catch {
		// ignore
	}
	return 'system'
}

export function setThemePreference(value: ThemePreference) {
	try {
		localStorage.setItem(STORAGE_KEY, value)
	} catch {
		// ignore
	}
	applyTheme(value)
}

function getSystemDark(): boolean {
	if (typeof window === 'undefined') return false
	return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getEffectiveDark(): boolean {
	const pref = getThemePreference()
	if (pref === 'light') return false
	if (pref === 'dark') return true
	return getSystemDark()
}

function applyTheme(pref: ThemePreference) {
	const dark = pref === 'system' ? getSystemDark() : pref === 'dark'
	const root = document.documentElement
	if (dark) {
		root.classList.add('dark')
	} else {
		root.classList.remove('dark')
	}
	const meta = document.querySelector('meta[name="theme-color"]')
	if (meta && 'content' in meta) {
		meta.content = dark ? '#0a0a0a' : '#ffffff'
	}
}

export function initTheme() {
	applyTheme(getThemePreference())
	if (typeof window !== 'undefined') {
		window
			.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', () => {
				if (getThemePreference() === 'system') applyTheme('system')
			})
	}
}
