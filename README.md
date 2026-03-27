# Tecnologo API

Monorepo que transforma contenido del sitio oficial del Tecnólogo en Informática (HTML + RSS) a JSON consumible, y lo publica junto con una web en Astro.

## Por qué este proyecto es necesario

La información académica oficial suele estar distribuida en páginas HTML con estructura variable y en feeds RSS con contenido incrustado. Eso complica:

- Integración con apps web o móviles.
- Reutilización de datos sin re-scrapear cada vez.
- Consistencia entre secciones (faq, novedades, perfil, revalidas, etc.).

Este proyecto resuelve ese problema con una API que normaliza fuentes heterogéneas en contratos JSON estables.

## Qué hace exactamente

- Consume fuentes oficiales del Tecnólogo en Informática.
- Parsea y normaliza estructuras no uniformes a objetos tipados.
- Expone endpoints HTTP con salida JSON.
- Incluye un frontend Astro que consume la API mediante API_URL configurable.

Fuente oficial: https://www.fing.edu.uy/tecnoinf/mvd/

## Arquitectura del monorepo

- app/api: API en TypeScript con Hono sobre Bun.
- app/web: frontend en Astro.

Flujo general:

1. API consulta páginas/fuentes RSS remotas.
2. API transforma y limpia el contenido.
3. API responde JSON estructurado.
4. Web consulta la API usando API_URL (por defecto http://localhost:3000) y renderiza vistas.

## Stack técnico

- Bun: runtime y gestor principal.
- TypeScript: tipado estático.
- Hono: capa HTTP de la API.
- JSDOM: parseo de HTML.
- fast-xml-parser: parseo RSS/XML.
- html-entities: decodificación de entidades.
- Astro: frontend.
- ESLint: linting.

## Endpoints reales de la API

Base local: http://localhost:3000

- GET /: mensaje de bienvenida y listado descriptivo de endpoints.
- GET /novedades: transforma noticias RSS a JSON estructurado.
- GET /oportunidades-laborales: agrupa oportunidades por año con enlaces.
- GET /faq: devuelve preguntas frecuentes por tema.
- GET /revalidas: normaliza equivalencias de revalidas desde tabla HTML.
- GET /perfil-de-ingreso: separa y estructura perfil de ingreso y egreso.

## Requisitos

- Bun instalado.
- Conexión a internet (la API consulta fuentes remotas en tiempo real).
- Para la web: toolchain compatible con Node.js >= 22.12.0.

## Instalación

```sh
bun install
```

## Ejecución en desarrollo

Desde la raíz:

```sh
# API + web en paralelo
bun run dev
```

Nota: el script `bun run dev` carga variables desde un archivo `.env` en la raíz del repo.

O por workspace:

```sh
# solo API
bun run dev:api

# solo web
bun run dev:web
```

Puertos esperados en desarrollo:

- API: http://localhost:3000
- Web: http://localhost:4321

Configuracion de API para la web:

- Variable: API_URL
- Valor por defecto: http://localhost:3000
- Si no definis API_URL, la web usa localhost:3000 automaticamente.

Ejemplo en `.env` (raíz del monorepo):

```env
API_URL=http://localhost:3000
```

Ejemplo de ejecucion apuntando a otra API:

```sh
API_URL=http://localhost:4000 bun run dev:web
```

## Verificación rápida

Con la API levantada:

```sh
curl http://localhost:3000/
curl http://localhost:3000/faq
curl http://localhost:3000/novedades
curl http://localhost:3000/oportunidades-laborales
curl http://localhost:3000/revalidas
curl http://localhost:3000/perfil-de-ingreso
```

## Estructura de carpetas

```text
.
├── app/
│   ├── api/
│   │   └── src/
│   │       ├── index.ts
│   │       ├── scraper.ts
│   │       └── routes/
│   └── web/
│       └── src/
│           ├── pages/
│           ├── components/
│           ├── layouts/
│           └── styles/
├── package.json
└── README.md
```

## Limitaciones actuales

- El parseo depende de la estructura HTML externa; cambios en el sitio oficial pueden requerir ajustes en selectores/lógica.
- No hay cache persistente de respuestas: cada request vuelve a consultar la fuente remota.
- Si API_URL no se configura, la web asume localhost:3000 por defecto.
