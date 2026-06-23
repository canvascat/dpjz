import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import { PwaRefreshPrompt } from '@/components/pwa-refresh-prompt'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

interface MyRouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
})

function RootComponent() {
	return (
		<ThemeProvider>
			<Outlet />
			<PwaRefreshPrompt />
			<Toaster />
		</ThemeProvider>
	)
}
