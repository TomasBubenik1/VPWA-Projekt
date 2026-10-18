<template>
  <q-card flat bordered class="q-ma-xs">
    <q-card-section class="row no-wrap items-start q-pa-sm">
      <q-icon name="mail_outline" color="primary" size="24px" class="q-mr-sm" />
      <div class="col">
        <div class="text-weight-bold ellipsis">{{ channelName }}</div>
        <p class="text-caption q-mt-xs q-mb-none">@{{ from }} vás pozýva</p>
      </div>
    </q-card-section>
    <q-card-actions align="right" class="q-pt-none">
      <q-btn unelevated no-caps color="primary" label="Prijať" size="sm" @click="emit('accept')" />
      <q-btn flat no-caps label="Odmietnuť" size="sm" @click="emit('decline')" />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
defineProps<{ channelName: string; from: string }>();
const emit = defineEmits<{ accept: []; decline: [] }>();
</script>
