<template>
  <q-dialog
    :model-value="modelValue"
    :position="$q.screen.width <= 700 ? 'standard' : 'right'"
    full-height
    :maximized="$q.screen.width <= 700"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card
      flat
      bordered
      class="q-dialog-plugin"
      :class="$q.screen.width <= 700 ? 'full-width' : ''"
    >
      <q-card-section class="row items-start justify-between"
        ><div>
          <h2 class="text-h6 q-ma-none">Vyskúšať scenáre</h2>
          <p class="q-mb-none" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            Lokálna simulácia pre prezentáciu
          </p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť scenáre" v-close-popup
      /></q-card-section>
      <q-card-section
        ><h3 class="text-subtitle1 text-weight-medium q-ma-none">Pohľad používateľa</h3>
        <q-select
          :model-value="store.nickname"
          outlined
          label="Aktívny používateľ"
          emit-value
          map-options
          :options="
            store.data.users.map((u) => ({
              label: `${u.fullName} (@${u.nickname})`,
              value: u.nickname,
            }))
          "
          @update:model-value="requestUserSwitch"
        />
        <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
          Prepnite účet a prijmite pozvánku alebo hlasujte ako iný člen. Zmeny kanálov sú spoločné
          pre tieto demo účty.
        </p></q-card-section
      >
      <q-separator />
      <q-card-section
        ><h3 class="text-subtitle1 text-weight-medium q-ma-none">Prichádzajúca správa</h3>
        <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
          {{ store.activeChannel ? `Do #${store.activeChannel.name}` : 'Najprv vyberte kanál.' }}
        </p>
        <q-select
          v-model="sender"
          outlined
          label="Odosielateľ"
          :options="senderOptions"
          emit-value
          map-options
          :disable="!senderOptions.length"
        /><q-input
          v-model="body"
          outlined
          type="textarea"
          label="Text správy"
          class="q-mt-md"
          maxlength="4000"
        /><q-toggle v-model="simulateHidden" label="Simulovať skrytú aplikáciu" color="primary" />
        <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
          Skutočná viditeľnosť: {{ $q.appVisible ? 'viditeľná' : 'skrytá' }}. Stav príjemcu:
          {{ store.status }}.
        </p>
        <q-btn
          unelevated
          no-caps
          color="primary"
          label="Doručiť správu"
          :disable="!sender || !body.trim()"
          @click="receive"
        />
        <q-banner
          v-if="result"
          dense
          class="q-mt-sm"
          :class="$q.dark.isActive ? 'bg-teal-10' : 'bg-green-2'"
          role="status"
          >{{ result }}</q-banner
        ></q-card-section
      >
      <q-separator />
      <q-card-section
        ><h3 class="text-subtitle1 text-weight-medium q-ma-none">Písanie v reálnom čase</h3>
        <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
          Spustite ukážku a zavrite panel. Kliknutím na prezývku nad editorom uvidíte pribúdajúci
          text.
        </p>
        <q-btn
          outline
          no-caps
          color="primary"
          :label="playing ? 'Zastaviť písanie' : 'Spustiť ukážku písania'"
          :disable="!sender || store.status === 'offline'"
          @click="playTyping"
        /><q-input
          :model-value="store.typing?.body ?? ''"
          outlined
          label="Upraviť rozpísaný text"
          class="q-mt-md"
          :disable="!sender || store.status === 'offline'"
          @update:model-value="store.setDemoDraft(sender, String($event ?? ''))"
        />
        <p class="text-caption q-my-sm" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
          Každá zmena sa hneď prejaví v náhľade. Rozpísaný text nie je odoslanou správou.
        </p></q-card-section
      >
    </q-card>
  </q-dialog>
  <ConfirmationDialog
    v-model="switchUserOpen"
    title="Prepnúť demo účet?"
    :message="`Rozpracované písanie sa zastaví a budete pokračovať ako @${nextUser}.`"
    confirm-label="Prepnúť účet"
    @confirm="switchUser"
  />
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import ConfirmationDialog from './ConfirmationDialog.vue';
import { usePrototypeStore } from '@/stores/prototype';
defineProps<{ modelValue: boolean }>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
const store = usePrototypeStore();
const $q = useQuasar();
const sender = ref('');
const body = ref(`@${store.nickname} pozrieš sa na môj návrh?`);
const simulateHidden = ref(false);
const result = ref('');
const playing = ref(false);
const nextUser = ref('');
const switchUserOpen = ref(false);
const senderOptions = computed(() =>
  (store.activeChannel?.members ?? [])
    .filter((n) => n !== store.nickname)
    .map((n) => ({ label: `@${n}`, value: n })),
);
watch(
  senderOptions,
  (options) => {
    if (!options.some((o) => o.value === sender.value)) sender.value = options[0]?.value ?? '';
  },
  { immediate: true },
);
function requestUserSwitch(nickname: string) {
  if (nickname !== store.nickname) {
    nextUser.value = nickname;
    switchUserOpen.value = true;
  }
}
function switchUser() {
  const user = store.data.users.find((u) => u.nickname === nextUser.value);
  if (user) {
    stopTyping();
    store.activate(user);
    result.value = '';
    body.value = `@${nextUser.value} pozrieš sa na môj návrh?`;
  }
}
function receive() {
  try {
    const previousNoticeId = store.notices[0]?.id;
    const response = store.receiveDemoMessage(
      sender.value,
      body.value,
      simulateHidden.value ? false : $q.appVisible,
    );
    result.value = store.notices[0]?.id === previousNoticeId ? response : '';
  } catch (e) {
    result.value = e instanceof Error ? e.message : 'Správu sa nepodarilo doručiť.';
  }
}
let timer: ReturnType<typeof setInterval> | undefined;
function stopTyping() {
  clearInterval(timer);
  playing.value = false;
  store.typing = null;
}
function playTyping() {
  if (playing.value) {
    stopTyping();
    return;
  }
  const text = `@${store.nickname} práve prechádzam návrh. Mohli by sme ešte upraviť názvy kanálov?`;
  let index = 0;
  playing.value = true;
  // Deliberately paced demo participant; no timers on the actual input path.
  timer = setInterval(() => {
    index += 1;
    store.setDemoDraft(sender.value, text.slice(0, index));
    if (index >= text.length) {
      clearInterval(timer);
      playing.value = false;
    }
  }, 160);
}
watch(() => store.activeChannelId, stopTyping);
watch(
  () => store.status,
  (value) => {
    if (value === 'offline') stopTyping();
  },
);
onUnmounted(stopTyping);
</script>
