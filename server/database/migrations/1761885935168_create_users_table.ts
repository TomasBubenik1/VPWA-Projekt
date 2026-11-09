import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('first_name', 64).notNullable()
      table.string('last_name', 64).notNullable()
      table.string('nickname', 32).notNullable().unique()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.enu('presence', ['online', 'dnd', 'offline']).notNullable().defaultTo('online')
      table.enu('notification_mode', ['all', 'mentionsOnly']).notNullable().defaultTo('all')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
