import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('channels', (table) => {
      table.increments('id')
      table.string('name', 64).notNullable().unique()
      table.enu('type', ['public', 'private']).notNullable().defaultTo('public')
      table
        .integer('owner_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
    })

    this.schema.createTable('channel_memberships', (table) => {
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('joined_at').notNullable().defaultTo(this.now())
      table.primary(['channel_id', 'user_id'])
      table.index('user_id')
    })

    this.schema.createTable('messages', (table) => {
      table.increments('id')
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table
        .integer('author_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('content').notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.index(['channel_id', 'id'])
    })

    this.schema.createTable('message_mentions', (table) => {
      table
        .integer('message_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('messages')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.primary(['message_id', 'user_id'])
      table.index('user_id')
    })

    this.schema.createTable('channel_invitations', (table) => {
      table.increments('id')
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table
        .integer('inviter_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('invitee_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enu('status', ['pending', 'accepted', 'declined']).notNullable().defaultTo('pending')
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.unique(['channel_id', 'invitee_id'])
      table.index(['invitee_id', 'status'])
    })

    this.schema.createTable('kick_votes', (table) => {
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table
        .integer('target_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('voter_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.primary(['channel_id', 'target_id', 'voter_id'])
    })

    this.schema.createTable('channel_bans', (table) => {
      table
        .integer('channel_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.primary(['channel_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable('channel_bans')
    this.schema.dropTable('kick_votes')
    this.schema.dropTable('channel_invitations')
    this.schema.dropTable('message_mentions')
    this.schema.dropTable('messages')
    this.schema.dropTable('channel_memberships')
    this.schema.dropTable('channels')
  }
}
