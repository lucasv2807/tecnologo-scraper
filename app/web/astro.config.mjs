// @ts-check

import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'

export default defineConfig({
	output: 'server',
	site: process.env.ASTRO_SITE || 'https://www.tudominio.com',
	integrations: [mdx(), sitemap()],
})
