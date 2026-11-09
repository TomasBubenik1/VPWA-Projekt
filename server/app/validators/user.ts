import { nickname } from '#validators/channel'
import vine from '@vinejs/vine'

const email = () => vine.string().trim().toLowerCase().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)
const name = () => vine.string().trim().minLength(1).maxLength(64)

export const signupValidator = vine.create({
  firstName: name(),
  lastName: name(),
  nickname: nickname().unique({ table: 'users', column: 'nickname' }),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

export const updateProfileValidator = vine.create({
  presence: vine.enum(['online', 'dnd', 'offline']).optional(),
  notificationMode: vine.enum(['all', 'mentionsOnly']).optional(),
})
