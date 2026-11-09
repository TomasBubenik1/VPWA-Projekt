import Channel from '#models/channel'
import ChannelInvitation from '#models/channel_invitation'
import User from '#models/user'
import {
  announceMembership,
  channelPayload,
  createChannel,
  deleteChannel,
  findChannel,
  findMemberChannel,
  isBanned,
  isMember,
  removeMembership,
} from '#services/channels'
import {
  createChannelValidator,
  joinChannelValidator,
  nicknameValidator,
} from '#validators/channel'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import socket from '@rlanz/socket/services/main'
import { DateTime } from 'luxon'

const channelColumns = [
  'channels.id',
  'channels.name',
  'channels.type',
  'channels.owner_id as ownerId',
]

async function findUser(nickname: string, response: HttpContext['response']) {
  const user = await User.findBy('nickname', nickname.toLowerCase())
  if (!user) return response.abort({ message: 'Používateľ neexistuje.' }, 404)
  return user
}

async function joinPublicChannel(
  channel: Channel,
  userId: number,
  response: HttpContext['response']
) {
  if (channel.type !== 'public') {
    response.abort({ message: 'Do súkromného kanála treba pozvánku.' }, 403)
  }
  if (await isBanned(channel.id, userId)) {
    response.abort({ message: 'Do kanála máte zakázaný prístup.' }, 403)
  }
  const joined = await db.transaction(async (trx) => {
    if (await isMember(channel.id, userId, trx)) return false
    await trx.table('channel_memberships').insert({ channel_id: channel.id, user_id: userId })
    await trx
      .from('channel_invitations')
      .where('channel_id', channel.id)
      .where('invitee_id', userId)
      .where('status', 'pending')
      .update({ status: 'accepted' })
    return true
  })
  if (joined) announceMembership(channel.id, userId, 'joined')
  return channelPayload(channel)
}

export default class ChannelsController {
  async index({ auth }: HttpContext) {
    return db
      .from('channels')
      .join('channel_memberships', 'channels.id', 'channel_memberships.channel_id')
      .where('channel_memberships.user_id', auth.getUserOrFail().id)
      .select(channelColumns)
      .orderBy('channels.name')
  }

  async discover({ auth }: HttpContext) {
    const userId = auth.getUserOrFail().id
    return db
      .from('channels')
      .where('channels.type', 'public')
      .whereNotIn(
        'channels.id',
        db.from('channel_memberships').select('channel_id').where('user_id', userId)
      )
      .whereNotIn(
        'channels.id',
        db.from('channel_bans').select('channel_id').where('user_id', userId)
      )
      .select(channelColumns)
      .orderBy('channels.name')
  }

  async store({ auth, request, response }: HttpContext) {
    const { name, type } = await request.validateUsing(createChannelValidator)
    const channel = await createChannel(name, type, auth.getUserOrFail().id)
    if (!channel) return response.abort({ message: 'Názov kanála je obsadený.' }, 409)
    return response.created(channelPayload(channel))
  }

  async join({ auth, params, response }: HttpContext) {
    const channel = await findChannel(params.id, response)
    return joinPublicChannel(channel, auth.getUserOrFail().id, response)
  }

  /**
   * /join channelName [private]: joins an existing public channel or creates a new one.
   */
  async joinByName({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name, type = 'public' } = await request.validateUsing(joinChannelValidator)
    const existing = await Channel.findBy('name', name)
    if (existing) {
      if (type === 'private') response.abort({ message: 'Názov kanála je obsadený.' }, 409)
      return joinPublicChannel(existing, user.id, response)
    }
    const channel = await createChannel(name, type, user.id)
    if (!channel) return response.abort({ message: 'Názov kanála je obsadený.' }, 409)
    return response.created(channelPayload(channel))
  }

  async members({ auth, params, response }: HttpContext) {
    const channel = await findMemberChannel(params.id, auth.getUserOrFail().id, response)
    return db
      .from('users')
      .join('channel_memberships', 'users.id', 'channel_memberships.user_id')
      .where('channel_memberships.channel_id', channel.id)
      .select(
        'users.id',
        'users.first_name as firstName',
        'users.last_name as lastName',
        'users.nickname',
        'users.presence'
      )
      .orderBy('users.nickname')
  }

