import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { queryClient, router } from './router'
import { dispatchPwaNeedRefresh, setPwaApplyUpdate } from '@/lib/pwa'
import './styles.css'

const updateSW = registerSW({
	immediate: true,
	onNeedRefresh() {
		setPwaApplyUpdate(() => updateSW(true))
		dispatchPwaNeedRefresh()
	},
})

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
)
