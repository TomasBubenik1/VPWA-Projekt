import Message from '#models/message'
import { findMemberChannel } from '#services/channels'
import { historyValidator, sendMessageValidator } from '#validators/message'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import socket from '@rlanz/socket/services/main'

const mentionPattern = /(?<![a-z0-9_])@([a-z][a-z0-9_]{2,31})\b/gi

export default class MessagesController {
  /**
   * Cursor pagination: returns the newest messages older than `before`
   * and the cursor for the next (older) page, or null at the beginning.
   */
  async index({ auth, params, request, response }: HttpContext) {
    const channel = await findMemberChannel(params.id, auth.getUserOrFail().id, response)
    const { before, limit = 30 } = await request.validateUsing(historyValidator, {
      data: request.qs(),
    })
    const rows = await Message.query()
      .where('channel_id', channel.id)
      .if(before, (query) => query.where('id', '<', before!))
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .preload('author')
      .preload('mentions')
    const page = rows.slice(0, limit)
    const oldest = page.at(-1)
    return {
      messages: page.reverse().map((message) => message.toPayload()),
      nextCursor: rows.length > limit && oldest ? oldest.id : null,
    }
  }

  async store({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findMemberChannel(params.id, user.id, response)
    const { content } = await request.validateUsing(sendMessageValidator)
    const nicknames = [...content.matchAll(mentionPattern)].map((match) => match[1]!.toLowerCase())
    const mentioned = nicknames.length
      ? await db
          .from('users')
          .join('channel_memberships', 'channel_memberships.user_id', 'users.id')
          .where('channel_memberships.channel_id', channel.id)
          .whereIn('users.nickname', nicknames)
          .select('users.id')
      : []

    const message = await db.transaction(async (trx) => {
      const created = await Message.create(
        { channelId: channel.id, authorId: user.id, content },
        { client: trx }
      )
      await created.related('mentions').attach(
        mentioned.map((row) => row.id),
        trx
      )
      return created
    })
    await message.load('author')
    await message.load('mentions')
    const payload = message.toPayload()
    socket.to(`channels/${channel.id}`).emit('message', payload)
    return response.created(payload)
  }
}
