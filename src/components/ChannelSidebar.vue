<template>
  <aside class="workspace-sidebar" aria-label="Navigácia kanálov">
    <div class="workspace-brand">
      <div class="brand-lockup"><q-icon name="forum" size="26px" /><b>convo</b></div>
      <q-btn
        flat
        round
        icon="close"
        class="mobile-control"
        aria-label="Zavrieť kanály"
        @click="$emit('close')"
      />
    </div>
    <q-input
      v-model="query"
      outlined
      dense
      placeholder="Nájsť kanál"
      aria-label="Nájsť kanál"
      class="channel-search"
      ><template #prepend><q-icon name="search" size="19px" /></template
      ><template v-if="query" #append
        ><q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Vymazať vyhľadávanie"
          @click="query = ''" /></template
    ></q-input>
    <q-separator class="sidebar-separator" />
    <nav class="sidebar-scroll" aria-label="Kanály">
      <template v-if="invites.length"
        ><h2 class="sidebar-heading">
          Pozvánky <span>{{ invites.length }}</span>
        </h2>
        <div v-for="invite in invites" :key="invite.channel.id" class="invite-card">
          <q-icon class="channel-icon" name="mail_outline" size="16px" />
          <div class="invite-copy">
            <b>{{ invite.channel.name }}</b>
            <p>@{{ invite.from }} vás pozýva</p>
          </div>
          <div class="invite-actions">
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Prijať"
              size="sm"
              @click="accept(invite.channel.id)"
            /><q-btn flat no-caps label="Odmietnuť" size="sm" @click="decliningInvite = invite" />
          </div>
        </div>
      </template>
      <q-separator v-if="invites.length" class="sidebar-separator sidebar-invite-separator" />
      <div class="sidebar-heading channels-heading">
        <h2>Vaše kanály</h2>
        <q-btn flat round dense icon="add" aria-label="Vytvoriť kanál" @click="$emit('create')"
          ><q-tooltip>Vytvoriť kanál</q-tooltip></q-btn
        >
      </div>
      <q-list class="channel-list"
        ><q-item
          v-for="channel in joined"
          :key="channel.id"
          clickable
          :active="channel.id === store.activeChannelId"
          :aria-current="channel.id === store.activeChannelId ? 'page' : undefined"
          active-class="channel-selected"
          @click="select(channel.id)"
          ><q-item-section avatar
            ><q-icon
              class="channel-icon"
              :name="channel.isPrivate ? 'lock_outline' : 'tag'"
              size="16px" /></q-item-section
          ><q-item-section>{{ channel.name }}</q-item-section
          ><q-item-section v-if="channel.owner === store.nickname" side
            ><q-icon name="verified_user" size="14px"
              ><q-tooltip>Ste správca</q-tooltip></q-icon
            ></q-item-section
          ></q-item
        ></q-list
      >
      <p v-if="!joined.length" class="sidebar-empty">
        {{
          query
            ? 'Žiadny kanál nezodpovedá hľadaniu.'
            : 'Pripojte sa ku kanálu alebo vytvorte vlastný.'
        }}
      </p>
      <q-separator class="sidebar-separator" />
      <h2 class="sidebar-heading discover-heading">Objaviť kanály</h2>
      <q-list class="channel-list"
        ><q-item
          v-for="channel in discover"
          :key="channel.id"
          clickable
          @click="requestJoin(channel.id)"
          ><q-item-section avatar
            ><q-icon class="channel-icon" name="tag" size="16px" /></q-item-section
          ><q-item-section>{{ channel.name }}</q-item-section
          ><q-item-section side><q-icon name="add" size="18px" /></q-item-section
          ><q-tooltip>Pripojiť sa ku #{{ channel.name }}</q-tooltip></q-item
        ></q-list
      >
      <p v-if="!discover.length" class="sidebar-empty">
        {{ query ? 'Ďalšie kanály sa nenašli.' : 'Žiadne ďalšie verejné kanály.' }}
      </p>
    </nav>
    <div class="sidebar-bottom">
      <q-btn
        flat
        no-caps
        align="left"
        icon="science"
        label="Vyskúšať scenáre"
        @click="$emit('demo')"
      />
    </div>
    <button
      type="button"
      class="sidebar-profile"
      :aria-label="`Nastavenia profilu, ${store.user?.fullName ?? ''}`"
      @click="$emit('settings')"
    >
      <UserAvatar :nickname="store.nickname" />
      <span class="profile-copy">
        <b>{{ store.user?.fullName }}</b>
        <small
          ><span :class="['status-dot', store.status]" />{{ presenceLabels[store.status] }}</small
        >
      </span>
      <q-icon name="tune" size="20px" />
    </button>
  </aside>
  <ConfirmationDialog
    v-model="joinOpen"
    title="Pripojiť sa ku kanálu?"
    :message="`Pripojíte sa do verejného kanála #${joiningChannel?.name ?? ''}.`"
    confirm-label="Pripojiť sa"
    @confirm="confirmJoin"
  />
  <ConfirmationDialog
    v-model="declineOpen"
    title="Odmietnuť pozvánku?"
    :message="`Pozvánka do #${decliningInvite?.channel.name ?? ''} sa odstráni.`"
    confirm-label="Odmietnuť"
    destructive
    @confirm="decline"
  />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import ConfirmationDialog from './ConfirmationDialog.vue';
import UserAvatar from './UserAvatar.vue';
import { presenceLabels, usePrototypeStore } from '@/stores/prototype';
import type { PrototypeChannel } from '@/stores/prototype';
const emit = defineEmits<{ close: []; create: []; settings: []; demo: [] }>();
const store = usePrototypeStore();
const query = ref('');
const joiningChannel = ref<PrototypeChannel | null>(null);
const joinOpen = computed({
  get: () => joiningChannel.value !== null,
  set: (value: boolean) => {
    if (!value) joiningChannel.value = null;
  },
});
const decliningInvite = ref<(typeof invites.value)[number] | null>(null);
const declineOpen = computed({
  get: () => !!decliningInvite.value,
  set: (value: boolean) => {
    if (!value) decliningInvite.value = null;
  },
});
const matches = (name: string) => name.toLowerCase().includes(query.value.trim().toLowerCase());
const joined = computed(() => store.joinedChannels.filter((c) => matches(c.name)));
const discover = computed(() =>
  store.channels.filter(
    (c) =>
      !c.isPrivate &&
      !c.members.includes(store.nickname) &&
      !c.banned.includes(store.nickname) &&
      matches(c.name),
  ),
);
const invites = computed(() =>
  store.invitations.flatMap((i) => {
    const channel = store.channels.find((c) => c.id === i.channelId);
    return channel && matches(channel.name) ? [{ ...i, channel }] : [];
  }),
);
function requestJoin(id: string) {
  joiningChannel.value = discover.value.find((channel) => channel.id === id) ?? null;
}
function confirmJoin() {
  if (joiningChannel.value) join(joiningChannel.value.id);
}
function select(id: string) {
  store.selectChannel(id);
  emit('close');
}
function join(id: string) {
  try {
    store.joinPublic(id);
    emit('close');
  } catch (e) {
    store.feedback = e instanceof Error ? e.message : 'Pripojenie zlyhalo.';
  }
}
function accept(id: string) {
  try {
    store.acceptInvitation(id);
    emit('close');
  } catch (e) {
    store.feedback = e instanceof Error ? e.message : 'Pozvánka už nie je platná.';
  }
}
function decline() {
  if (!decliningInvite.value) return;
  store.declineInvitation(decliningInvite.value.channel.id);
  decliningInvite.value = null;
}
</script>
