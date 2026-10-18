import { computed, ref, watch, type Ref } from 'vue';
import type { PrototypeChannel } from '../stores/prototype-model.ts';

export function useMessageWindow(channel: Readonly<Ref<PrototypeChannel>>, pageSize = 12) {
  const firstId = ref<string | null>(null);
  // Offline delivery can append older messages; keep chronological order for display.
  const sorted = computed(() => [...channel.value.messages].sort((a, b) => a.sentAt - b.sentAt));
  const start = computed(() =>
    Math.max(
      0,
      sorted.value.findIndex((message) => message.id === firstId.value),
    ),
  );
  const visible = computed(() => sorted.value.slice(start.value));
  const hasOlder = computed(() => start.value > 0);

  watch(
    () => channel.value.id,
    () => {
      firstId.value = sorted.value[Math.max(0, sorted.value.length - pageSize)]?.id ?? null;
    },
    { immediate: true, flush: 'sync' },
  );

  function loadOlder() {
    firstId.value = sorted.value[Math.max(0, start.value - pageSize)]?.id ?? null;
  }
  // Anchor by ID, not by distance from the end: incoming messages never evict a visible row.
  return { visible, hasOlder, loadOlder };
}
