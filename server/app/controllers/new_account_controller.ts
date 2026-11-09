import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async store({ request }: HttpContext) {
    const { passwordConfirmation, ...data } = await request.validateUsing(signupValidator)
    const user = await User.create({ ...data, presence: 'online', notificationMode: 'all' })
    const token = await User.accessTokens.create(user)
    return { user, token: token.value!.release() }
  }
}
