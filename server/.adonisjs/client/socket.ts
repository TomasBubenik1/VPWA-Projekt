export interface AppSocket {

  readonly channels: {

    readonly 'channels/:id': {

      readonly params: {

        readonly 'id': string | number

      }

      readonly channel: typeof import('#channels/messages_channel').default

      readonly handlers: {

        readonly 'typing': 'typing'

        readonly 'draft': 'draft'

      }

    }

    readonly 'users/:id': {

      readonly params: {

        readonly 'id': string | number

      }

      readonly channel: typeof import('#channels/user_channel').default

      readonly handlers: {

      }

    }

  }

}

