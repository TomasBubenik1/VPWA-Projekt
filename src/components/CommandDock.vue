<template>
  <footer class="command-dock">
    <div class="composer-toolbar">
      <div class="command-hints">
        <q-btn flat dense no-caps icon="terminal" label="Príkazy" @click="emit('help')" />
        <small v-if="commandLine.length > 3500">{{ commandLine.length }}/4000</small>
      </div>
      <div class="typing-line" aria-live="polite">
        <button v-if="typingHere" type="button" @click="emit('showDraft')">
          <span class="typing-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>@{{ store.typing?.nickname }} píše</span>
          <span class="typing-hint">Náhľad</span>
        </button>
      </div>
    </div>
    <div class="composer" :class="{ 'composer-error': commandError }">
      <q-input
        ref="composerInput"
        v-model="commandLine"
        borderless
        autogrow
        maxlength="4000"
        :placeholder="channel ? `Správa do #${channel.name}` : '/join názov-kanála'"
        aria-label="Správa alebo príkaz"
        @keydown.enter.exact="onEnter"
        @update:model-value="commandError = ''"
      />
      <q-btn
        unelevated
        round
        color="primary"
        icon="arrow_upward"
        aria-label="Odoslať správu alebo príkaz"
        :disable="!commandLine.trim()"
        @click="submitCommand"
      />
    </div>
    <p v-if="commandError" class="inline-error" role="alert">{{ commandError }}</p>
  </footer>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { QInput } from 'quasar';
import { usePrototypeStore } from '@/stores/prototype';

// The fixed command line: every message and every /command goes through here.
const emit = defineEmits<{
  members: [];
  leave: [];
  destroy: [];
  help: [];
  showDraft: [];
}>();
const store = usePrototypeStore();
const channel = computed(() => store.activeChannel);
const composerInput = ref<QInput>();
const commandError = ref('');

// Each channel keeps its own unsent draft.
const commandLine = computed({
  get: () => store.drafts[store.activeChannelId || '_none'] ?? '',
  set: (value: string) => {
    store.drafts[store.activeChannelId || '_none'] = value;
  },
});
const typingHere = computed(
  () =>
    !!store.typing && store.typing.channelId === channel.value?.id && store.status !== 'offline',
);

function onEnter(event: KeyboardEvent) {
  // Do not send while an IME (for example accents) is still composing a character.
  if (event.isComposing) return;
  event.preventDefault();
  submitCommand();
}
function submitCommand() {
  const text = commandLine.value.trim();
  if (!text) return;
  commandError.value = '';
  try {
    const origin = store.activeChannelId || '_none';
    if (text.startsWith('/')) {
      const action = store.processChannelCommand(text);
      if (action === 'members') emit('members');
      if (action === 'leave') emit('leave');
      if (action === 'destroy') emit('destroy');
    } else store.sendMessage(text);
    store.drafts[origin] = '';
    focus();
  } catch (e) {
    commandError.value = e instanceof Error ? e.message : 'Akciu sa nepodarilo dokončiť.';
  }
}
function focus() {
  void nextTick(() => composerInput.value?.focus());
}
// Used by the command overview: puts the chosen command into the field.
function insert(value: string) {
  commandLine.value = value;
  focus();
}
watch(
  () => store.activeChannelId,
  () => {
    commandError.value = '';
  },
);

defineExpose({ insert });
</script>
