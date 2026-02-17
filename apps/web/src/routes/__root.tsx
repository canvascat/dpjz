import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import { PwaRefreshPrompt } from '@/components/pwa-refresh-prompt'
import { Toaster } from '@/components/ui/sonner'

interface MyRouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
})

function RootComponent() {
	return (
		<>
			<Outlet />
			<PwaRefreshPrompt />
			<Toaster />
		</>
	)
}
