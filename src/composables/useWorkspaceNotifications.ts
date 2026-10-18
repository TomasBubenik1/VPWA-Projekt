import { onScopeDispose, watch } from 'vue';
import { useQuasar } from 'quasar';
import { usePrototypeStore } from '@/stores/prototype';

export function useWorkspaceNotifications() {
  const $q = useQuasar();
  const store = usePrototypeStore();
  const dismissals = new Set<() => void>();

  function notify(message: string, caption?: string) {
    const textColor = $q.dark.isActive ? 'white' : 'dark';
    const dismiss = $q.notify({
      message,
      ...(caption === undefined ? {} : { caption }),
      icon: caption === undefined ? 'info_outline' : 'chat_bubble_outline',
      position: caption === undefined ? 'bottom' : 'top-right',
      timeout: 6500,
      color: $q.dark.isActive ? 'grey-9' : 'grey-2',
      textColor,
      actions: [{ icon: 'close', color: textColor, 'aria-label': 'Zavrieť upozornenie' }],
      onDismiss: () => dismissals.delete(dismiss),
    });
    dismissals.add(dismiss);
  }
  function clear() {
    dismissals.forEach((dismiss) => dismiss());
    dismissals.clear();
  }
  watch(() => store.sessionId, clear);
  onScopeDispose(clear);
  watch(
    () => store.feedback,
    (message) => {
      if (!message) return;
      notify(message);
      store.feedback = '';
    },
  );
  watch(
    () => store.notices[0]?.id,
    (id) => {
      if (!id) return;
      const notice = store.notices[0];
      if (!notice) return;
      const channel = store.channels.find((item) => item.id === notice.channelId);
      notify(channel ? `@${notice.from} · #${channel.name}` : `@${notice.from}`, notice.body);
    },
  );
}
