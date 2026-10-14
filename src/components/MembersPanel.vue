<template>
  <q-dialog v-model="open" position="right">
    <q-card class="side-panel">
      <q-card-section class="dialog-heading">
        <div>
          <h2>Členovia</h2>
          <p>#{{ channel?.name }}, {{ memberCount(channel?.members.length ?? 0) }}</p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť členov" v-close-popup />
      </q-card-section>
      <q-list>
        <q-item v-for="member in channel?.members" :key="member">
          <q-item-section avatar><UserAvatar :nickname="member" /></q-item-section>
          <q-item-section>
            <q-item-label>{{ displayName(member) }}</q-item-label>
            <q-item-label caption>
              <span :class="['status-dot', presence(member)]" />@{{ member }},
              {{ member === channel?.owner ? 'správca' : presenceLabels[presence(member)] }}
            </q-item-label>
            <q-item-label v-if="channel?.votes[member]?.length" caption>
              Hlasy na vyradenie: {{ channel.votes[member]?.length }}/3
            </q-item-label>
          </q-item-section>
          <q-item-section v-if="canModerate(member)" side>
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
    <q-card class="prototype-dialog">
      <q-card-section>
        <h2>{{ moderation.question }}</h2>
        <p>@{{ target }} {{ moderation.result }}</p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat no-caps label="Zrušiť" @click="target = ''" />
        <q-btn unelevated no-caps color="negative" label="Potvrdiť" @click="moderate" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import UserAvatar from './UserAvatar.vue';
import { presenceLabels, usePrototypeStore } from '@/stores/prototype';
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
