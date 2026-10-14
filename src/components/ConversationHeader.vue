<template>
  <header class="conversation-header">
    <q-btn
      flat
      round
      icon="menu"
      class="mobile-control"
      aria-label="Otvoriť kanály"
      @click="emit('openSidebar')"
    />
    <div class="conversation-heading">
      <div class="channel-title">
        <q-icon
          class="channel-icon channel-icon-large"
          :name="channel?.isPrivate ? 'lock_outline' : 'tag'"
          size="20px"
        />
        <h1>{{ channel?.name ?? 'Vaše konverzácie' }}</h1>
      </div>
    </div>
    <div class="header-actions">
      <q-btn
        flat
        no-caps
        icon="group"
        :label="String(channel?.members.length ?? 0)"
        :aria-label="channel ? `Členovia kanála, ${memberCount(channel.members.length)}` : ''"
        :disable="!channel"
        @click="emit('members')"
      >
        <q-tooltip>Členovia kanála</q-tooltip>
      </q-btn>
      <q-btn flat round icon="more_horiz" aria-label="Možnosti kanála" :disable="!channel">
        <q-menu anchor="bottom right" self="top right">
          <q-list class="header-menu">
            <q-item
              clickable
              v-close-popup
              :disable="channel?.isPrivate && !isOwner"
              @click="emit('invite')"
            >
              <q-item-section avatar><q-icon name="person_add_alt" /></q-item-section>
              <q-item-section>Pozvať člena</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="emit('help')">
              <q-item-section avatar><q-icon name="terminal" /></q-item-section>
              <q-item-section>Prehľad príkazov</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup class="text-negative" @click="emit('leave')">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>Opustiť kanál</q-item-section>
            </q-item>
            <q-item
              v-if="isOwner"
              clickable
              v-close-popup
              class="text-negative"
              @click="emit('destroy')"
            >
              <q-item-section avatar><q-icon name="delete_outline" /></q-item-section>
              <q-item-section>Zrušiť kanál</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';
import { memberCount } from '@/utils/format';

const emit = defineEmits<{
  openSidebar: [];
  members: [];
  invite: [];
  help: [];
  leave: [];
  destroy: [];
}>();
const store = usePrototypeStore();
const channel = computed(() => store.activeChannel);
const isOwner = computed(() => channel.value?.owner === store.nickname);
</script>