  /**
   * /invite nickName. The owner can also restore access of a banned user.
   */
  async invite({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findMemberChannel(params.id, user.id, response)
    const isOwner = channel.ownerId === user.id
    if (channel.type === 'private' && !isOwner) {
      response.abort({ message: 'Pozývať môže iba správca súkromného kanála.' }, 403)
    }
    const { nickname } = await request.validateUsing(nicknameValidator)
    const invitee = await findUser(nickname, response)
    if (await isMember(channel.id, invitee.id)) {
      response.abort({ message: 'Používateľ už je členom kanála.' }, 409)
    }
    const banned = await isBanned(channel.id, invitee.id)
    if (banned && !isOwner) response.abort({ message: 'Prístup môže obnoviť iba správca.' }, 403)

    const invitation = await db.transaction(async (trx) => {
      if (banned) {
        await trx
          .from('channel_bans')
          .where('channel_id', channel.id)
          .where('user_id', invitee.id)
          .delete()
      }
      const existing = await ChannelInvitation.query({ client: trx })
        .where('channel_id', channel.id)
        .where('invitee_id', invitee.id)
        .first()
      if (existing?.status === 'pending' && !banned) {
        response.abort({ message: 'Pozvánka už čaká na prijatie.' }, 409)
      }
      const values = { inviterId: user.id, status: 'pending', createdAt: DateTime.now() }
      if (existing) return existing.merge(values).useTransaction(trx).save()
      return ChannelInvitation.create(
        { ...values, channelId: channel.id, inviteeId: invitee.id },
        { client: trx }
      )
    })
    socket.to(`users/${invitee.id}`).emit('invitation', {
      id: invitation.id,
      channelId: channel.id,
      channelName: channel.name,
      inviterNickname: user.nickname,
    })
    return response.created({
      id: invitation.id,
      channelId: channel.id,
      inviteeId: invitee.id,
      status: invitation.status,
    })
  }

  /**
   * /kick nickName in a public channel. The owner bans immediately,
   * other members ban the user with three votes.
   */
  async kick({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findMemberChannel(params.id, user.id, response)
    if (channel.type !== 'public') {
      response.abort({ message: 'Vylúčenie hlasovaním je dostupné iba vo verejnom kanáli.' }, 403)
    }
    const { nickname } = await request.validateUsing(nicknameValidator)
    const target = await findUser(nickname, response)
    if (target.id === channel.ownerId) {
      response.abort({ message: 'Správcu kanála nemožno vylúčiť.' }, 403)
    }
    if (target.id === user.id) {
      response.abort({ message: 'Nemôžete hlasovať o vlastnom vylúčení.' }, 409)
    }

    const result = await db.transaction(async (trx) => {
      if (!(await isMember(channel.id, target.id, trx))) {
        response.abort({ message: 'Používateľ nie je členom kanála.' }, 404)
      }
      let votes = 0
      if (channel.ownerId !== user.id) {
        const vote = { channel_id: channel.id, target_id: target.id, voter_id: user.id }
        if (await trx.from('kick_votes').where(vote).first()) {
          response.abort({ message: 'Za vylúčenie ste už hlasovali.' }, 409)
        }
        await trx.table('kick_votes').insert(vote)
        // Votes are kept only while the voter is a member (removeMembership deletes them).
        const count = await trx
          .from('kick_votes')
          .where('channel_id', channel.id)
          .where('target_id', target.id)
          .count('* as total')
          .first()
        votes = Number(count?.total ?? 0)
        if (votes < 3) return { votes, banned: false }
      }
      await trx.table('channel_bans').insert({ channel_id: channel.id, user_id: target.id })
      await removeMembership(trx, channel.id, target.id)
      await trx
        .from('channel_invitations')
        .where('channel_id', channel.id)
        .where('invitee_id', target.id)
        .where('status', 'pending')
        .update({ status: 'declined' })
      return { votes, banned: true }
    })
    if (result.banned) announceMembership(channel.id, target.id, 'removed')
    return result
  }

  /**
   * /cancel. When the owner leaves, the channel ceases to exist.
   */
  async leave({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findMemberChannel(params.id, user.id, response)
    if (channel.ownerId === user.id) {
      await deleteChannel(channel.id)
      return response.noContent()
    }
    await db.transaction((trx) => removeMembership(trx, channel.id, user.id))
    announceMembership(channel.id, user.id, 'left')
    return response.noContent()
  }

  /**
   * /quit
   */
  async destroy({ auth, params, response }: HttpContext) {
    const channel = await findChannel(params.id, response)
    if (channel.ownerId !== auth.getUserOrFail().id) {
      response.abort({ message: 'Kanál môže zrušiť iba správca.' }, 403)
    }
    await deleteChannel(channel.id)
    return response.noContent()
  }

  /**
   * /revoke nickName in a private channel.
   */
  async revoke({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findChannel(params.id, response)
    if (channel.type !== 'private' || channel.ownerId !== user.id) {
      response.abort({ message: 'Člena môže odobrať iba správca súkromného kanála.' }, 403)
    }
    const target = await findUser(params.nickname, response)
    if (target.id === user.id) {
      response.abort({ message: 'Správca môže kanál iba opustiť alebo zrušiť.' }, 409)
    }
    const removed = await db.transaction((trx) => removeMembership(trx, channel.id, target.id))
    if (!removed) return response.abort({ message: 'Používateľ nie je členom kanála.' }, 404)
    announceMembership(channel.id, target.id, 'removed')
    return response.noContent()
  }
}
