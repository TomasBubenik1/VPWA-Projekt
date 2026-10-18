<template>
  <q-dialog v-model="open">
    <q-card flat bordered class="q-dialog-plugin">
      <q-card-section>
        <h2 class="text-h6 q-ma-none">Vaše nastavenia</h2>
        <p class="q-mb-none" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
          {{ store.user?.email }}
        </p>
      </q-card-section>
      <q-card-section>
        <section>
          <h3 class="q-mt-none q-mb-sm text-subtitle1 text-weight-medium">Dostupnosť</h3>
          <q-btn-toggle
            :model-value="store.status"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            :options="statusOptions"
            @update:model-value="store.setStatus"
          />
          <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            {{ statusHelp[store.status] }}
          </p>
        </section>
        <q-separator class="q-my-md" />
        <section>
          <h3 class="q-mt-none q-mb-sm text-subtitle1 text-weight-medium">Upozornenia</h3>
          <q-toggle v-model="store.directOnly" label="Iba správy adresované mne" color="primary" />
        </section>
        <q-separator class="q-my-md" />
        <section>
          <h3 class="q-mt-none q-mb-sm text-subtitle1 text-weight-medium">Vzhľad</h3>
          <q-btn-toggle
            v-model="theme"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            :options="themeOptions"
          />
        </section>
      </q-card-section>
      <q-card-actions align="between" class="q-px-md q-pb-md">
        <q-btn
          unelevated
          no-caps
          color="negative"
          text-color="white"
          label="Odhlásiť sa"
          @click="signOutOpen = true"
        />
        <q-btn unelevated no-caps color="primary" label="Hotovo" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <ConfirmationDialog
    v-model="signOutOpen"
    title="Odhlásiť sa?"
    message="Budete sa musieť znovu prihlásiť, aby ste mohli pokračovať."
    confirm-label="Odhlásiť sa"
    destructive
    @confirm="store.signOut()"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import ConfirmationDialog from './ConfirmationDialog.vue';
import type { Presence } from '@/stores/prototype';
import { presenceLabels, usePrototypeStore } from '@/stores/prototype';

// Use cases 1 (sign out), 8 (notification filter) and 9 (presence), plus the color theme.
const open = defineModel<boolean>({ required: true });
const store = usePrototypeStore();
const $q = useQuasar();
const signOutOpen = ref(false);

const statusOptions = (Object.keys(presenceLabels) as Presence[]).map((value) => ({
  value,
  label: presenceLabels[value],
}));
const statusHelp: Record<Presence, string> = {
  online: 'Ostatní vidia, že ste dostupní. Upozornenia sú zapnuté.',
  dnd: 'Správy prichádzajú, ale bez upozornení.',
  offline: 'Správy počkajú a doručia sa po návrate online.',
};
const themeOptions = [
  { label: 'Systém', value: 'auto' },
  { label: 'Svetlý', value: 'light' },
  { label: 'Tmavý', value: 'dark' },
];

const theme = ref<'auto' | 'light' | 'dark'>(
  $q.dark.mode === 'auto' ? 'auto' : $q.dark.mode ? 'dark' : 'light',
);
watch(theme, (value) => {
  $q.dark.set(value === 'auto' ? 'auto' : value === 'dark');
  try {
    localStorage.setItem('convo-theme', value);
  } catch {
    /* The choice stays in memory only. */
  }
});
</script>
