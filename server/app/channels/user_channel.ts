import type User from '#models/user'
import { BaseChannel, SocketResponseError } from '@rlanz/socket'
import type { MiddlewareContext } from '@rlanz/socket/types'

async function requireOwnChannel(ctx: MiddlewareContext<User>, next: () => Promise<void>) {
  if (ctx.params.id !== String(ctx.socket.getUserOrFail().id))
    throw new SocketResponseError('Prístup odmietnutý.')
  await next()
}

export default class UserChannel extends BaseChannel<
  User,
  {
    invitation: { id: number; channelId: number; channelName: string; inviterNickname: string }
  }
> {
  static pattern = 'users/:id'
  static middlewares = [requireOwnChannel]
}
