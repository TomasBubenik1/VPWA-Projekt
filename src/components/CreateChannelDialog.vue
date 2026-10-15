<template>
  <q-dialog v-model="open" @before-show="reset">
    <q-card flat bordered class="q-dialog-plugin">
      <q-card-section class="row items-start justify-between">
        <div>
          <h2 class="text-h6 q-ma-none">Vytvoriť kanál</h2>
          <p class="q-mb-none" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            Spoločné miesto pre jednu tému.
          </p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť" v-close-popup />
      </q-card-section>
      <q-card-section>
        <q-form @submit="create">
          <q-input
            v-model.trim="name"
            outlined
            autofocus
            label="Názov kanála"
            prefix="#"
            hint="Písmená, čísla, pomlčky. Bez medzier."
          />
          <q-toggle v-model="isPrivate" label="Súkromný kanál" color="primary" class="q-mt-md" />
          <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            {{
              isPrivate
                ? 'Vstúpiť môžu iba ľudia pozvaní správcom.'
                : 'Pripojiť sa môže každý používateľ.'
            }}
          </p>
          <p v-if="error" class="text-negative text-caption q-my-sm" role="alert">{{ error }}</p>
          <div class="row justify-end">
            <q-btn flat no-caps label="Zrušiť" v-close-popup />
            <q-btn unelevated no-caps color="primary" type="submit" label="Vytvoriť kanál" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

const open = defineModel<boolean>({ required: true });
const store = usePrototypeStore();
const name = ref('');
const isPrivate = ref(false);
const error = ref('');

// Every opening starts with an empty form.
function reset() {
  name.value = '';
  isPrivate.value = false;
  error.value = '';
}
function create() {
  try {
    store.createChannel(name.value, isPrivate.value);
    open.value = false;
    store.feedback = 'Kanál je pripravený. Môžete začať písať.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Kanál sa nepodarilo vytvoriť.';
  }
}
</script>
