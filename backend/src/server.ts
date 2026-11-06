// Fastify API для polka: /health, /api/ask, /api/summarize, /api/items.
import './env.ts'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { askRoutes } from './routes/ask.ts'
import { summarizeRoutes } from './routes/summarize.ts'
import { itemsRoutes } from './routes/items.ts'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
})

app.get('/health', async () => ({ ok: true }))

await app.register(askRoutes)
await app.register(summarizeRoutes)
await app.register(itemsRoutes)

// Фронтенд ждёт JSON с полем `message`, поэтому отдаём именно его.
// Статус ставим через `reply.code()`: если вернуть объект из хендлера,
// fastify отправляет ответ как 200 (см. lib/error-handler.js → wrapThenable).
app.setErrorHandler((error: unknown, _request, reply) => {
  const err = error as { statusCode?: number; message?: string }

  const statusCode = typeof err.statusCode === 'number' && err.statusCode >= 400
    ? err.statusCode
    : 500

  if (statusCode >= 500) {
    app.log.error(error)
  }

  return reply.code(statusCode).send({ message: err.message || 'Внутренняя ошибка' })
})

const port = Number(process.env.PORT || 3001)

await app.listen({ port, host: '0.0.0.0' })
