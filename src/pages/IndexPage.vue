<template>
  <AuthPanel v-if="!store.user" />
  <ChatWorkspace v-else />
</template>

<script setup lang="ts">
import AuthPanel from '@/components/AuthPanel.vue';
import ChatWorkspace from '@/components/ChatWorkspace.vue';
import { usePrototypeStore } from '@/stores/prototype';

const store = usePrototypeStore();
</script>
