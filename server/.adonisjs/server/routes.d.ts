import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'profile.profile.ticket': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'channels.discover': { paramsTuple?: []; params?: {} }
    'channels.index': { paramsTuple?: []; params?: {} }
    'channels.store': { paramsTuple?: []; params?: {} }
    'channels.join_by_name': { paramsTuple?: []; params?: {} }
    'channels.join': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.kick': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.revoke': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'nickname': ParamValue} }
    'channels.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invitations.index': { paramsTuple?: []; params?: {} }
    'invitations.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invitations.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.ticket': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'channels.store': { paramsTuple?: []; params?: {} }
    'channels.join_by_name': { paramsTuple?: []; params?: {} }
    'channels.join': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.kick': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invitations.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invitations.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'channels.discover': { paramsTuple?: []; params?: {} }
    'channels.index': { paramsTuple?: []; params?: {} }
    'channels.members': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invitations.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'channels.discover': { paramsTuple?: []; params?: {} }
    'channels.index': { paramsTuple?: []; params?: {} }
    'channels.members': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'invitations.index': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'profile.profile.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'channels.revoke': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'nickname': ParamValue} }
    'channels.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}