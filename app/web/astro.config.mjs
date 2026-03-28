// @ts-check

import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

export default defineConfig({
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
	site: process.env.ASTRO_SITE || 'https://www.tudominio.com',
	integrations: [mdx(), sitemap()],
})
