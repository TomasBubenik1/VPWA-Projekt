<template>
  <q-dialog
    v-model="open"
    :position="mobile ? 'standard' : 'right'"
    full-height
    :maximized="mobile"
  >
    <q-card flat bordered class="q-dialog-plugin" :class="mobile ? 'full-width' : ''">
      <q-card-section class="row items-start justify-between">
        <div>
          <h2 class="text-h6 q-ma-none">Členovia</h2>
          <p class="q-mb-none" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            #{{ channel?.name }}, {{ memberCount(channel?.members.length ?? 0) }}
          </p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť členov" v-close-popup />
      </q-card-section>
      <q-list>
        <q-item v-for="member in channel?.members" :key="member.id">
          <q-item-section avatar><UserAvatar :nickname="member.nickname" /></q-item-section>
          <q-item-section>
            <q-item-label>{{ fullName(member) }}</q-item-label>
            <q-item-label caption :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
              @{{ member.nickname }},
              {{ member.id === channel?.ownerId ? 'správca' : presenceLabels[member.presence] }}
            </q-item-label>
          </q-item-section>
          <q-item-section
            v-if="canModerate(member.id)"
            side
            :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
          >
            <q-btn
              flat
              round
              dense
              icon="more_horiz"
              :aria-label="`Možnosti člena ${member.nickname}`"
            >
              <q-menu anchor="bottom right" self="top right">
                <q-list>
                  <q-item
                    clickable
                    v-close-popup
                    class="text-negative"
                    @click="requestModeration(member.nickname)"
                  >
                    <q-item-section>{{ moderation.action }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
      <q-card-section v-if="channel && (channel.type !== 'private' || isOwner)">
        <q-btn
          outline
          no-caps
          color="primary"
          icon="person_add_alt"
          label="Pozvať člena"
          @click="emit('invite')"
        />
      </q-card-section>
    </q-card>
  </q-dialog>

  <ConfirmationDialog
    v-model="confirmationOpen"
    :title="moderation.question"
    :message="`@${target} ${moderation.result}`"
    confirm-label="Potvrdiť"
    destructive
    :error="error"
    :close-on-confirm="false"
    @confirm="moderate"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UserAvatar from './UserAvatar.vue';
import ConfirmationDialog from './ConfirmationDialog.vue';
import { fullName, presenceLabels, useWorkspaceStore } from '@/stores/workspace';
import { memberCount } from '@/utils/format';

// Use case 10 (/list) and the UI way to /revoke or /kick a member.
const open = defineModel<boolean>({ required: true });
defineProps<{ mobile: boolean }>();
const emit = defineEmits<{ invite: [] }>();
const store = useWorkspaceStore();
watch(open, (value) => {
  if (value && store.activeChannelId)
    void store.loadMembers(store.activeChannelId).catch(store.report);
});
const channel = computed(() => store.activeChannel);
const isOwner = computed(() => channel.value?.ownerId === store.user?.id);
const target = ref('');
const error = ref('');
const confirmationOpen = ref(false);
let targetChannelId: number | null = null;

function requestModeration(member: string) {
  target.value = member;
  targetChannelId = store.activeChannelId;
  error.value = '';
  confirmationOpen.value = true;
}
watch(
  () => [store.sessionId, store.activeChannelId, open.value],
  () => {
    confirmationOpen.value = false;
    target.value = '';
    error.value = '';
  },
);

// Texts differ by channel type and role, rules are the same as /revoke and /kick.
const moderation = computed(() => {
  if (channel.value?.type === 'private')
    return {
      action: 'Odobrať členstvo',
      question: 'Odobrať členstvo?',
      result: 'stratí prístup k súkromnému kanálu.',
    };
  if (isOwner.value)
    return {
      action: 'Zakázať prístup',
      question: 'Zakázať prístup?',
      result: 'dostane trvalý ban. Prístup môžete obnoviť pozvánkou.',
    };
  return {
    action: 'Hlasovať za vyradenie',
    question: 'Hlasovať za vyradenie?',
    result: 'dostane ban po hlasoch troch rôznych členov.',
  };
});

const canModerate = (member: number) =>
  member !== store.user?.id &&
  member !== channel.value?.ownerId &&
  (channel.value?.type !== 'private' || isOwner.value);

async function moderate() {
  try {
    if (store.activeChannelId !== targetChannelId)
      throw new Error('Kanál sa zmenil. Vyberte člena znova.');
    await store.moderate(target.value, channel.value?.type === 'private' ? 'revoke' : 'kick');
    confirmationOpen.value = false;
    target.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Akciu sa nepodarilo dokončiť.';
  }
}
</script>
