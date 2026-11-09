import { randomBytes } from 'node:crypto'

const tickets = new Map<string, { userId: number; expiresAt: number }>()
const lifetimeMs = 30_000

export function issueSocketTicket(userId: number) {
  const now = Date.now()
  for (const [key, value] of tickets) {
    if (value.expiresAt <= now) tickets.delete(key)
  }
  const ticket = randomBytes(32).toString('base64url')
  tickets.set(ticket, { userId, expiresAt: now + lifetimeMs })
  return { ticket, expiresIn: lifetimeMs / 1000 }
}

export function consumeSocketTicket(ticket: string) {
  const entry = tickets.get(ticket)
  tickets.delete(ticket)
  return entry && entry.expiresAt > Date.now() ? entry.userId : null
}

export function revokeSocketTickets(userId: number) {
  for (const [key, value] of tickets) {
    if (value.userId === userId) tickets.delete(key)
  }
}
