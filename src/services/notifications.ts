import type { Message, User } from '../stores/models.ts';

export function shouldNotify(user: User | null, message: Message, appVisible: boolean) {
  return (
    !!user &&
    !appVisible &&
    message.authorId !== user.id &&
    user.presence === 'online' &&
    (user.notificationMode === 'all' || message.mentions.includes(user.nickname))
  );
}
