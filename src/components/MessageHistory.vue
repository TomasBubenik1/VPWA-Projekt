<template>
  <div ref="scroller" class="message-scroll" tabindex="0" aria-label="História správ">
    <div class="message-column">
      <div ref="topSentinel" class="scroll-sentinel" aria-hidden="true" />
      <q-btn
        v-if="hasOlder"
        flat
        no-caps
        color="primary"
        class="history-more"
        label="Načítať staršie správy"
        @click="loadOlder"
      />
      <div v-else class="history-end">
        <q-icon name="chat_bubble_outline" size="17px" />
        <span>Toto je začiatok konverzácie.</span>
      </div>
      <template v-for="(message, index) in visible" :key="message.id">
        <div
          v-if="index === 0 || day(message.sentAt) !== day(visible[index - 1]?.sentAt ?? 0)"
          class="date-divider"
        >
          <span>{{ day(message.sentAt) }}</span>
        </div>
        <div
          class="message-entry"
          :class="{
            'message-entry-own': message.nickname === store.nickname,
          }"
        >
          <UserAvatar v-if="message.nickname !== store.nickname" :nickname="message.nickname" />
          <article
            class="message-row"
            :class="{
              'message-mentioned': mentions(message.body, store.nickname),
              'message-own': message.nickname === store.nickname,
            }"
          >
            <div class="message-copy">
              <header>
                <b v-if="message.nickname !== store.nickname">{{ name(message.nickname) }}</b>
                <time
                  v-if="message.nickname !== store.nickname"
                  :datetime="new Date(message.sentAt).toISOString()"
                >
                  {{ time(message.sentAt) }}
                </time>
                <time
                  v-if="message.nickname === store.nickname"
                  :datetime="new Date(message.sentAt).toISOString()"
                >
                  {{ time(message.sentAt) }}
                </time>
                <span v-if="mentions(message.body, store.nickname)" class="mention-label">
                  <q-icon name="alternate_email" size="13px" />pre vás
                </span>
              </header>
              <p>
                <template v-for="(part, partIndex) in splitMentions(message.body)" :key="partIndex"
                  ><span v-if="part.startsWith('@')" class="mention">{{ part }}</span
                  ><template v-else>{{ part }}</template></template
                >
              </p>
            </div>
          </article>
        </div>
      </template>
      <div ref="bottomSentinel" class="scroll-sentinel" aria-hidden="true" />
    </div>
    <q-btn
      v-if="newBelow"
      class="new-messages"
      unelevated
      no-caps
      color="primary"
      icon="arrow_downward"
      label="Nové správy"
      @click="toBottom"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import UserAvatar from './UserAvatar.vue';
import { mentions, usePrototypeStore } from '@/stores/prototype';
import type { PrototypeChannel } from '@/stores/prototype';

// Use case 7: history is rendered by pages of 12 messages. Older pages load when the top
// of the list scrolls into view. IntersectionObserver reports only that change, so no
// work runs on every scroll event.
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
const pageSize = 12;
const props = defineProps<{ channel: PrototypeChannel }>();
const store = usePrototypeStore();
const scroller = ref<HTMLElement>();
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
const splitMentions = (body: string) => body.split(/(@[a-zA-Z][a-zA-Z0-9_]*)/g);

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
