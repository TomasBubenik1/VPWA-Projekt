<template>
  <q-scroll-area
    ref="scrollArea"
    class="col"
    :vertical-thumb-style="{ width: '7px', borderRadius: '4px' }"
    :vertical-bar-style="{ right: '5px', width: '7px' }"
    :horizontal-offset="[0, 5]"
    tabindex="0"
    aria-label="História správ"
  >
    <div class="column no-wrap q-px-md q-pt-sm q-pb-xl">
      <div ref="topSentinel" aria-hidden="true" />
      <q-btn
        v-if="hasOlder"
        flat
        no-caps
        color="primary"
        class="self-center q-my-sm"
        label="Načítať staršie správy"
        @click="loadOlder"
      />
      <div
        v-else
        class="row flex-center q-my-md text-caption q-gutter-sm"
        :class="isDark ? 'text-grey-4' : 'text-grey-7'"
      >
        <q-icon name="chat_bubble_outline" size="17px" />
        <span>Toto je začiatok konverzácie.</span>
      </div>
      <template v-for="(message, index) in visible" :key="message.id">
        <div
          v-if="index === 0 || day(message.sentAt) !== day(visible[index - 1]?.sentAt ?? 0)"
          class="row no-wrap items-center q-gutter-sm q-my-md text-caption"
          :class="isDark ? 'text-grey-4' : 'text-grey-7'"
        >
          <q-separator class="col" />
          <span>{{ day(message.sentAt) }}</span>
          <q-separator class="col" />
        </div>
        <q-chat-message
          :sent="message.nickname === store.nickname"
          :bg-color="bubbleColor(message)"
          :text-color="bubbleTextColor(message)"
          :aria-label="`Správa od ${name(message.nickname)}`"
          class="q-mb-lg"
        >
          <template v-if="message.nickname !== store.nickname" #avatar>
            <UserAvatar :nickname="message.nickname" class="self-end q-mr-md" />
          </template>
          <div>
            <header class="row items-center">
              <b v-if="message.nickname !== store.nickname" class="q-mr-sm">{{
                name(message.nickname)
              }}</b>
              <time
                class="text-caption q-mr-sm"
                :class="timestampClass(message)"
                :datetime="new Date(message.sentAt).toISOString()"
              >
                {{ time(message.sentAt) }}
              </time>
              <span
                v-if="message.nickname !== store.nickname && mentions(message.body, store.nickname)"
                class="text-caption"
                :class="isDark ? 'text-green-2' : 'text-teal-10'"
              >
                <q-icon name="alternate_email" size="13px" />pre vás
              </span>
            </header>
            <p class="q-mt-xs q-mb-none">
              <template v-for="(part, partIndex) in splitMentions(message.body)" :key="partIndex"
                ><br v-if="part === '\n'" /><span
                  v-else-if="part.startsWith('@')"
                  :class="mentionClass(message)"
                  >{{ part }}</span
                ><template v-else>{{ part }}</template></template
              >
            </p>
          </div>
        </q-chat-message>
      </template>
      <div ref="bottomSentinel" aria-hidden="true" />
    </div>
    <q-page-sticky v-if="newBelow" position="bottom" :offset="[0, 12]">
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="arrow_downward"
        label="Nové správy"
        @click="toBottom"
      />
    </q-page-sticky>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useQuasar, type QScrollArea } from 'quasar';
import UserAvatar from './UserAvatar.vue';
import { mentions, usePrototypeStore } from '@/stores/prototype';
import type { PrototypeChannel, PrototypeMessage } from '@/stores/prototype';

// Bubbles use Quasar QChatMessage: https://quasar.dev/vue-components/chat/
// Use case 7: history is rendered by pages of 12 messages. Older pages load when the top
// of the list scrolls into view. IntersectionObserver reports only that change, so no
// work runs on every scroll event.
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
const pageSize = 12;
const props = defineProps<{ channel: PrototypeChannel }>();
const store = usePrototypeStore();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);
const scrollArea = ref<QScrollArea>();
const scroller = computed(() => scrollArea.value?.getScrollTarget());
const topSentinel = ref<HTMLElement>();
const bottomSentinel = ref<HTMLElement>();
const visibleCount = ref(pageSize);
const newBelow = ref(false);
const atBottom = ref(true);

const sorted = computed(() => [...props.channel.messages].sort((a, b) => a.sentAt - b.sentAt));
const visible = computed(() => sorted.value.slice(-visibleCount.value));
const hasOlder = computed(() => visibleCount.value < sorted.value.length);

const time = (value: number) =>
  new Intl.DateTimeFormat('sk', { hour: '2-digit', minute: '2-digit' }).format(value);
const day = (value: number) =>
  new Intl.DateTimeFormat('sk', { day: 'numeric', month: 'long' }).format(value);
const name = (nick: string) => store.data.users.find((u) => u.nickname === nick)?.fullName ?? nick;
const splitMentions = (body: string) => body.split(/(@[a-zA-Z][a-zA-Z0-9_]*|\n)/g);
function bubbleColor(message: PrototypeMessage) {
  if (message.nickname === store.nickname) return isDark.value ? 'teal-10' : 'primary';
  if (mentions(message.body, store.nickname)) return isDark.value ? 'secondary' : 'green-2';
  return isDark.value ? 'grey-9' : 'grey-4';
}
function bubbleTextColor(message: PrototypeMessage) {
  if (message.nickname === store.nickname) return 'white';
  return isDark.value ? 'grey-1' : 'grey-10';
}
function timestampClass(message: PrototypeMessage) {
  if (message.nickname === store.nickname) return 'text-white';
  if (isDark.value && mentions(message.body, store.nickname)) return 'text-grey-2';
  return isDark.value ? 'text-grey-4' : 'text-grey-9';
}
function mentionClass(message: PrototypeMessage) {
  if (message.nickname === store.nickname) return 'text-white';
  return isDark.value ? 'text-green-2 text-weight-medium' : 'text-teal-10';
}

async function toBottom() {
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
  newBelow.value = false;
}
let loading = false;
async function loadOlder() {
  if (loading || !hasOlder.value) return;
  loading = true;
  // Keep the message the user is reading in the same place after older ones are added above.
  const previousHeight = scroller.value?.scrollHeight ?? 0;
  const top = scroller.value?.scrollTop ?? 0;
  visibleCount.value += pageSize;
  await nextTick();
  if (scroller.value) scroller.value.scrollTop = top + scroller.value.scrollHeight - previousHeight;
  loading = false;
}

let observer: IntersectionObserver | undefined;
onMounted(() => {
  void toBottom();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === topSentinel.value && entry.isIntersecting) void loadOlder();
        if (entry.target === bottomSentinel.value) {
          atBottom.value = entry.isIntersecting;
          if (entry.isIntersecting) newBelow.value = false;
        }
      }
    },
    // Start loading a little before the very top is reached.
    { root: scroller.value ?? null, rootMargin: '160px 0px 0px 0px' },
  );
  if (topSentinel.value) observer.observe(topSentinel.value);
  if (bottomSentinel.value) observer.observe(bottomSentinel.value);
});
onBeforeUnmount(() => observer?.disconnect());

watch(
  () => props.channel.id,
  () => {
    visibleCount.value = pageSize;
    void toBottom();
  },
);
watch(
  () => props.channel.messages.length,
  () => {
    const last = props.channel.messages.at(-1);
    // Follow new messages only when the reader is already at the end or wrote the message.
    if (atBottom.value || last?.nickname === store.nickname) void toBottom();
    else newBelow.value = true;
  },
);
</script>
