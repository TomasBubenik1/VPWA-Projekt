import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

test.group('Chat API', (group) => {
  group.setup(() => testUtils.db().migrate())

  async function signup(client: ApiClient, name: string) {
    const suffix = Math.random().toString(36).slice(2, 10)
    const response = await client.post('/api/v1/auth/signup').json({
      firstName: name,
      lastName: 'Test',
      nickname: `${name.toLowerCase()}${suffix}`,
      email: `${name.toLowerCase()}${suffix}@example.test`,
      password: 'Passw0rd123',
      passwordConfirmation: 'Passw0rd123',
    })
    response.assertStatus(200)
    response.assertBodyContains({ user: { presence: 'online', notificationMode: 'all' } })
    return response.body() as { token: string; user: { id: number; nickname: string } }
  }

  test('profile settings and public join by name', async ({ client, assert }) => {
    const owner = await signup(client, 'Owner')
    const member = await signup(client, 'Member')
    const profile = await client
      .patch('/api/v1/account/profile')
      .bearerToken(owner.token)
      .json({ presence: 'dnd', notificationMode: 'mentionsOnly' })
    profile.assertStatus(200)
    assert.equal(profile.body().presence, 'dnd')
    assert.equal(profile.body().notificationMode, 'mentionsOnly')

    const created = await client
      .post('/api/v1/channels/join')
      .bearerToken(owner.token)
      .json({ name: 'sharedroom' })
    created.assertStatus(201)
    const joined = await client
      .post('/api/v1/channels/join')
      .bearerToken(member.token)
      .json({ name: 'sharedroom' })
    joined.assertStatus(200)
    assert.equal(joined.body().id, created.body().id)

    const messageUrl = `/api/v1/channels/${created.body().id}/messages`
    const acceptedMessage = await client
      .post(messageUrl)
      .bearerToken(owner.token)
      .json({ content: 'x'.repeat(4000) })
    acceptedMessage.assertStatus(201)
    const longMessage = await client
      .post(messageUrl)
      .bearerToken(owner.token)
      .json({ content: 'x'.repeat(4001) })
    longMessage.assertStatus(422)

    const privateChannel = await client
      .post('/api/v1/channels/join')
      .bearerToken(owner.token)
      .json({ name: 'privateone', type: 'private' })
    privateChannel.assertStatus(201)
    const denied = await client
      .post('/api/v1/channels/join')
      .bearerToken(member.token)
      .json({ name: 'privateone' })
    denied.assertStatus(403)
  })

  test('kick counts only votes from current members', async ({ client, assert }) => {
    const owner = await signup(client, 'Admin')
    const target = await signup(client, 'Target')
    const voterA = await signup(client, 'Votera')
    const voterB = await signup(client, 'Voterb')
    const voterC = await signup(client, 'Voterc')
    const channel = await client
      .post('/api/v1/channels/join')
      .bearerToken(owner.token)
      .json({ name: 'voteroom' })
    channel.assertStatus(201)
    const id = channel.body().id as number
    for (const member of [target, voterA, voterB, voterC]) {
      const joined = await client
        .post('/api/v1/channels/join')
        .bearerToken(member.token)
        .json({ name: 'voteroom' })
      joined.assertStatus(200)
    }
    const vote = (token: string) =>
      client
        .post(`/api/v1/channels/${id}/kicks`)
        .bearerToken(token)
        .json({ nickname: target.user.nickname })
    const firstVote = await vote(voterA.token)
    const secondVote = await vote(voterB.token)
    assert.equal(firstVote.body().votes, 1)
    assert.equal(secondVote.body().votes, 2)
    const left = await client.post(`/api/v1/channels/${id}/leave`).bearerToken(voterA.token)
    left.assertStatus(204)
    const lastVote = await vote(voterC.token)
    lastVote.assertStatus(200)
    assert.deepEqual(lastVote.body(), { votes: 2, banned: false })
    const members = await client.get(`/api/v1/channels/${id}/members`).bearerToken(owner.token)
    assert.ok(members.body().some((member: { id: number }) => member.id === target.user.id))
  })

  test('three votes ban a member and only the owner can restore access', async ({
    client,
    assert,
  }) => {
    const owner = await signup(client, 'Chief')
    const target = await signup(client, 'Banned')
    const voters = await Promise.all([
      signup(client, 'First'),
      signup(client, 'Second'),
      signup(client, 'Third'),
    ])
    const channel = await client
      .post('/api/v1/channels/join')
      .bearerToken(owner.token)
      .json({ name: 'banroom' })
    channel.assertStatus(201)
    const id = channel.body().id as number
    for (const user of [target, ...voters]) {
      const joined = await client
        .post('/api/v1/channels/join')
        .bearerToken(user.token)
        .json({ name: 'banroom' })
      joined.assertStatus(200)
    }
    for (const [index, voter] of voters.entries()) {
      const vote = await client
        .post(`/api/v1/channels/${id}/kicks`)
        .bearerToken(voter.token)
        .json({ nickname: target.user.nickname })
      vote.assertStatus(200)
      assert.equal(vote.body().banned, index === 2)
    }
    const blocked = await client.post(`/api/v1/channels/${id}/join`).bearerToken(target.token)
    blocked.assertStatus(403)
    const nonOwner = await client
      .post(`/api/v1/channels/${id}/invitations`)
      .bearerToken(voters[0]!.token)
      .json({ nickname: target.user.nickname })
    nonOwner.assertStatus(403)
    const invitation = await client
      .post(`/api/v1/channels/${id}/invitations`)
      .bearerToken(owner.token)
      .json({ nickname: target.user.nickname })
    invitation.assertStatus(201)
    const accepted = await client
      .post(`/api/v1/invitations/${invitation.body().id}/accept`)
      .bearerToken(target.token)
    accepted.assertStatus(200)
    const members = await client.get(`/api/v1/channels/${id}/members`).bearerToken(owner.token)
    assert.ok(members.body().some((member: { id: number }) => member.id === target.user.id))
  })

  test('deleting a channel frees its name and removes its data', async ({ client, assert }) => {
    const owner = await signup(client, 'Creator')
    const channel = await client
      .post('/api/v1/channels/join')
      .bearerToken(owner.token)
      .json({ name: 'reusable' })
    channel.assertStatus(201)
    const id = channel.body().id as number
    const sent = await client
      .post(`/api/v1/channels/${id}/messages`)
      .bearerToken(owner.token)
      .json({ content: 'Saved message' })
    sent.assertStatus(201)
    const deleted = await client.delete(`/api/v1/channels/${id}`).bearerToken(owner.token)
    deleted.assertStatus(204)
    const history = await client.get(`/api/v1/channels/${id}/messages`).bearerToken(owner.token)
    history.assertStatus(404)
    const recreated = await client
      .post('/api/v1/channels/join')
      .bearerToken(owner.token)
      .json({ name: 'reusable' })
    recreated.assertStatus(201)
    assert.notEqual(recreated.body().id, id)
    const empty = await client
      .get(`/api/v1/channels/${recreated.body().id}/messages`)
      .bearerToken(owner.token)
    assert.deepEqual(empty.body().messages, [])
  })

  test('private invitation grants access and revoke removes it', async ({ client, assert }) => {
    const owner = await signup(client, 'Privateowner')
    const guest = await signup(client, 'Privateguest')
    const created = await client
      .post('/api/v1/channels')
      .bearerToken(owner.token)
      .json({ name: 'private-room', type: 'private' })
    created.assertStatus(201)
    const id = created.body().id as number
    const messagesUrl = `/api/v1/channels/${id}/messages`

    const beforeInvite = await client.get(messagesUrl).bearerToken(guest.token)
    beforeInvite.assertStatus(403)
    const invitation = await client
      .post(`/api/v1/channels/${id}/invitations`)
      .bearerToken(owner.token)
      .json({ nickname: guest.user.nickname })
    invitation.assertStatus(201)
    const inbox = await client.get('/api/v1/invitations').bearerToken(guest.token)
    assert.ok(inbox.body().some((item: { id: number }) => item.id === invitation.body().id))

    const accepted = await client
      .post(`/api/v1/invitations/${invitation.body().id}/accept`)
      .bearerToken(guest.token)
    accepted.assertStatus(200)
    const sent = await client.post(messagesUrl).bearerToken(guest.token).json({ content: 'Ahoj' })
    sent.assertStatus(201)

    const revoked = await client
      .delete(`/api/v1/channels/${id}/members/${guest.user.nickname}`)
      .bearerToken(owner.token)
    revoked.assertStatus(204)
    const afterRevoke = await client.get(messagesUrl).bearerToken(guest.token)
    afterRevoke.assertStatus(403)
  })

  test('history uses a cursor and stores mentions of channel members', async ({
    client,
    assert,
  }) => {
    const owner = await signup(client, 'Historyowner')
    const member = await signup(client, 'Historymember')
    const created = await client
      .post('/api/v1/channels')
      .bearerToken(owner.token)
      .json({ name: 'history-room', type: 'public' })
    created.assertStatus(201)
    const id = created.body().id as number
    const joined = await client.post(`/api/v1/channels/${id}/join`).bearerToken(member.token)
    joined.assertStatus(200)
    const url = `/api/v1/channels/${id}/messages`
    for (const content of ['Prvá', `Ahoj @${member.user.nickname} @nobody`, 'Tretia']) {
      const sent = await client.post(url).bearerToken(owner.token).json({ content })
      sent.assertStatus(201)
    }

    const newer = await client.get(`${url}?limit=2`).bearerToken(member.token)
    newer.assertStatus(200)
    assert.equal(newer.body().messages.length, 2)
    assert.ok(newer.body().nextCursor)
    assert.deepEqual(newer.body().messages[0].mentions, [member.user.nickname])
    assert.match(newer.body().messages[0].createdAt, /(Z|[+-]\d\d:\d\d)$/)

    const older = await client
      .get(`${url}?limit=2&before=${newer.body().nextCursor}`)
      .bearerToken(member.token)
    older.assertStatus(200)
    assert.deepEqual(
      older.body().messages.map((message: { content: string }) => message.content),
      ['Prvá']
    )
    assert.isNull(older.body().nextCursor)
  })

  test('inactive channels expire and their names can be reused', async ({ client, assert }) => {
    const owner = await signup(client, 'Expiredowner')
    const created = await client
      .post('/api/v1/channels')
      .bearerToken(owner.token)
      .json({ name: 'expired-room', type: 'public' })
    created.assertStatus(201)
    await db
      .from('channels')
      .where('id', created.body().id)
      .update({
        created_at: DateTime.now()
          .minus({ days: 31 })
          .toFormat(db.connection().dialect.dateTimeFormat),
      })

    const channels = await client.get('/api/v1/channels').bearerToken(owner.token)
    channels.assertStatus(200)
    assert.isFalse(
      channels.body().some((channel: { id: number }) => channel.id === created.body().id)
    )
    const recreated = await client
      .post('/api/v1/channels')
      .bearerToken(owner.token)
      .json({ name: 'expired-room', type: 'public' })
    recreated.assertStatus(201)
  })

  test('signup rejects taken nickname and email, logout revokes the token', async ({ client }) => {
    const user = await signup(client, 'Unique')
    const duplicate = await client.post('/api/v1/auth/signup').json({
      firstName: 'Other',
      lastName: 'User',
      nickname: user.user.nickname.toUpperCase(),
      email: `fresh${user.user.id}@example.test`,
      password: 'Passw0rd123',
      passwordConfirmation: 'Passw0rd123',
    })
    duplicate.assertStatus(422)

    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: `${user.user.nickname}@example.test`, password: 'Passw0rd123' })
    login.assertStatus(200)
    const wrongPassword = await client
      .post('/api/v1/auth/login')
      .json({ email: `${user.user.nickname}@example.test`, password: 'wrong-password' })
    wrongPassword.assertStatus(400)

    const token = login.body().token as string
    const logout = await client.post('/api/v1/account/logout').bearerToken(token)
    logout.assertStatus(204)
    const profile = await client.get('/api/v1/account/profile').bearerToken(token)
    profile.assertStatus(401)
  })

  test('owner kicks immediately and only the owner can delete a channel', async ({
    client,
    assert,
  }) => {
    const owner = await signup(client, 'Kickowner')
    const member = await signup(client, 'Kicked')
    const created = await client
      .post('/api/v1/channels')
      .bearerToken(owner.token)
      .json({ name: 'kick-room', type: 'public' })
    const id = created.body().id as number
    await client.post(`/api/v1/channels/${id}/join`).bearerToken(member.token)

    const forbidden = await client.delete(`/api/v1/channels/${id}`).bearerToken(member.token)
    forbidden.assertStatus(403)
    const kicked = await client
      .post(`/api/v1/channels/${id}/kicks`)
      .bearerToken(owner.token)
      .json({ nickname: member.user.nickname })
    assert.deepEqual(kicked.body(), { votes: 0, banned: true })
    const rejoin = await client.post(`/api/v1/channels/${id}/join`).bearerToken(member.token)
    rejoin.assertStatus(403)
    const notNumeric = await client.get('/api/v1/channels/abc/messages').bearerToken(owner.token)
    notNumeric.assertStatus(404)
  })

  test('cancel by the owner deletes the channel, by a member only leaves it', async ({
    client,
  }) => {
    const owner = await signup(client, 'Leaveowner')
    const member = await signup(client, 'Leavemember')
    const created = await client
      .post('/api/v1/channels')
      .bearerToken(owner.token)
      .json({ name: 'leave-room', type: 'public' })
    const id = created.body().id as number
    await client.post(`/api/v1/channels/${id}/join`).bearerToken(member.token)

    const memberLeft = await client.post(`/api/v1/channels/${id}/leave`).bearerToken(member.token)
    memberLeft.assertStatus(204)
    const stillThere = await client.get(`/api/v1/channels/${id}/members`).bearerToken(owner.token)
    stillThere.assertStatus(200)

    const ownerLeft = await client.post(`/api/v1/channels/${id}/leave`).bearerToken(owner.token)
    ownerLeft.assertStatus(204)
    const gone = await client.get(`/api/v1/channels/${id}/members`).bearerToken(owner.token)
    gone.assertStatus(404)
  })
})
