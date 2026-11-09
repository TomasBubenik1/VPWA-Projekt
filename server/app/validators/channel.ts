import vine from '@vinejs/vine'

const channelName = () =>
  vine
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_-]{2,63}$/)

export const nickname = () =>
  vine
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{2,31}$/)

export const createChannelValidator = vine.create({
  name: channelName(),
  type: vine.enum(['public', 'private']),
})

export const joinChannelValidator = vine.create({
  name: channelName(),
  type: vine.enum(['public', 'private']).optional(),
})

export const nicknameValidator = vine.create({ nickname: nickname() })
