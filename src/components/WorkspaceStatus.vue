<template>
  <q-banner v-if="store.status !== 'online'" dense :class="background">
    <q-icon :name="offline ? 'cloud_off' : 'do_not_disturb_on'" size="18px" class="q-mr-sm" />
    <span>{{
      offline
        ? 'Ste offline. Nové správy sa doručia po návrate online.'
        : 'Nerušiť je zapnuté. Správy prichádzajú bez upozornení.'
    }}</span>
    <q-btn
      v-if="offline"
      flat
      dense
      no-caps
      color="primary"
      label="Prejsť online"
      @click="store.setStatus('online')"
    />
  </q-banner>
  <q-banner v-if="store.storageWarning" dense role="alert" :class="background">
    {{ store.storageWarning }}
  </q-banner>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { usePrototypeStore } from '@/stores/prototype';

const store = usePrototypeStore();
const $q = useQuasar();
const offline = computed(() => store.status === 'offline');
const background = computed(() => ($q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'));
</script>
