<template>
  <ConfirmationDialog
    v-model="open"
    :title="details.title"
    :message="details.message"
    :confirm-label="details.label"
    :destructive="details.destructive"
    :error="error"
    :busy="busy"
    :close-on-confirm="false"
    @confirm="submit"
  />
</template>

<script setup lang="ts">
import { toRef, watch } from 'vue';
import ConfirmationDialog from './ConfirmationDialog.vue';
import { useChannelAction, type ChannelAction } from '@/composables/useChannelAction';
import { useWorkspaceStore } from '@/stores/workspace';

const open = defineModel<boolean>({ required: true });
const props = defineProps<{ action: ChannelAction | null }>();
const { details, error, busy, confirm } = useChannelAction(
  toRef(props, 'action'),
  useWorkspaceStore(),
);
watch(open, () => {
  error.value = '';
});
async function submit() {
  if (await confirm()) open.value = false;
}
</script>
