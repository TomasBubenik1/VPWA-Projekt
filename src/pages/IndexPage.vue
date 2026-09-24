<template>
  <AuthPanel v-if="!store.user" />
  <q-page v-else class="workspace-loading">
    <div><div class="brand-mark"><q-icon name="forum" /></div><h1>Ahoj, {{ store.user.fullName }}.</h1><p>Pracovný priestor pripravujeme…</p></div>
  </q-page>
</template>

<script setup lang="ts">
import AuthPanel from '@/components/AuthPanel.vue';
import { usePrototypeStore } from '@/stores/prototype';

const store = usePrototypeStore();
</script>
