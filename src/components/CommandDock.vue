<template>
  <div class="q-px-md q-pt-sm q-pb-md">
    <q-btn
      v-if="typingHere"
      flat
      dense
      no-caps
      color="primary"
      icon="edit_note"
      class="q-mb-xs"
      :label="store.typingUsers.map((user) => `@${user.nickname}`).join(', ') + ' píše'"
      @click="emit('showDraft')"
    />
    <q-input
      ref="composerInput"
      v-model="commandLine"
      outlined
      autogrow
      class="composer-input"
      :bg-color="$q.dark.isActive ? 'grey-9' : 'white'"
      maxlength="4000"
      :placeholder="channel ? `Správa do #${channel.name}` : '/join názov-kanála'"
      aria-label="Správa alebo príkaz"
      :error="!!commandError"
      :error-message="commandError"
      hide-bottom-space
      @keydown.enter.exact="onEnter"
      @update:model-value="commandError = ''"
    >
      <template #prepend>
        <q-btn
          flat
          round
          dense
          icon="terminal"
          :color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
          aria-label="Prehľad príkazov"
          @click="emit('help')"
        >
          <q-tooltip>Prehľad príkazov</q-tooltip>
        </q-btn>
      </template>
      <template #append>
        <q-btn
          unelevated
          round
          dense
          size="14px"
          color="primary"
          icon="arrow_upward"
          aria-label="Odoslať správu alebo príkaz"
          :disable="!commandLine.trim() || submitting"
          :loading="submitting"
          @click="submitCommand"
        />
      </template>
    </q-input>
    <div
      v-if="commandLine.length > 3500"
      class="row justify-end items-center q-px-xs q-pt-xs text-caption"
      :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'"
    >
      <span>{{ commandLine.length }}/4000</span>
    </div>
  </div>
  <ConfirmationDialog
    v-model="confirmationOpen"
    :title="confirmationTitle"
    :message="confirmationMessage"
    confirm-label="Potvrdiť"
    destructive
    :error="commandError"
    :busy="submitting"
    :close-on-confirm="false"
    @confirm="confirmCommand"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { QInput } from 'quasar';
import ConfirmationDialog from './ConfirmationDialog.vue';
import { useWorkspaceStore } from '@/stores/workspace';

// The fixed command line: every message and every /command goes through here.
const emit = defineEmits<{
  members: [];
  leave: [];
  destroy: [];
  help: [];
  showDraft: [];
}>();
const store = useWorkspaceStore();
const channel = computed(() => store.activeChannel);
const composerInput = ref<QInput>();
const commandError = ref('');
const submitting = ref(false);
const confirmationOpen = ref(false);
const pending = ref<{
  kind: 'leave' | 'destroy' | 'kick' | 'revoke';
  channelId: number;
  target: string;
  origin: string;
  text: string;
} | null>(null);
const confirmationTitle = computed(() =>
  pending.value?.kind === 'kick'
    ? 'Hlasovať za vylúčenie?'
    : pending.value?.kind === 'revoke'
      ? 'Odobrať členstvo?'
      : pending.value?.kind === 'destroy'
        ? 'Zrušiť kanál?'
        : 'Opustiť kanál?',
);
const confirmationMessage = computed(() => {
  const request = pending.value;
  const target = store.channels.find((item) => item.id === request?.channelId);
  if (request?.kind === 'kick' || request?.kind === 'revoke')
    return `Potvrďte akciu pre @${request.target} v #${target?.name}. ${request.kind === 'kick' && target?.ownerId === store.user?.id ? 'Používateľ dostane zákaz prístupu.' : ''}`;
  return `Potvrďte akciu v #${target?.name}. ${request?.kind === 'destroy' || target?.ownerId === store.user?.id ? 'Kanál aj jeho správy sa odstránia všetkým členom.' : 'Vaše členstvo sa ukončí.'}`;
});

// Each channel keeps its own unsent draft.
const commandLine = computed({
  get: () => store.drafts[store.activeChannelId || '_none'] ?? '',
  set: (value: string) => {
    store.updateDraft(value);
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
  void submitCommand();
}
async function submitCommand() {
  const text = commandLine.value.trim();
  if (!text || submitting.value) return;
  submitting.value = true;
  commandError.value = '';
  try {
    const origin = store.activeChannelId || '_none';
    if (text.startsWith('/')) {
      const action = await store.processChannelCommand(text);
      if (action === 'members') emit('members');
      if (['leave', 'destroy', 'kick', 'revoke'].includes(action) && store.activeChannelId) {
        pending.value = {
          kind: action as 'leave' | 'destroy' | 'kick' | 'revoke',
          channelId: store.activeChannelId,
          target: text.split(/\s+/)[1]?.replace(/^@/, '') ?? '',
          origin: String(origin),
          text: commandLine.value,
        };
        confirmationOpen.value = true;
        return;
      }
    } else await store.sendMessage(text);
    // Keep any text typed while the request was in flight.
    if (store.drafts[origin]?.trim() === text) store.drafts[origin] = '';
    if (origin === store.activeChannelId) store.clearTyping();
    focus();
  } catch (e) {
    commandError.value = e instanceof Error ? e.message : 'Akciu sa nepodarilo dokončiť.';
  } finally {
    submitting.value = false;
  }
}
async function confirmCommand() {
  const request = pending.value;
  if (!request || submitting.value) return;
  submitting.value = true;
  try {
    if (request.kind === 'kick' || request.kind === 'revoke')
      await store.moderate(request.target, request.kind, request.channelId);
    else if (request.kind === 'destroy') await store.destroyChannel(request.channelId);
    else await store.leaveChannel(request.channelId);
    if (store.drafts[request.origin] === request.text) store.drafts[request.origin] = '';
    store.clearTyping();
    confirmationOpen.value = false;
    commandError.value = '';
  } catch (error) {
    commandError.value = error instanceof Error ? error.message : 'Akcia zlyhala.';
  } finally {
    submitting.value = false;
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

<style scoped>
.composer-input :deep(.q-field__control) {
  border-radius: 14px;
}
.composer-input :deep(textarea) {
  max-height: 160px;
  overflow-y: auto !important;
}
</style>
