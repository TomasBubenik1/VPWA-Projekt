<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
const $q = useQuasar();
let theme = 'auto';
try {
  theme = localStorage.getItem('convo-theme') ?? 'auto';
} catch {
  /* Use system theme. */
}
$q.dark.set(theme === 'auto' ? 'auto' : theme === 'dark');
</script>
