<template>
  <q-dialog v-model="open">
    <q-card class="prototype-dialog">
      <q-card-section class="dialog-heading">
        <div>
          <h2>{{ store.typing ? `@${store.typing.nickname} píše` : 'Písanie sa skončilo' }}</h2>
          <p>Živý náhľad neodoslanej správy</p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť náhľad" v-close-popup />
      </q-card-section>
      <q-card-section>
        <p class="draft-preview" aria-live="polite">
          {{ store.typing?.body ?? 'Používateľ práve nepíše.' }}
        </p>
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
