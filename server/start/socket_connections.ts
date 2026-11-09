import type User from '#models/user'
import { trackUserConnection, untrackUserConnection } from '#services/user_connections'
import socket from '@rlanz/socket/services/main'
import type { AuthenticatedSocket } from '@rlanz/socket/types'

socket.on('connect', ({ socket: connection }) => {
  trackUserConnection(connection as AuthenticatedSocket<User>)
})

socket.on('disconnect', ({ socket: connection }) => {
  untrackUserConnection(connection as AuthenticatedSocket<User>)
})
