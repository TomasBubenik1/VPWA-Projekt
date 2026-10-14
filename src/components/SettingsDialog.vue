<template>
  <q-dialog v-model="open">
    <q-card class="prototype-dialog settings-dialog">
      <q-card-section class="dialog-heading">
        <div>
          <h2>Vaše nastavenia</h2>
          <p>{{ store.user?.email }}</p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť nastavenia" v-close-popup />
      </q-card-section>
      <q-card-section class="settings-groups">
        <section>
          <h3><q-icon name="person_outline" aria-hidden="true" />Dostupnosť</h3>
          <q-btn-toggle
            :model-value="store.status"
            spread
            no-caps
            unelevated
            class="segmented"
            toggle-color="primary"
            :options="statusOptions"
            @update:model-value="store.setStatus"
          />
          <p class="helper">{{ statusHelp[store.status] }}</p>
        </section>
        <section>
          <h3><q-icon name="notifications_none" aria-hidden="true" />Upozornenia</h3>
          <q-toggle v-model="store.directOnly" label="Iba správy adresované mne" color="primary" />
        </section>
        <section>
          <h3><q-icon name="palette" aria-hidden="true" />Vzhľad</h3>
          <q-btn-toggle
            v-model="theme"
            spread
            no-caps
            unelevated
            class="segmented"
            toggle-color="primary"
            :options="themeOptions"
          />
        </section>
      </q-card-section>
      <q-card-actions align="between">
        <q-btn
          outline
          no-caps
          color="negative"
          icon="logout"
          class="logout-button"
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
