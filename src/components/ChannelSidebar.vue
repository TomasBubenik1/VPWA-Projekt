<template>
  <div class="column no-wrap fit q-pa-sm" aria-label="Navigácia kanálov">
    <header class="row items-center justify-between q-pa-sm">
      <div class="row items-center text-primary text-h5 text-weight-bold">
        <q-icon name="forum" size="26px" /><span class="q-ml-sm">convo</span>
      </div>
      <q-btn
        v-if="mobile"
        flat
        round
        icon="close"
        aria-label="Zavrieť kanály"
        @click="emit('close')"
      />
    </header>
    <q-input v-model="query" outlined dense clearable label="Nájsť kanál" class="q-ma-sm">
      <template #prepend><q-icon name="search" size="19px" /></template>
    </q-input>
    <q-separator class="q-ma-sm" />
    <q-scroll-area
      class="col"
      :vertical-thumb-style="{ width: '4px', borderRadius: '4px' }"
      tabindex="0"
    >
      <nav aria-label="Kanály">
        <section v-if="invitations.length" aria-labelledby="invitations-title">
          <h2 id="invitations-title" class="section-title">Pozvánky ({{ invitations.length }})</h2>
          <ChannelInvitation
            v-for="invitation in invitations"
            :key="invitation.id"
            :channel-name="invitation.channelName"
            :from="invitation.inviterNickname"
            @accept="accept(invitation.id)"
            @decline="
              emit('action', {
                kind: 'decline',
                channelId: invitation.channelId,
                invitationId: invitation.id,
              })
            "
          />
          <q-separator class="q-ma-sm" />
        </section>
        <section aria-labelledby="joined-title">
          <div class="row items-center justify-between q-pr-sm">
            <h2 id="joined-title" class="section-title">Vaše kanály</h2>
            <q-btn flat round dense icon="add" aria-label="Vytvoriť kanál" @click="emit('create')">
              <q-tooltip>Vytvoriť kanál</q-tooltip>
            </q-btn>
          </div>
          <q-list>
            <ChannelListItem
              v-for="channel in joined"
              :key="channel.id"
              :channel="channel"
              joined
              :active="channel.id === store.activeChannelId"
              :owner="channel.ownerId === store.user?.id"
              @select="select(channel.id)"
              @invite="emit('invite', channel.id)"
              @action="request($event, channel.id)"
            />
          </q-list>
          <p v-if="!joined.length" class="empty-list">
            {{
              search
                ? 'Žiadny kanál nezodpovedá hľadaniu.'
                : 'Pripojte sa ku kanálu alebo vytvorte vlastný.'
            }}
          </p>
        </section>
        <q-separator class="q-ma-sm" />
        <section aria-labelledby="discover-title">
          <h2 id="discover-title" class="section-title">Objaviť kanály</h2>
          <q-list>
            <ChannelListItem
              v-for="channel in discover"
              :key="channel.id"
              :channel="channel"
              @select="request('join', channel.id)"
            />
          </q-list>
          <p v-if="!discover.length" class="empty-list">
            {{ search ? 'Ďalšie kanály sa nenašli.' : 'Žiadne ďalšie verejné kanály.' }}
          </p>
        </section>
      </nav>
    </q-scroll-area>
    <q-separator />
    <q-item
      clickable
      class="q-mt-xs"
      :aria-label="`Nastavenia profilu, ${fullName(store.user) ?? ''}`"
      @click="emit('settings')"
    >
      <q-item-section avatar>
        <UserAvatar :nickname="store.nickname" current-user size="44px" font-size="16px" />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ fullName(store.user) }}</q-item-label>
        <q-item-label caption :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
          {{ presenceLabels[store.status] }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-icon name="tune" size="20px" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" />
      </q-item-section>
    </q-item>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ChannelListItem from './ChannelListItem.vue';
import ChannelInvitation from './ChannelInvitation.vue';
import UserAvatar from './UserAvatar.vue';
import { fullName, presenceLabels, useWorkspaceStore } from '@/stores/workspace';
import type { ChannelAction } from '@/composables/useChannelAction';

const props = defineProps<{ mobile: boolean }>();
const emit = defineEmits<{
  close: [];
  create: [];
  settings: [];
  invite: [channelId: number];
  action: [value: ChannelAction];
}>();
const store = useWorkspaceStore();
const query = ref<string | null>('');
const search = computed(() => query.value?.trim().toLowerCase() ?? '');
const matches = (name: string) => name.toLowerCase().includes(search.value);
const joined = computed(() => store.joinedChannels.filter((channel) => matches(channel.name)));
const discover = computed(() => store.discoverChannels.filter((channel) => matches(channel.name)));
const invitations = computed(() =>
  store.invitations.filter((invitation) => matches(invitation.channelName)),
);

function request(kind: ChannelAction['kind'], channelId: number) {
  emit('action', { kind, channelId });
}
function closeOnMobile() {
  if (props.mobile) emit('close');
}
async function select(id: number) {
  try {
    await store.selectChannel(id);
  } catch (error) {
    store.report(error);
  }
  closeOnMobile();
}
async function accept(id: number) {
  try {
    await store.acceptInvitation(id);
    closeOnMobile();
  } catch (reason) {
    store.feedback = reason instanceof Error ? reason.message : 'Pozvánka už nie je platná.';
  }
}
</script>

<style scoped>
.section-title {
  margin: 12px 8px 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}
.empty-list {
  padding: 8px;
  font-size: 12px;
}
</style>
