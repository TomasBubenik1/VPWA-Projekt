<template>
  <div
    v-if="store.initializing"
    class="window-height column flex-center q-gutter-md"
    aria-live="polite"
  >
    <q-spinner color="primary" size="40px" />
    <span>Načítavam účet…</span>
  </div>
  <div
    v-else-if="store.initializationError"
    class="window-height column flex-center q-gutter-md q-pa-lg"
  >
    <p role="alert">{{ store.initializationError }}</p>
    <q-btn color="primary" no-caps label="Skúsiť znova" @click="store.initialize()" />
    <q-btn flat no-caps label="Odhlásiť sa" @click="store.signOut().catch(store.report)" />
  </div>
  <AuthPanel v-else-if="!store.user" />
  <ChatWorkspace v-else />
</template>

<script setup lang="ts">
import AuthPanel from '@/components/AuthPanel.vue';
import ChatWorkspace from '@/components/ChatWorkspace.vue';
import { onMounted } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';

const store = useWorkspaceStore();
onMounted(() => void store.initialize());
</script>
