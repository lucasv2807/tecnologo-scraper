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

type ListItem = {
	content: Segment[];
	children?: ListItem[];
};

type DescriptionItem =
	| { type: 'list'; items: ListItem[] }
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
		const tag = el.tagName.toLowerCase()

		if (tag === 'ul' || tag === 'ol') {
			return []
		}

		// caso link
		if (tag === 'a') {
			return [
				{
					type: 'link',
					content: el.textContent?.trim() || '',
					href: el.getAttribute('href') || ''
				}
			]
		}

		// caso imagen
		if (tag === 'img') {
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

function parseListItem(li: Element): ListItem {
	const content = Array.from(li.childNodes).flatMap(parseInline)
	const children = Array.from(li.children)
		.filter(child => {
			const tag = child.tagName.toLowerCase()
			return tag === 'ul' || tag === 'ol'
		})
		.flatMap(parseList)

	return {
		content,
		...(children.length > 0 ? { children } : {})
	}
}

function parseList(list: Element): ListItem[] {
	return Array.from(list.children)
		.filter(li => li.tagName.toLowerCase() === 'li')
		.map(parseListItem)
}

export const scrapeDescription = (html: string): DescriptionItem[] => {
	const dom = new JSDOM(html)
	const document = dom.window.document
	const root = document.body ?? document.documentElement

	return Array.from(root.children).flatMap((el): DescriptionItem[] => {
		const tag = el.tagName.toLowerCase()

		if (tag === 'ul' || tag === 'ol') {
			return [
				{
					type: 'list',
					items: parseList(el)
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