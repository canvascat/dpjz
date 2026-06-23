#!/usr/bin/env node
/**
 * 从 public/icon.svg 生成 favicon.ico、logo192.png、logo512.png
 * 需安装 sharp：pnpm add -D sharp
 */
import { readFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')
const svgPath = join(publicDir, 'icon.svg')

const dynamicImport = (id) => import(id)

async function main() {
	const sharp = (await dynamicImport('sharp')).default
	const svg = await readFile(svgPath)

	await mkdir(publicDir, { recursive: true })

	const sizes = [
		[32, 'favicon-32.png'],
		[192, 'logo192.png'],
		[512, 'logo512.png'],
	]

	for (const [size, name] of sizes) {
		await sharp(svg).resize(size, size).png().toFile(join(publicDir, name))
		console.log(`Generated ${name}`)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
