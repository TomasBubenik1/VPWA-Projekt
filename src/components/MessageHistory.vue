<template>
  <q-scroll-area
    ref="scrollArea"
    class="col"
    :vertical-thumb-style="{ width: '7px', borderRadius: '4px' }"
    :vertical-bar-style="{ right: '5px', width: '7px' }"
    :horizontal-offset="[0, 5]"
    tabindex="0"
    aria-label="História správ"
    @scroll="trackPosition"
  >
    <q-infinite-scroll
      :key="channel.id"
      ref="infiniteScroll"
      reverse
      :offset="160"
      :scroll-target="scroller"
      :disable="!hasOlder"
      class="column no-wrap q-px-md q-pt-sm q-pb-xl"
      @load="loadOlder"
    >
      <template #loading>
        <div class="row flex-center q-py-sm" role="status" aria-label="Načítavam staršie správy">
          <q-spinner-dots color="primary" size="24px" />
        </div>
      </template>
      <q-btn
        v-if="hasOlder"
        flat
        no-caps
        color="primary"
        class="self-center q-my-sm"
        label="Načítať staršie správy"
        @click="infiniteScroll?.trigger()"
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
        <ChatMessage :message="message" />
      </template>
    </q-infinite-scroll>
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
import { computed, nextTick, ref, watch } from 'vue';
import { useQuasar, type QInfiniteScroll, type QScrollArea } from 'quasar';
import ChatMessage from './ChatMessage.vue';
import { usePrototypeStore } from '@/stores/prototype';
import type { PrototypeChannel } from '@/stores/prototype';

// QInfiniteScroll reverse loads older pages and preserves the reader's scroll position.
const pageSize = 12;
const props = defineProps<{ channel: PrototypeChannel }>();
const store = usePrototypeStore();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);
const scrollArea = ref<QScrollArea>();
const infiniteScroll = ref<QInfiniteScroll>();
const scroller = computed(() => scrollArea.value?.getScrollTarget());
const visibleCount = ref(pageSize);
const newBelow = ref(false);
const atBottom = ref(true);

const sorted = computed(() => [...props.channel.messages].sort((a, b) => a.sentAt - b.sentAt));
const visible = computed(() => sorted.value.slice(-visibleCount.value));
const hasOlder = computed(() => visibleCount.value < sorted.value.length);

const day = (value: number) =>
  new Intl.DateTimeFormat('sk', { day: 'numeric', month: 'long' }).format(value);

async function toBottom() {
  await nextTick();
  scrollArea.value?.setScrollPosition('vertical', scroller.value?.scrollHeight ?? 0);
  atBottom.value = true;
  newBelow.value = false;
}

function loadOlder(_index: number, done: (stop?: boolean) => void) {
  if (hasOlder.value) visibleCount.value += pageSize;
  done(!hasOlder.value);
}

function trackPosition(info: {
  verticalPosition: number;
  verticalSize: number;
  verticalContainerSize: number;
}) {
  atBottom.value = info.verticalSize - info.verticalContainerSize - info.verticalPosition <= 2;
  if (atBottom.value) newBelow.value = false;
}

watch(
  () => props.channel.id,
  () => {
    visibleCount.value = pageSize;
    newBelow.value = false;
    atBottom.value = true;
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
