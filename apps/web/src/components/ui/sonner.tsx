'use client'

import { Toaster as SonnerToaster } from 'sonner'

/** Sonner 挂载点，放在根布局即可 */
export function Toaster() {
	return (
		<SonnerToaster
			position="top-center"
			toastOptions={{
				className: 'rounded-lg',
			}}
		/>
	)
}
