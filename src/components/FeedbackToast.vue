<template>
  <Transition name="toast">
    <div v-if="store.feedback" class="feedback-toast" role="status">
      <q-icon name="info_outline" size="20px" />
      <span>{{ store.feedback }}</span>
      <q-btn
        flat
        round
        dense
        icon="close"
        aria-label="Zavrieť oznámenie"
        @click="store.feedback = ''"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

// Short confirmation after an action. It hides itself after a few seconds.
const store = usePrototypeStore();
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => store.feedback,
  (value) => {
    clearTimeout(timer);
    if (value)
      timer = setTimeout(() => {
        store.feedback = '';
      }, 6500);
  },
);
onUnmounted(() => clearTimeout(timer));
</script>
