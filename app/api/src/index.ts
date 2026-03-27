import { Hono } from 'hono'
import { novedades } from './routes/novedades'
import { oportunidadesLaborales } from './routes/oportunidades-laborales'
import { faq } from './routes/faq'
import { revalidas } from './routes/revalidas'
import { perfilDeIngreso } from './routes/perfil-de-ingreso'

const app = new Hono()

app.get('/', async (c) => {
	return c.json({
		message: 'Bienvenido a la API del Tecnólogo en Programación',
		endpoints: {
			'/horarios': 'Obtiene los horarios de las materias',
			'/novedades': 'Obtiene las últimas novedades del instituto',
			'/oportunidades-laborales': 'Obtiene las oportunidades laborales disponibles',
			'/faq': 'Obtiene las preguntas frecuentes',
			'/revalidas': 'Obtiene información sobre revalidas',
			'/perfil-de-ingreso': 'Obtiene el perfil de ingreso del tecnólogo'
		}
	})
})
app.get('/novedades', novedades)
app.get('/oportunidades-laborales',oportunidadesLaborales)
app.get('/faq', faq)
app.get('/revalidas', revalidas)
app.get('/perfil-de-ingreso', perfilDeIngreso)

export default app
