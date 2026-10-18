<template>
  <span
    class="relative-position row inline no-wrap"
    role="img"
    :aria-label="`${fullName}, ${presenceLabels[status]}`"
  >
    <q-avatar
      rounded
      :size="size"
      :font-size="fontSize"
      :color="currentUser ? 'primary' : $q.dark.isActive ? 'grey-9' : 'grey-4'"
      :text-color="currentUser ? 'white' : $q.dark.isActive ? 'grey-5' : 'grey-8'"
      aria-hidden="true"
    >
      {{ initials }}
    </q-avatar>
    <q-badge
      rounded
      :color="presenceColors[status]"
      class="absolute-bottom-right"
      :style="{
        width: '14px',
        minWidth: '14px',
        height: '14px',
        minHeight: '14px',
        right: '-3px',
        bottom: '-3px',
        padding: 0,
        border: `2px solid ${$q.dark.isActive ? 'var(--q-dark)' : 'white'}`,
      }"
      aria-hidden="true"
    >
      <q-tooltip anchor="top middle" self="bottom middle">{{ presenceLabels[status] }}</q-tooltip>
    </q-badge>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { presenceColors, presenceLabels, usePrototypeStore } from '@/stores/prototype';

// One place for initials, used by the sidebar, history and member list.
const props = withDefaults(
  defineProps<{
    nickname: string;
    currentUser?: boolean;
    size?: string;
    fontSize?: string;
  }>(),
  { size: '36px' },
);
const store = usePrototypeStore();
const status = computed(() => store.data.statuses[props.nickname] ?? 'online');

const fullName = computed(
  () => store.data.users.find((u) => u.nickname === props.nickname)?.fullName ?? props.nickname,
);
const initials = computed(() =>
  fullName.value
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join(''),
);
</script>

<style scoped>
.q-avatar {
  border-radius: 14px;
}
</style>
