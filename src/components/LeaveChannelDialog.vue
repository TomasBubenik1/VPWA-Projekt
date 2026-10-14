<template>
  <q-dialog v-model="open">
    <q-card class="prototype-dialog">
      <q-card-section>
        <h2>{{ mode === 'destroy' ? 'Zrušiť kanál?' : 'Opustiť kanál?' }}</h2>
        <p>
          {{
            mode === 'destroy'
              ? `Kanál #${channel?.name} aj jeho správy sa odstránia všetkým členom. Tento krok sa nedá vrátiť.`
              : isOwner
                ? `Odchodom správcu kanál #${channel?.name} zanikne aj pre ostatných členov.`
                : `Kanál #${channel?.name} zmizne z vášho zoznamu.`
          }}
        </p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat no-caps label="Zostať" v-close-popup />
        <q-btn
          unelevated
          no-caps
          color="negative"
          :label="mode === 'destroy' ? 'Zrušiť kanál' : 'Opustiť kanál'"
          @click="leave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

// Confirmation for /cancel, /quit and the header menu. When the owner leaves, the channel ends.
const open = defineModel<boolean>({ required: true });
defineProps<{ mode: 'leave' | 'destroy' }>();
const emit = defineEmits<{ left: [] }>();
const store = usePrototypeStore();
const channel = computed(() => store.activeChannel);
const isOwner = computed(() => channel.value?.owner === store.nickname);

function leave() {
  if (!channel.value) return;
  try {
    store.leaveChannel(channel.value.id);
    open.value = false;
    emit('left');
    store.feedback = isOwner.value ? 'Kanál bol zrušený.' : 'Opustili ste kanál.';
  } catch (e) {
    store.feedback = e instanceof Error ? e.message : 'Akciu sa nepodarilo dokončiť.';
  }
}
</script>
