<template>
  <q-dialog v-model="open" @before-show="reset">
    <q-card flat bordered class="q-dialog-plugin">
      <q-card-section class="row items-start justify-between">
        <div>
          <h2 class="text-h6 q-ma-none">Pozvať člena</h2>
          <p class="q-mb-none" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            Do #{{ channel?.name }}
          </p>
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
          <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            Pozvánka sa zobrazí vybranému používateľovi. Správca tým môže obnoviť aj zakázaný
            prístup.
          </p>
          <p v-if="error" class="text-negative text-caption q-my-sm" role="alert">{{ error }}</p>
          <div class="row justify-end">
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
const props = defineProps<{ channelId: string | null }>();
const store = usePrototypeStore();
const channel = computed(() => store.channels.find((item) => item.id === props.channelId));
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
    if (!channel.value) throw new Error('Kanál už neexistuje.');
    store.inviteMember(nickname.value, channel.value.id);
    open.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Pozvánku sa nepodarilo poslať.';
  }
}
</script>
