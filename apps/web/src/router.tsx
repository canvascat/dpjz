import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient()

export const router = createRouter({
	context: { queryClient },
	defaultPreload: 'intent',
	routeTree,
})

export { queryClient }

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
