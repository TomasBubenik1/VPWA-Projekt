<template>
  <q-dialog
    v-model="open"
    :position="$q.screen.width <= 700 ? 'standard' : 'right'"
    full-height
    :maximized="$q.screen.width <= 700"
  >
    <q-card
      flat
      bordered
      class="q-dialog-plugin"
      :class="$q.screen.width <= 700 ? 'full-width' : ''"
    >
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
        <q-item v-for="member in channel?.members" :key="member">
          <q-item-section avatar><UserAvatar :nickname="member" /></q-item-section>
          <q-item-section>
            <q-item-label>{{ displayName(member) }}</q-item-label>
            <q-item-label caption :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
              <q-badge rounded :color="presenceColors[presence(member)]" class="q-mr-xs" />@{{
                member
              }},
              {{ member === channel?.owner ? 'správca' : presenceLabels[presence(member)] }}
            </q-item-label>
            <q-item-label
              v-if="channel?.votes[member]?.length"
              caption
              :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
            >
              Hlasy na vyradenie: {{ channel.votes[member]?.length }}/3
            </q-item-label>
          </q-item-section>
          <q-item-section
            v-if="canModerate(member)"
            side
            :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
          >
            <q-btn flat round dense icon="more_horiz" :aria-label="`Možnosti člena ${member}`">
              <q-menu anchor="bottom right" self="top right">
                <q-list>
                  <q-item clickable v-close-popup class="text-negative" @click="target = member">
                    <q-item-section>{{ moderation.action }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
      <q-card-section v-if="!channel?.isPrivate || isOwner">
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

  <q-dialog :model-value="!!target" @update:model-value="target = ''">
    <q-card flat bordered class="q-dialog-plugin">
      <q-card-section>
        <h2 class="text-h6 q-ma-none">{{ moderation.question }}</h2>
        <p class="q-mt-sm q-mb-none">@{{ target }} {{ moderation.result }}</p>
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat no-caps label="Zrušiť" @click="target = ''" />
        <q-btn unelevated no-caps color="negative" label="Potvrdiť" @click="moderate" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import UserAvatar from './UserAvatar.vue';
import { presenceColors, presenceLabels, usePrototypeStore } from '@/stores/prototype';
import { memberCount } from '@/utils/format';

// Use case 10 (/list) and the UI way to /revoke or /kick a member.
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ invite: [] }>();
const store = usePrototypeStore();
const channel = computed(() => store.activeChannel);
const isOwner = computed(() => channel.value?.owner === store.nickname);
const target = ref('');

// Texts differ by channel type and role, rules are the same as /revoke and /kick.
const moderation = computed(() => {
  if (channel.value?.isPrivate)
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

const displayName = (nick: string) =>
  store.data.users.find((u) => u.nickname === nick)?.fullName ?? nick;
const presence = (nick: string) => store.data.statuses[nick] ?? 'online';
const canModerate = (member: string) =>
  member !== store.nickname &&
  member !== channel.value?.owner &&
  (!channel.value?.isPrivate || isOwner.value);

function moderate() {
  try {
    store.moderate(target.value, channel.value?.isPrivate ? 'revoke' : 'kick');
  } catch (e) {
    store.feedback = e instanceof Error ? e.message : 'Akciu sa nepodarilo dokončiť.';
  }
  target.value = '';
}
</script>
