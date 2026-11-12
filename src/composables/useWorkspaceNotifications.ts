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
  // Quasar toast is the fallback when system notifications are unavailable;
  // it stays until closed, so the user sees it after returning to the app.
  function showToast(title: string, body: string, channelId: number) {
    const textColor = $q.dark.isActive ? 'white' : 'dark';
    const dismiss = $q.notify({
      message: title,
      caption: body,
      icon: 'chat_bubble_outline',
      position: 'top-right',
      timeout: 0,
      color: $q.dark.isActive ? 'grey-9' : 'grey-2',
      textColor,
      actions: [
        {
          label: 'Otvoriť',
          color: 'primary',
          handler: () => void store.selectChannel(channelId).catch(store.report),
        },
        { icon: 'close', color: textColor, 'aria-label': 'Zavrieť upozornenie' },
      ],
      onDismiss: () => dismissals.delete(dismiss),
    });
    dismissals.add(dismiss);
  }
  const unsubscribe = store.onIncoming((message) => {
    if (!shouldNotify(store.user, message, $q.appVisible)) return;
    const channel = store.joinedChannels.find((c) => c.id === message.channelId);
    const title = `@${message.authorNickname} · #${channel?.name ?? ''}`;
    const body = message.content.slice(0, 120);
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      showToast(title, body, message.channelId);
      return;
    }
    try {
      const notification = new Notification(title, { body, tag: `convo-${message.id}` });
      notifications.add(notification);
      notification.onclose = () => notifications.delete(notification);
      notification.onclick = () => {
        window.focus();
        void store.selectChannel(message.channelId).catch(store.report);
        notification.close();
      };
    } catch {
      // Some mobile browsers allow notifications only from a service worker (PWA stage).
      showToast(title, body, message.channelId);
    }
  });
  onScopeDispose(() => {
    unsubscribe();
    clear();
  });
}
