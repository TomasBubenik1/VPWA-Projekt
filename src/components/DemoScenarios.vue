<template>
  <q-dialog
    :model-value="modelValue"
    position="right"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="side-panel demo-panel">
      <q-card-section class="dialog-heading"
        ><div>
          <h2>Vyskúšať scenáre</h2>
          <p>Lokálna simulácia pre prezentáciu</p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť scenáre" v-close-popup
      /></q-card-section>
      <q-card-section class="demo-account-section"
        ><h3>Pohľad používateľa</h3>
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
        <p class="helper">
          Prepnite účet a prijmite pozvánku alebo hlasujte ako iný člen. Zmeny kanálov sú spoločné
          pre tieto demo účty.
        </p></q-card-section
      >
      <q-separator />
      <q-card-section
        ><h3>Prichádzajúca správa</h3>
        <p class="helper">
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
        <p class="helper">
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
        <p v-if="result" class="scenario-result" role="status">{{ result }}</p></q-card-section
      >
      <q-separator />
      <q-card-section
        ><h3>Písanie v reálnom čase</h3>
        <p class="helper">
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
        <p class="helper">
          Každá zmena sa hneď prejaví v náhľade. Rozpísaný text nie je odoslanou správou.
        </p></q-card-section
      >
      <q-separator />
      <q-card-section
        ><h3>
          Ukážka upozornení <span class="count-badge">{{ store.notices.length }}</span>
        </h3>
        <p v-if="!store.notices.length" class="helper">
          Zatiaľ žiadne. Doručte správu so simuláciou skrytej aplikácie a stavom Online.
        </p>
        <div v-for="notice in store.notices" :key="notice.id" class="notice-card">
          <b>@{{ notice.from }}</b>
          <p>{{ notice.body }}</p>
        </div>
        <q-btn
          v-if="store.notices.length"
          flat
          no-caps
          label="Vymazať upozornenia"
          @click="clearNoticesOpen = true"
      /></q-card-section>
    </q-card>
  </q-dialog>
  <ConfirmationDialog
    v-model="switchUserOpen"
    title="Prepnúť demo účet?"
    :message="`Rozpracované písanie sa zastaví a budete pokračovať ako @${nextUser}.`"
    confirm-label="Prepnúť účet"
    @confirm="switchUser"
  />
  <ConfirmationDialog
    v-model="clearNoticesOpen"
    title="Vymazať upozornenia?"
    message="Všetky aktuálne upozornenia sa odstránia."
    confirm-label="Vymazať"
    destructive
    @confirm="store.notices = []"
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
const clearNoticesOpen = ref(false);
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
    result.value = store.receiveDemoMessage(
      sender.value,
      body.value,
      simulateHidden.value ? false : $q.appVisible,
    );
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
