import { MessageSchema } from '#database/schema'
import User from '#models/user'
import { belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Message extends MessageSchema {
  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>

  @manyToMany(() => User, {
    pivotTable: 'message_mentions',
    pivotForeignKey: 'message_id',
    pivotRelatedForeignKey: 'user_id',
  })
  declare mentions: ManyToMany<typeof User>

  toPayload() {
    return {
      id: this.id,
      channelId: this.channelId,
      authorId: this.authorId,
      authorNickname: this.author.nickname,
      authorName: `${this.author.firstName} ${this.author.lastName}`,
      content: this.content,
      createdAt: this.createdAt.toISO(),
      mentions: this.mentions.map((user) => user.nickname),
    }
  }
}
