<template>
  <article class="row no-wrap items-start q-mb-md" :aria-label="`Správa od ${authorName}`">
    <div v-if="!sent" class="col-auto q-mr-xs">
      <UserAvatar :nickname="message.nickname" size="42px" font-size="16px" />
    </div>
    <div class="col row" :class="sent ? 'justify-end' : 'q-ml-xs'">
      <q-card
        flat
        bordered
        class="col-shrink message-bubble q-px-sm q-pt-sm q-pb-sm"
        :class="[`bg-${bubbleColor}`, sent ? 'text-white' : isDark ? 'text-grey-1' : 'text-dark']"
        :style="{ maxWidth: $q.screen.lt.sm ? '85%' : 'min(72%, 640px)' }"
      >
        <header v-if="!sent" class="row items-baseline text-body1">
          <span class="text-weight-bold q-mr-sm">{{ authorName }}</span>
          <time
            class="text-body2 q-mr-sm text-no-wrap"
            :class="isDark ? (addressed ? 'text-grey-2' : 'text-grey-4') : 'text-grey-7'"
            :datetime="new Date(message.sentAt).toISOString()"
          >
            {{ formattedTime }}
          </time>
          <span
            v-if="addressed"
            class="text-caption"
            :class="isDark ? 'text-green-2' : 'text-teal-10'"
          >
            <q-icon name="alternate_email" size="13px" />pre vás
          </span>
        </header>
        <p class="text-body1 q-mt-none q-mb-none">
          <template v-for="(part, index) in parts" :key="index">
            <br v-if="part === '\n'" />
            <span
              v-else-if="part.startsWith('@')"
              :class="
                sent ? 'text-white' : isDark ? 'text-green-2 text-weight-medium' : 'text-teal-10'
              "
              >{{ part }}</span
            >
            <template v-else>{{ part }}</template>
          </template>
          <time
            v-if="sent"
            class="text-caption text-white text-no-wrap q-ml-md"
            :datetime="new Date(message.sentAt).toISOString()"
            >{{ formattedTime }}</time
          >
        </p>
      </q-card>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import UserAvatar from './UserAvatar.vue';
import { mentions, usePrototypeStore } from '@/stores/prototype';
import type { PrototypeMessage } from '@/stores/prototype';

const props = defineProps<{ message: PrototypeMessage }>();
const store = usePrototypeStore();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);
const sent = computed(() => props.message.nickname === store.nickname);
const addressed = computed(() => mentions(props.message.body, store.nickname));
const bubbleColor = computed(() => {
  if (sent.value) return isDark.value ? 'teal-10' : 'primary';
  if (addressed.value) return isDark.value ? 'secondary' : 'green-2';
  return isDark.value ? 'grey-9' : 'white';
});
const authorName = computed(
  () =>
    store.data.users.find((user) => user.nickname === props.message.nickname)?.fullName ??
    props.message.nickname,
);
const parts = computed(() => props.message.body.split(/(@[a-zA-Z][a-zA-Z0-9_]*|\n)/g));
const formattedTime = computed(() =>
  new Intl.DateTimeFormat('sk', { hour: '2-digit', minute: '2-digit' }).format(
    props.message.sentAt,
  ),
);
</script>

<style scoped>
.message-bubble {
  border-radius: 12px;
  overflow-wrap: anywhere;
}
</style>
