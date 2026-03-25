import { Context } from 'hono'
import { JSDOM } from 'jsdom'

interface OportunidadLaboral {
	year: string
	items: OportunidadLaboralItem[]
}

interface OportunidadLaboralItem {
	text: string
	href: string
}

export async function oportunidadesLaborales(c: Context) {
	const sourceUrl = 'https://www.fing.edu.uy/tecnoinf/mvd/laboral/oportunidades_laborales.htm'
	const res = await fetch(sourceUrl)
	const html = await res.text()
	const doc = new JSDOM(html).window.document
	const uls = doc.querySelectorAll('body > ul')
	const data: OportunidadLaboral[] = []

	Array.from(uls).forEach((ul) => {
		let currentYear = ''

		Array.from(ul.children).forEach((child) => {
			if (child.tagName.toLowerCase() === 'li') {
				currentYear = child.textContent?.trim() ?? ''
				return
			}

			if (child.tagName.toLowerCase() === 'ul' && currentYear) {
				const items = Array.from(child.querySelectorAll(':scope > li'))
					.map((item): OportunidadLaboralItem | null => {
						const text = item.textContent?.trim() ?? ''
						const rawHref = item.querySelector('a')?.getAttribute('href') ?? ''

						if (!text) {
							return null
						}

						const href = rawHref ? new URL(rawHref, sourceUrl).toString() : ''

						return { text, href }
					})
					.filter((item): item is OportunidadLaboralItem => item !== null)

				if (items.length > 0) {
					data.push({
						year: currentYear,
						items,
					})
				}
			}
		})
	})

	return c.json(data)
}