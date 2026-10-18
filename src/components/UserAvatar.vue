<template>
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

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
