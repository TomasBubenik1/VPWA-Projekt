export type Presence = 'online' | 'dnd' | 'offline';
export type NotificationMode = 'all' | 'mentionsOnly';
export const presenceLabels: Record<Presence, string> = {
  online: 'Online',
  dnd: 'Nerušiť',
  offline: 'Offline',
};
export const presenceColors: Record<Presence, string> = {
  online: 'green-5',
  dnd: 'amber-7',
  offline: 'grey-6',
};
export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  nickname: string;
  presence: Presence;
}
export interface User extends Member {
  email: string;
  notificationMode: NotificationMode;
}
export interface Message {
  id: number;
  channelId: number;
  authorId: number;
  authorNickname: string;
  authorName: string;
  content: string;
  createdAt: string;
  mentions: string[];
}
export interface ChannelPayload {
  id: number;
  name: string;
  type: 'public' | 'private';
  ownerId: number;
}
export interface Channel extends ChannelPayload {
  members: Member[];
  messages: Message[];
  nextCursor: number | null;
  loaded: boolean;
  loading: boolean;
  historyError: string;
}
export interface Invitation {
  id: number;
  channelId: number;
  channelName: string;
  channelType: 'public' | 'private';
  inviterNickname: string;
}
export interface MessagePage {
  messages: Message[];
  nextCursor: number | null;
}
export interface Signup {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}
export interface LiveDraft {
  channelId: number;
  userId: number;
  nickname: string;
  body: string;
  active: boolean;
  updatedAt: number;
}
