import { issueSocketTicket } from '#services/socket_tickets'
import { disconnectUser } from '#services/user_connections'
import { updateProfileValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import socket from '@rlanz/socket/services/main'

export default class ProfileController {
  async show({ auth }: HttpContext) {
    return auth.getUserOrFail()
  }

  async update({ auth, request, response }: HttpContext) {
    const changes = await request.validateUsing(updateProfileValidator)
    if (!Object.keys(changes).length) {
      response.abort({ message: 'Vyberte nastavenie, ktoré chcete zmeniť.' }, 422)
    }
    const user = await auth.getUserOrFail().merge(changes).save()
    if (changes.presence) {
      socket.broadcast('presence', { userId: user.id, presence: user.presence })
      // An offline user receives no messages, so the live connection is closed.
      if (user.presence === 'offline') disconnectUser(user.id)
    }
    return user
  }

  ticket({ auth }: HttpContext) {
    return issueSocketTicket(auth.getUserOrFail().id)
  }
}
