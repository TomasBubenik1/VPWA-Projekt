<template>
  <q-dialog v-model="open" @before-show="reset">
    <q-card class="prototype-dialog">
      <q-card-section class="dialog-heading">
        <div>
          <h2>Pozvať člena</h2>
          <p>Do #{{ channel?.name }}</p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť" v-close-popup />
      </q-card-section>
      <q-card-section>
        <q-form @submit="invite">
          <q-select
            v-model="nickname"
            outlined
            emit-value
            map-options
            :options="options"
            label="Používateľ"
          />
          <p class="helper">
            Pozvánka sa zobrazí vybranému používateľovi. Správca tým môže obnoviť aj zakázaný
            prístup.
          </p>
          <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
          <div class="dialog-actions">
            <q-btn flat no-caps label="Zrušiť" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="primary"
              type="submit"
              label="Poslať pozvánku"
              :disable="!nickname"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

const open = defineModel<boolean>({ required: true });
const store = usePrototypeStore();
const channel = computed(() => store.activeChannel);
const nickname = ref('');
const error = ref('');
// Only people who are not members yet can be invited.
const options = computed(() =>
  store.data.users
    .filter((u) => !channel.value?.members.includes(u.nickname))
    .map((u) => ({ label: `${u.fullName} (@${u.nickname})`, value: u.nickname })),
);

function reset() {
  nickname.value = '';
  error.value = '';
}
function invite() {
  try {
    store.inviteMember(nickname.value);
    open.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Pozvánku sa nepodarilo poslať.';
  }
}
</script>
