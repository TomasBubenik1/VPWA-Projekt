import User from '#models/user'
import { consumeSocketTicket } from '#services/socket_tickets'
import app from '@adonisjs/core/services/app'
import { clientOrigins } from '#config/cors'
import { defineConfig } from '@rlanz/socket'

export default defineConfig({
  websocket: {
    path: '/socket',
    origin: app.inDev ? true : clientOrigins.length ? clientOrigins : undefined,
    async authenticate({ httpContext }) {
      const ticket = httpContext.request.input('ticket')
      if (typeof ticket !== 'string') return null
      const userId = consumeSocketTicket(ticket)
      const user = userId ? await User.find(userId) : null
      return user?.presence === 'offline' ? null : user
    },
  },
})
