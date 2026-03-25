import { Context } from 'hono'
import { XMLParser, } from 'fast-xml-parser'
import { decode } from 'html-entities'
import { JSDOM } from 'jsdom'

interface News {
    title: string;
    description: string;
    author: string;
    guid: string;
    pubDate: string;
    link?: string;
}
type Segment =
    | { type: 'text'; content: string }
    | { type: 'link'; content: string; href: string }
    | { type: 'image'; src: string; alt?: string };

type DescriptionItem =
    | { type: 'list'; items: { content: Segment[] }[] }
    | Segment;

function parseInline(node: Node): Segment[] {
	// texto
	if (node.nodeType === 3) {
		const text = node.textContent?.trim()
		return text ? [{ type: 'text', content: text }] : []
	}

	// elemento
	if (node.nodeType === 1) {
		const el = node as Element

		// caso link
		if (el.tagName.toLowerCase() === 'a') {
			return [
				{
					type: 'link',
					content: el.textContent?.trim() || '',
					href: el.getAttribute('href') || ''
				}
			]
		}

		// caso imagen
		if (el.tagName.toLowerCase() === 'img') {
			const alt = el.getAttribute('alt')?.trim()

			return [
				{
					type: 'image',
					src: el.getAttribute('src') || '',
					...(alt ? { alt } : {})
				}
			]
		}

		// otros tags → seguir recorriendo
		return Array.from(el.childNodes).flatMap(parseInline)
	}

	return []
}

export const scrapeDescription = (html: string): DescriptionItem[] => {
	const dom = new JSDOM(html)
	const document = dom.window.document
	const root = document.body ?? document.documentElement

	return Array.from(root.children).flatMap((el): DescriptionItem[] => {
		const tag = el.tagName.toLowerCase()

		if (tag === 'ul') {
			return [
				{
					type: 'list',
					items: Array.from(el.children)
						.filter(li => li.tagName.toLowerCase() === 'li')
						.map(li => ({
							content: Array.from(li.childNodes).flatMap(parseInline)
						}))
				}
			]
		}

		if (tag === 'p') {
			return Array.from(el.childNodes).flatMap(parseInline)
		}

		return []
	})
}
export async function novedades(c: Context) {
	const parser = new XMLParser()
	const response = await fetch('https://www.fing.edu.uy/tecnoinf/mvd/rss/rss.xml')
	const xmlData = await response.text()
	const xmlDecoded = decode(xmlData)
	const jsonData: News[] = parser.parse(xmlDecoded).rss.channel.item
	const data = jsonData.map((news) => ({
		title: news.title,
		description: scrapeDescription(news.description),
		author: news.author,
		guid: news.guid,
		pubDate: news.pubDate,
		link: news.link,
	}))
	return c.json(data)
}