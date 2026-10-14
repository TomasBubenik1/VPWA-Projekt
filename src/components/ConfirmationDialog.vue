<template>
  <q-dialog v-model="open">
    <q-card class="prototype-dialog">
      <q-card-section>
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
      </q-card-section>
      <q-card-actions align="right">
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
