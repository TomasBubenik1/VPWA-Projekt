<template>
  <ConfirmationDialog
    v-model="open"
    :title="details.title"
    :message="details.message"
    :confirm-label="details.label"
    :destructive="details.destructive"
    :error="error"
    :close-on-confirm="false"
    @confirm="submit"
  />
</template>

<script setup lang="ts">
import { toRef, watch } from 'vue';
import ConfirmationDialog from './ConfirmationDialog.vue';
import { useChannelAction, type ChannelAction } from '@/composables/useChannelAction';
import { usePrototypeStore } from '@/stores/prototype';

const open = defineModel<boolean>({ required: true });
const props = defineProps<{ action: ChannelAction | null }>();
const { details, error, confirm } = useChannelAction(toRef(props, 'action'), usePrototypeStore());
watch(open, () => {
  error.value = '';
});
function submit() {
  if (confirm()) open.value = false;
}
</script>
