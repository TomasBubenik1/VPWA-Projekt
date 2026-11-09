/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.patch('profile', [controllers.Profile, 'update'])
        router.post('socket-ticket', [controllers.Profile, 'ticket'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('discover', [controllers.Channels, 'discover'])
        router.get('/', [controllers.Channels, 'index'])
        router.post('/', [controllers.Channels, 'store'])
        router.post('join', [controllers.Channels, 'joinByName'])
        router.post(':id/join', [controllers.Channels, 'join'])
        router.get(':id/members', [controllers.Channels, 'members'])
        router.post(':id/invitations', [controllers.Channels, 'invite'])
        router.post(':id/kicks', [controllers.Channels, 'kick'])
        router.post(':id/leave', [controllers.Channels, 'leave'])
        router.get(':id/messages', [controllers.Messages, 'index'])
        router.post(':id/messages', [controllers.Messages, 'store'])
        router.delete(':id/members/:nickname', [controllers.Channels, 'revoke'])
        router.delete(':id', [controllers.Channels, 'destroy'])
      })
      .prefix('channels')
      .where('id', router.matchers.number())
      .use(middleware.auth())
      .use(middleware.activeChannels())

    router
      .group(() => {
        router.get('/', [controllers.Invitations, 'index'])
        router.post(':id/accept', [controllers.Invitations, 'accept'])
        router.post(':id/decline', [controllers.Invitations, 'decline'])
      })
      .prefix('invitations')
      .where('id', router.matchers.number())
      .use(middleware.auth())
      .use(middleware.activeChannels())
  })
  .prefix('/api/v1')
