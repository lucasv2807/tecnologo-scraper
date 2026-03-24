import { Hono } from 'hono'
import { extractPageLinks } from './scraper'
import { novedades } from './routes/novedades'

const app = new Hono()

app.get('/', async (c) => {
  const url = c.req.query('url')
  if (!url) {
    return c.json({ error: 'URL is required' }, 400)
  }

  try {
    const links = await extractPageLinks(url)

    console.log(`Links found in ${url} (${links.length}):`)
    for (const link of links) {
      console.log(link)
    }

    return c.json({
      source: url,
      total: links.length,
      links,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return c.json({ error: message }, 500)
  }
})
app.get('/novedades', novedades)

export default app
