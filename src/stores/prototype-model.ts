export type Presence = 'online' | 'dnd' | 'offline';
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
export interface PrototypeUser {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
}
export interface PrototypeMessage {
  id: string;
  nickname: string;
  body: string;
  sentAt: number;
}
export interface PrototypeChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  owner: string;
  members: string[];
  messages: PrototypeMessage[];
  lastActivity: number;
  banned: string[];
  votes: Record<string, string[]>;
}
export interface Invitation {
  channelId: string;
  from: string;
  to: string;
}
export interface PendingMessage {
  channelId: string;
  to: string;
  message: PrototypeMessage;
}
export interface Notice {
  id: string;
  channelId: string;
  from: string;
  body: string;
  sentAt: number;
}
export interface Snapshot {
  users: PrototypeUser[];
  channels: PrototypeChannel[];
  invitations: Invitation[];
  statuses: Record<string, Presence>;
  directOnly: Record<string, boolean>;
  pending: PendingMessage[];
  activeId: string;
}

export function makeChannel(
  name: string,
  owner: string,
  isPrivate = false,
  id: string = crypto.randomUUID(),
): PrototypeChannel {
  return {
    id,
    name,
    owner,
    isPrivate,
    members: [owner],
    messages: [],
    lastActivity: Date.now(),
    banned: [],
    votes: {},
  };
}

export function makeMessage(nickname: string, body: string): PrototypeMessage {
  const clean = body.trim();
  if (clean.length > 4000) throw new Error('Správa môže mať najviac 4 000 znakov.');
  return { id: crypto.randomUUID(), nickname, body: clean, sentAt: Date.now() };
}
