import User from '#models/user'
import { revokeSocketTickets } from '#services/socket_tickets'
import { disconnectUser } from '#services/user_connections'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccessTokensController {
  async store({ request }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)
    const token = await User.accessTokens.create(user)
    return { user, token: token.value!.release() }
  }

  async destroy({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
    revokeSocketTickets(user.id)
    disconnectUser(user.id)
    return response.noContent()
  }
}
