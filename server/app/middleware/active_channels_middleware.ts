import { deleteInactiveChannels } from '#services/channels'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Removes expired channels before any channel or invitation request,
 * so the client never sees a channel that should no longer exist.
 */
export default class ActiveChannelsMiddleware {
  async handle(_context: HttpContext, next: NextFn) {
    await deleteInactiveChannels()
    return next()
  }
}
