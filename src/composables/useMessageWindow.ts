import { computed, type Ref } from 'vue';
import type { Channel } from '../stores/models.ts';
import type { createWorkspaceStore } from '../stores/workspace.ts';

export function useMessageWindow(
  channel: Readonly<Ref<Channel>>,
  store: Pick<ReturnType<typeof createWorkspaceStore>, 'loadHistory'>,
) {
  const visible = computed(() => channel.value.messages);
  const hasOlder = computed(() => channel.value.loaded && channel.value.nextCursor !== null);
  const loadOlder = () => store.loadHistory(channel.value.id, true);
  return { visible, hasOlder, loadOlder };
}
