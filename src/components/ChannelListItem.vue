<template>
  <q-item
    clickable
    class="rounded-borders"
    :active="active"
    :active-class="activeClass"
    :aria-current="active ? 'page' : undefined"
    @click="emit('select')"
  >
    <q-item-section avatar>
      <q-avatar rounded size="28px" :color="avatarColor" :text-color="avatarTextColor">
        <q-icon :name="channel.isPrivate ? 'lock_outline' : 'tag'" size="16px" />
      </q-avatar>
    </q-item-section>
    <q-item-section class="ellipsis">{{ channel.name }}</q-item-section>
    <q-item-section v-if="!joined" side>
      <q-icon name="add" size="18px" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" />
      <q-tooltip>Pripojiť sa ku #{{ channel.name }}</q-tooltip>
    </q-item-section>
    <q-item-section v-else side>
      <q-btn
        flat
        round
        dense
        icon="more_horiz"
        :color="$q.dark.isActive ? 'grey-4' : 'grey-7'"
        :aria-label="`Možnosti kanála ${channel.name}`"
        @click.stop
      >
        <q-menu anchor="bottom right" self="top right">
          <q-list>
            <q-item v-if="owner" dense><q-item-section>Ste správca kanála</q-item-section></q-item>
            <q-item
              v-if="!channel.isPrivate || owner"
              clickable
              v-close-popup
              @click="emit('invite')"
            >
              <q-item-section avatar><q-icon name="person_add_alt" /></q-item-section>
              <q-item-section>Pozvať člena</q-item-section>
            </q-item>
            <q-separator v-if="!channel.isPrivate || owner" />
            <q-item
              clickable
              v-close-popup
              :class="$q.dark.isActive ? 'text-red-4' : 'text-negative'"
              @click="emit('action', 'leave')"
            >
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>Opustiť kanál</q-item-section>
            </q-item>
            <q-item
              v-if="owner"
              clickable
              v-close-popup
              :class="$q.dark.isActive ? 'text-red-4' : 'text-negative'"
              @click="emit('action', 'destroy')"
            >
              <q-item-section avatar><q-icon name="delete_outline" /></q-item-section>
              <q-item-section>Zrušiť kanál</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import type { PrototypeChannel } from '@/stores/prototype';

const props = defineProps<{
  channel: PrototypeChannel;
  active?: boolean;
  joined?: boolean;
  owner?: boolean;
}>();
const emit = defineEmits<{ select: []; invite: []; action: [kind: 'leave' | 'destroy'] }>();
const $q = useQuasar();
const activeClass = computed(
  () => `${$q.dark.isActive ? 'bg-grey-9 text-grey-1' : 'bg-grey-3 text-dark'} text-weight-bold`,
);
const avatarColor = computed(() =>
  props.active
    ? $q.dark.isActive
      ? 'secondary'
      : 'green-2'
    : $q.dark.isActive
      ? 'grey-9'
      : 'grey-4',
);
const avatarTextColor = computed(() =>
  props.active
    ? $q.dark.isActive
      ? 'green-2'
      : 'teal-10'
    : $q.dark.isActive
      ? 'grey-5'
      : 'grey-8',
);
</script>
