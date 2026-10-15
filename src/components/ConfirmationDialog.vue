<template>
  <q-dialog v-model="open">
    <q-card flat bordered class="q-dialog-plugin">
      <q-card-section>
        <h2 class="text-h6 q-ma-none">{{ title }}</h2>
        <p class="q-mb-none q-mt-sm">{{ message }}</p>
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat no-caps label="Zrušiť" v-close-popup />
        <q-btn
          unelevated
          no-caps
          :color="destructive ? 'negative' : 'primary'"
          :label="confirmLabel"
          @click="confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true });
withDefaults(
  defineProps<{
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
  }>(),
  { destructive: false },
);
const emit = defineEmits<{ confirm: [] }>();

function confirm() {
  emit('confirm');
  open.value = false;
}
</script>
