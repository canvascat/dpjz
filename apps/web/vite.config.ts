import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [
		tanstackRouter({ target: 'react', autoCodeSplitting: true }),
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tailwindcss(),
		viteReact(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'P2P 聊天',
				short_name: 'P2P 聊天',
				start_url: '/',
				display: 'standalone',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				icons: [
					{
						src: '/favicon.ico',
						sizes: '64x64 32x32 24x24 16x16',
						type: 'image/x-icon',
					},
					{ src: '/logo192.png', type: 'image/png', sizes: '192x192' },
					{ src: '/logo512.png', type: 'image/png', sizes: '512x512' },
				],
			},
		}),
	],
})
