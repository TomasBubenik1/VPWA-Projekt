import type User from '#models/user'
import type { AuthenticatedSocket } from '@rlanz/socket/types'

const connections = new Map<number, Set<AuthenticatedSocket<User>>>()

export function trackUserConnection(socket: AuthenticatedSocket<User>) {
  const userId = socket.getUserOrFail().id
  const sockets = connections.get(userId) ?? new Set<AuthenticatedSocket<User>>()
  sockets.add(socket)
  connections.set(userId, sockets)
}

export function untrackUserConnection(socket: AuthenticatedSocket<User>) {
  const userId = socket.getUserOrFail().id
  const sockets = connections.get(userId)
  if (!sockets) return
  sockets.delete(socket)
  if (sockets.size === 0) connections.delete(userId)
}

export function disconnectUser(userId: number) {
  for (const socket of connections.get(userId) ?? []) socket.disconnect()
}
