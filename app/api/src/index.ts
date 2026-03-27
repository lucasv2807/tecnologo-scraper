import { Hono } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { cache } from 'hono/cache'
import { novedades } from './routes/novedades'
import { oportunidadesLaborales } from './routes/oportunidades-laborales'
import { faq } from './routes/faq'
import { revalidas } from './routes/revalidas'
import { perfilDeIngreso } from './routes/perfil-de-ingreso'
const app = new Hono()

app.use('*', rateLimiter({
	windowMs: 60 * 1000,
	limit: 100, // Limit each client to 100 requests per window
	keyGenerator: (c) => {
		const xff = c.req.header('x-forwarded-for')
		if (xff) return xff.split(',')[0].trim()

		const realIp = c.req.header('x-real-ip')
		if (realIp) return realIp

		const cfIp = c.req.header('cf-connecting-ip')
		if (cfIp) return cfIp

		return 'global'
	}
}))
app.use('*', cache({ 
	cacheName: 'api-cache', 
	cacheControl: 'max-age=60 stale-while-revalidate=300' 
}))

app.get('/', async (c) => {
	return c.json({
		message: 'Bienvenido a la API del Tecnólogo en Programación',
		endpoints: {
			'/novedades': 'Obtiene las últimas novedades del instituto',
			'/oportunidades-laborales': 'Obtiene las oportunidades laborales disponibles',
			'/faq': 'Obtiene las preguntas frecuentes',
			'/revalidas': 'Obtiene información sobre revalidas',
			'/perfil-de-ingreso': 'Obtiene el perfil de ingreso del tecnólogo'
		}
	})
})
app.get('/novedades', novedades)
app.get('/oportunidades-laborales', oportunidadesLaborales)
app.get('/faq', faq)
app.get('/revalidas', revalidas)
app.get('/perfil-de-ingreso', perfilDeIngreso)

export default app
