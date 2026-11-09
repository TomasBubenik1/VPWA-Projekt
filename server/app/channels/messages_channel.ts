import type Message from '#models/message'
import type User from '#models/user'
import { isMember } from '#services/channels'
import { trackChannelConnection, untrackChannelConnection } from '#services/channel_connections'
import { messageMaxLength } from '#validators/message'
import { BaseChannel, SocketResponseError } from '@rlanz/socket'
import { onMessage } from '@rlanz/socket/decorators'
import type { AuthenticatedSocket, MiddlewareContext } from '@rlanz/socket/types'

type ServerEvents = {
  message: ReturnType<Message['toPayload']>
  typing: { userId: number; active: boolean }
  draft: { userId: number; content: string }
  membership: { userId: number; action: 'joined' | 'left' | 'removed' }
  deleted: { channelId: number }
}

async function requireMembership(ctx: MiddlewareContext<User>, next: () => Promise<void>) {
  const channelId = Number(ctx.params.id)
  if (!Number.isSafeInteger(channelId) || channelId < 1)
    throw new SocketResponseError('Kanál neexistuje.')
  if (!(await isMember(channelId, ctx.socket.getUserOrFail().id)))
    throw new SocketResponseError('Nie ste členom kanála.')
  await next()
}

export default class MessagesChannel extends BaseChannel<User, ServerEvents> {
  static pattern = 'channels/:id'
  static middlewares = [requireMembership]

  async onJoin(socket: AuthenticatedSocket<User>) {
    trackChannelConnection(Number(this.params.id), socket)
  }

  async onLeave(socket: AuthenticatedSocket<User>) {
    untrackChannelConnection(Number(this.params.id), socket)
    this.broadcast('typing', { userId: socket.getUserOrFail().id, active: false })
    this.broadcast('draft', { userId: socket.getUserOrFail().id, content: '' })
  }

  @onMessage('typing')
  async typing(socket: AuthenticatedSocket<User>, active: boolean) {
    if (typeof active !== 'boolean') throw new SocketResponseError('Neplatný stav písania.')
    this.broadcastExcept(socket.id, 'typing', { userId: socket.getUserOrFail().id, active })
  }

  @onMessage('draft')
  async draft(socket: AuthenticatedSocket<User>, content: string) {
    if (typeof content !== 'string' || content.length > messageMaxLength)
      throw new SocketResponseError('Neplatný rozpísaný text.')
    this.broadcastExcept(socket.id, 'draft', { userId: socket.getUserOrFail().id, content })
  }
}
