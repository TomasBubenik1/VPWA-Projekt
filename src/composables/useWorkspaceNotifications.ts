import { onScopeDispose, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useWorkspaceStore } from '@/stores/workspace';
import { shouldNotify } from '@/services/notifications';

export function useWorkspaceNotifications() {
  const $q = useQuasar();
  const store = useWorkspaceStore();
  const dismissals = new Set<() => void>();
  const notifications = new Set<Notification>();
  function clear() {
    dismissals.forEach((dismiss) => dismiss());
    dismissals.clear();
    notifications.forEach((notification) => notification.close());
    notifications.clear();
  }
  watch(() => store.sessionId, clear);
  watch(
    () => store.feedback,
    (message) => {
      if (!message) return;
      const dismiss = $q.notify({
        message,
        icon: 'info_outline',
        position: 'bottom',
        timeout: 6500,
        color: $q.dark.isActive ? 'grey-9' : 'grey-2',
        textColor: $q.dark.isActive ? 'white' : 'dark',
        onDismiss: () => dismissals.delete(dismiss),
      });
      dismissals.add(dismiss);
      store.feedback = '';
    },
  );
  const unsubscribe = store.onIncoming((message) => {
    if (
      !shouldNotify(store.user, message, $q.appVisible) ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    )
      return;
    const channel = store.joinedChannels.find((c) => c.id === message.channelId);
    try {
      const notification = new Notification(
        `@${message.authorNickname} · #${channel?.name ?? ''}`,
        { body: message.content.slice(0, 120), tag: `convo-${message.id}` },
      );
      notifications.add(notification);
      notification.onclose = () => notifications.delete(notification);
      notification.onclick = () => {
        window.focus();
        void store.selectChannel(message.channelId).catch(store.report);
        notification.close();
      };
    } catch {
      /* Some mobile browsers require the later PWA service worker. */
    }
  });
  onScopeDispose(() => {
    unsubscribe();
    clear();
  });
}
