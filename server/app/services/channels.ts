import Channel from '#models/channel'
import { disconnectChannel, disconnectChannelMember } from '#services/channel_connections'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract } from '@adonisjs/lucid/types/database'
import socket from '@rlanz/socket/services/main'
import { DateTime } from 'luxon'

type Response = HttpContext['response']
type MembershipAction = 'joined' | 'left' | 'removed'

export function channelPayload(channel: Channel) {
  return { id: channel.id, name: channel.name, type: channel.type, ownerId: channel.ownerId }
}

export async function findChannel(id: number, response: Response) {
  const channel = await Channel.find(id)
  if (!channel) return response.abort({ message: 'Kanál neexistuje.' }, 404)
  return channel
}

export async function findMemberChannel(id: number, userId: number, response: Response) {
  const channel = await findChannel(id, response)
  if (!(await isMember(channel.id, userId))) {
    response.abort({ message: 'Nie ste členom kanála.' }, 403)
  }
  return channel
}

export async function isMember(channelId: number, userId: number, client = db.connection()) {
  return hasRow(client, 'channel_memberships', channelId, userId)
}

export async function isBanned(channelId: number, userId: number, client = db.connection()) {
  return hasRow(client, 'channel_bans', channelId, userId)
}

async function hasRow(
  client: QueryClientContract,
  table: string,
  channelId: number,
  userId: number
) {
  const row = await client
    .from(table)
    .where('channel_id', channelId)
    .where('user_id', userId)
    .first()
  return Boolean(row)
}

/**
 * Creates the channel and its owner's membership. Returns null when the name is taken.
 */
export async function createChannel(name: string, type: 'public' | 'private', ownerId: number) {
  const channel = await db.transaction(async (trx) => {
    if (await Channel.query({ client: trx }).where('name', name).first()) return null
    const created = await Channel.create({ name, type, ownerId }, { client: trx })
    await trx.table('channel_memberships').insert({ channel_id: created.id, user_id: ownerId })
    return created
  })
  // A new public channel appears in everyone's discovery list without a reload.
  if (channel?.type === 'public') announceChannels(channel.id)
  return channel
}

/**
 * Global event telling every connected client to reload its channel lists.
 */
export function announceChannels(channelId: number) {
  socket.broadcast('channels', { channelId })
}

/**
 * Removes the membership together with every kick vote the user gave or received.
 */
export async function removeMembership(
  client: QueryClientContract,
  channelId: number,
  userId: number
) {
  const removed = await client
    .from('channel_memberships')
    .where('channel_id', channelId)
    .where('user_id', userId)
    .delete()
  await client
    .from('kick_votes')
    .where('channel_id', channelId)
    .where((query) => query.where('target_id', userId).orWhere('voter_id', userId))
    .delete()
  return Number(removed) > 0
}

export function announceMembership(channelId: number, userId: number, action: MembershipAction) {
  if (action !== 'joined') disconnectChannelMember(channelId, userId)
  socket.to(`channels/${channelId}`).emit('membership', { userId, action })
}

export async function deleteChannel(channelId: number) {
  await db.from('channels').where('id', channelId).delete()
  socket.to(`channels/${channelId}`).emit('deleted', { channelId })
  disconnectChannel(channelId)
  announceChannels(channelId)
}

/**
 * A channel without a new message for more than 30 days ceases to exist.
 */
export async function deleteInactiveChannels() {
  const cutoff = DateTime.now().minus({ days: 30 }).toFormat(db.connection().dialect.dateTimeFormat)
  const expired = await db
    .from('channels')
    .where('created_at', '<', cutoff)
    .whereNotExists((query) =>
      query
        .from('messages')
        .whereColumn('messages.channel_id', 'channels.id')
        .where('messages.created_at', '>=', cutoff)
    )
    .select('id')
  for (const { id } of expired) await deleteChannel(id)
}
