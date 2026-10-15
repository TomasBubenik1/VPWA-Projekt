<template>
  <q-avatar
    rounded
    :size="size"
    :font-size="fontSize"
    :color="$q.dark.isActive ? 'secondary' : 'green-2'"
    :text-color="$q.dark.isActive ? 'grey-1' : 'teal-10'"
    aria-hidden="true"
  >
    {{ initials }}
  </q-avatar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

// One place for initials, used by the sidebar, history and member list.
const props = withDefaults(
  defineProps<{
    nickname: string;
    size?: string;
    fontSize?: string;
  }>(),
  { size: '36px' },
);
const store = usePrototypeStore();

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
