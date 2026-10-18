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
            :key="invitation.channel.id"
            :channel-name="invitation.channel.name"
            :from="invitation.from"
            @accept="accept(invitation.channel.id)"
            @decline="request('decline', invitation.channel.id)"
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
              :owner="channel.owner === store.nickname"
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
    <q-btn
      flat
      no-caps
      align="left"
      icon="science"
      label="Vyskúšať scenáre"
      class="q-my-sm"
      @click="emit('demo')"
    />
    <q-separator />
    <q-item
      clickable
      class="q-mt-xs"
      :aria-label="`Nastavenia profilu, ${store.user?.fullName ?? ''}`"
      @click="emit('settings')"
    >
      <q-item-section avatar><UserAvatar :nickname="store.nickname" /></q-item-section>
      <q-item-section>
        <q-item-label>{{ store.user?.fullName }}</q-item-label>
        <q-item-label caption>
          <q-badge rounded :color="presenceColors[store.status]" class="q-mr-xs" />{{
            presenceLabels[store.status]
          }}
        </q-item-label>
      </q-item-section>
      <q-item-section side><q-icon name="tune" size="20px" /></q-item-section>
    </q-item>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ChannelListItem from './ChannelListItem.vue';
import ChannelInvitation from './ChannelInvitation.vue';
import UserAvatar from './UserAvatar.vue';
import { presenceColors, presenceLabels, usePrototypeStore } from '@/stores/prototype';
import type { ChannelAction } from '@/composables/useChannelAction';

const props = defineProps<{ mobile: boolean }>();
const emit = defineEmits<{
  close: [];
  create: [];
  settings: [];
  demo: [];
  invite: [channelId: string];
  action: [value: ChannelAction];
}>();
const store = usePrototypeStore();
const query = ref<string | null>('');
const search = computed(() => query.value?.trim().toLowerCase() ?? '');
const matches = (name: string) => name.toLowerCase().includes(search.value);
const joined = computed(() => store.joinedChannels.filter((channel) => matches(channel.name)));
const discover = computed(() =>
  store.channels.filter(
    (channel) =>
      !channel.isPrivate &&
      !channel.members.includes(store.nickname) &&
      !channel.banned.includes(store.nickname) &&
      matches(channel.name),
  ),
);
const invitations = computed(() =>
  store.invitations.flatMap((invitation) => {
    const channel = store.channels.find((item) => item.id === invitation.channelId);
    return channel && matches(channel.name) ? [{ ...invitation, channel }] : [];
  }),
);

function request(kind: ChannelAction['kind'], channelId: string) {
  emit('action', { kind, channelId });
}
function closeOnMobile() {
  if (props.mobile) emit('close');
}
function select(id: string) {
  store.selectChannel(id);
  closeOnMobile();
}
function accept(id: string) {
  try {
    store.acceptInvitation(id);
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
