import { Context } from "hono";
import { XMLParser, } from "fast-xml-parser"
import { decode } from "html-entities";

interface News {
    title: string;
    description: string;
    author: string;
    guid: string;
    pubDate: string;
    link?: string;
}

export async function novedades(c: Context) {
    const parser = new XMLParser()
    const response = await fetch('https://www.fing.edu.uy/tecnoinf/mvd/rss/rss.xml')
    const xmlData = await response.text()
    const xmlDecoded = decode(xmlData)
    const jsonData: News[] = parser.parse(xmlDecoded).rss.channel.item
    const data = jsonData.map((news) => ({
        title: news.title,
        description: news.description,
        author: news.author,
        guid: news.guid,
        pubDate: news.pubDate,
        link: news.link,
    }))
    return c.html(data.map((news) => news.description).join('<br><br>'))
}