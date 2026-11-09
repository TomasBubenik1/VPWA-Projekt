import type User from '#models/user'
import type { AuthenticatedSocket } from '@rlanz/socket/types'

const connections = new Map<number, Set<AuthenticatedSocket<User>>>()

export function trackChannelConnection(channelId: number, socket: AuthenticatedSocket<User>) {
  const members = connections.get(channelId) ?? new Set<AuthenticatedSocket<User>>()
  members.add(socket)
  connections.set(channelId, members)
}

export function untrackChannelConnection(channelId: number, socket: AuthenticatedSocket<User>) {
  const members = connections.get(channelId)
  members?.delete(socket)
  if (members?.size === 0) connections.delete(channelId)
}

export function disconnectChannelMember(channelId: number, userId: number) {
  for (const socket of connections.get(channelId) ?? []) {
    if (socket.getUserOrFail().id === userId) socket.disconnect()
  }
}

export function disconnectChannel(channelId: number) {
  for (const socket of connections.get(channelId) ?? []) socket.disconnect()
}
