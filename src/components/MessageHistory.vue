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
      ref="infiniteScroll"
      reverse
      :offset="160"
      :scroll-target="scroller"
      :disable="!hasOlder"
      class="column no-wrap q-px-md q-pt-sm q-pb-md"
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
          v-if="index === 0 || dayKey(message.sentAt) !== dayKey(visible[index - 1]?.sentAt ?? 0)"
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
        :label="`Nové správy (${newBelow})`"
        @click="toBottom"
      />
    </q-page-sticky>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue';
import { useQuasar, type QInfiniteScroll, type QScrollArea } from 'quasar';
import ChatMessage from './ChatMessage.vue';
import { usePrototypeStore } from '@/stores/prototype';
import type { PrototypeChannel } from '@/stores/prototype';
import { useMessageWindow } from '@/composables/useMessageWindow';

// QInfiniteScroll reverse loads older pages and preserves the reader's scroll position.
const props = defineProps<{ channel: PrototypeChannel }>();
const store = usePrototypeStore();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);
const scrollArea = ref<QScrollArea>();
const infiniteScroll = ref<QInfiniteScroll>();
const scroller = computed(() => scrollArea.value?.getScrollTarget());
const newBelow = ref(0);
const atBottom = ref(true);

const { visible, hasOlder, loadOlder: expandHistory } = useMessageWindow(toRef(props, 'channel'));

const dateFormat = new Intl.DateTimeFormat('sk', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const day = (value: number) => dateFormat.format(value);
const dayKey = (value: number) => new Date(value).toDateString();

async function toBottom() {
  await nextTick();
  scrollArea.value?.setScrollPosition('vertical', scroller.value?.scrollHeight ?? 0);
  atBottom.value = true;
  newBelow.value = 0;
}

function loadOlder(_index: number, done: (stop?: boolean) => void) {
  expandHistory();
  done(!hasOlder.value);
}

function trackPosition(info: {
  verticalPosition: number;
  verticalSize: number;
  verticalContainerSize: number;
}) {
  atBottom.value = info.verticalSize - info.verticalContainerSize - info.verticalPosition <= 24;
  if (atBottom.value) newBelow.value = 0;
}

// The workspace keys this component by account and channel, resetting scroll and unread state.
onMounted(() => void toBottom());
watch(
  () => props.channel.messages.length,
  (count, previousCount) => {
    if (count <= previousCount) return;
    const last = props.channel.messages.at(-1);
    // Follow new messages only when the reader is already at the end or wrote the message.
    if (atBottom.value || last?.nickname === store.nickname) void toBottom();
    else newBelow.value += count - previousCount;
  },
);
</script>
