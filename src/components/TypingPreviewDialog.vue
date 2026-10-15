<template>
  <q-dialog v-model="open">
    <q-card flat bordered class="q-dialog-plugin">
      <q-card-section class="row items-start justify-between">
        <div>
          <h2 class="text-h6 q-ma-none">
            {{ store.typing ? `@${store.typing.nickname} píše` : 'Písanie sa skončilo' }}
          </h2>
          <p class="q-mb-none" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            Živý náhľad neodoslanej správy
          </p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť náhľad" v-close-popup />
      </q-card-section>
      <q-card-section>
        <q-banner
          dense
          class="q-mt-sm"
          :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'"
          aria-live="polite"
        >
          {{ store.typing?.body ?? 'Používateľ práve nepíše.' }}
        </q-banner>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { usePrototypeStore } from '@/stores/prototype';

// Use case 11: the text is read straight from the store, so every keystroke shows up here.
const open = defineModel<boolean>({ required: true });
const store = usePrototypeStore();
</script>
