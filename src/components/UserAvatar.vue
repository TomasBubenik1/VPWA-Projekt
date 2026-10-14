<template>
  <span class="avatar" :class="`avatar-tone-${tone}`" aria-hidden="true">
    {{ initials }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

// One place for initials and avatar color, used by the sidebar, history and member list.
const props = defineProps<{ nickname: string }>();
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
// Stable tone per person: the sum of character codes always gives the same of 5 colors.
const tone = computed(
  () => [...props.nickname].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5,
);
</script>
