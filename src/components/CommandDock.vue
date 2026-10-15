<template>
  <div class="q-px-md q-pb-md">
    <div class="row items-center justify-between">
      <q-btn
        outline
        dense
        no-caps
        :color="$q.dark.isActive ? 'grey-4' : 'grey-8'"
        icon="terminal"
        label="Príkazy"
        @click="emit('help')"
      />
      <small
        v-if="commandLine.length > 3500"
        :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
        >{{ commandLine.length }}/4000</small
      >
      <q-btn
        v-if="typingHere"
        flat
        dense
        no-caps
        color="primary"
        :label="`@${store.typing?.nickname} píše`"
        @click="emit('showDraft')"
      />
    </div>
    <q-input
      ref="composerInput"
      v-model="commandLine"
      outlined
      autogrow
      maxlength="4000"
      :placeholder="channel ? `Správa do #${channel.name}` : '/join názov-kanála'"
      aria-label="Správa alebo príkaz"
      :error="!!commandError"
      :error-message="commandError"
      hide-bottom-space
      @keydown.enter.exact="onEnter"
      @update:model-value="commandError = ''"
    >
      <template #append>
        <q-btn
          unelevated
          padding="6px"
          color="primary"
          icon="arrow_upward"
          aria-label="Odoslať správu alebo príkaz"
          :disable="!commandLine.trim()"
          @click="submitCommand"
        />
      </template>
    </q-input>
  </div>
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
