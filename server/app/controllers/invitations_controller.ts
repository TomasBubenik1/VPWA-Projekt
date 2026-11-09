import { announceMembership, isBanned } from '#services/channels'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

const pending = (id: number, userId: number) =>
  db
    .from('channel_invitations')
    .where('id', id)
    .where('invitee_id', userId)
    .where('status', 'pending')

export default class InvitationsController {
  async index({ auth }: HttpContext) {
    return db
      .from('channel_invitations')
      .join('channels', 'channels.id', 'channel_invitations.channel_id')
      .join('users as inviter', 'inviter.id', 'channel_invitations.inviter_id')
      .where('channel_invitations.invitee_id', auth.getUserOrFail().id)
      .where('channel_invitations.status', 'pending')
      .select(
        'channel_invitations.id',
        'channels.id as channelId',
        'channels.name as channelName',
        'channels.type as channelType',
        'inviter.nickname as inviterNickname'
      )
      .orderBy('channel_invitations.created_at', 'desc')
  }

  async accept({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channelId = await db.transaction(async (trx) => {
      const invitation = await pending(params.id, user.id).useTransaction(trx).first()
      if (!invitation) {
        response.abort({ message: 'Pozvánka neexistuje alebo už nie je platná.' }, 404)
      }
      if (await isBanned(invitation.channel_id, user.id, trx)) {
        response.abort({ message: 'Do kanála máte zakázaný prístup.' }, 403)
      }
      await trx
        .table('channel_memberships')
        .insert({ channel_id: invitation.channel_id, user_id: user.id })
        .onConflict()
        .ignore()
      await trx.from('channel_invitations').where('id', params.id).update({ status: 'accepted' })
      return Number(invitation.channel_id)
    })
    announceMembership(channelId, user.id, 'joined')
    return { channelId }
  }

  async decline({ auth, params, response }: HttpContext) {
    const changed = await pending(params.id, auth.getUserOrFail().id).update({ status: 'declined' })
    if (!changed) response.abort({ message: 'Pozvánka neexistuje alebo už nie je platná.' }, 404)
    return response.noContent()
  }
}
