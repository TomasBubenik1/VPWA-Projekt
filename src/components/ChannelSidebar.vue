<template>
  <div class="column no-wrap fit q-px-sm q-pt-sm" aria-label="Navigácia kanálov">
    <div class="row no-wrap items-center justify-between q-px-sm q-pt-xs q-pb-md">
      <div class="row items-center text-primary text-h5 text-weight-bold">
        <q-icon name="forum" size="26px" /><b class="q-ml-sm">convo</b>
      </div>
      <q-btn
        v-if="$q.screen.width <= 700"
        flat
        round
        icon="close"
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
      class="q-mx-sm q-mt-sm q-mb-sm rounded-borders"
      :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'"
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
    <q-separator class="q-ma-sm" />
    <q-scroll-area
      class="col"
      :vertical-thumb-style="{ width: '4px', borderRadius: '4px' }"
      tabindex="0"
    >
      <nav class="q-px-xs" aria-label="Kanály">
        <template v-if="invites.length"
          ><h2
            class="row items-center justify-between text-caption text-weight-medium q-mx-sm q-mt-sm q-mb-xs"
            :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
          >
            Pozvánky <span>{{ invites.length }}</span>
          </h2>
          <q-card v-for="invite in invites" :key="invite.channel.id" flat bordered class="q-ma-xs">
            <q-card-section class="row no-wrap items-start q-pa-sm">
              <q-avatar
                rounded
                size="28px"
                :color="$q.dark.isActive ? 'secondary' : 'green-2'"
                :text-color="$q.dark.isActive ? 'green-2' : 'teal-10'"
                ><q-icon name="mail_outline" size="16px"
              /></q-avatar>
              <div class="q-ml-sm">
                <b>{{ invite.channel.name }}</b>
                <p
                  class="text-caption q-mt-xs q-mb-none"
                  :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
                >
                  @{{ invite.from }} vás pozýva
                </p>
              </div>
            </q-card-section>
            <q-card-actions align="right" class="q-pt-none">
              <q-btn
                unelevated
                no-caps
                color="primary"
                label="Prijať"
                size="sm"
                @click="accept(invite.channel.id)"
              /><q-btn flat no-caps label="Odmietnuť" size="sm" @click="decliningInvite = invite" />
            </q-card-actions>
          </q-card>
        </template>
        <q-separator v-if="invites.length" class="q-ma-sm q-mt-md" />
        <div
          class="row items-center justify-between text-caption text-weight-medium q-mx-sm q-mt-sm q-mb-xs"
          :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
        >
          <h2 class="text-caption text-weight-medium q-ma-none">Vaše kanály</h2>
          <q-btn flat round dense icon="add" aria-label="Vytvoriť kanál" @click="$emit('create')"
            ><q-tooltip>Vytvoriť kanál</q-tooltip></q-btn
          >
        </div>
        <q-list
          ><q-item
            v-for="channel in joined"
            :key="channel.id"
            clickable
            :active="channel.id === store.activeChannelId"
            :aria-current="channel.id === store.activeChannelId ? 'page' : undefined"
            :active-class="
              $q.dark.isActive
                ? 'bg-grey-9 text-grey-1 text-weight-bold'
                : 'bg-grey-3 text-dark text-weight-bold'
            "
            :class="$q.dark.isActive ? 'rounded-borders text-grey-8' : 'rounded-borders'"
            @click="select(channel.id)"
            ><q-item-section avatar
              ><q-avatar
                rounded
                size="28px"
                :color="
                  channel.id === store.activeChannelId
                    ? $q.dark.isActive
                      ? 'secondary'
                      : 'green-2'
                    : $q.dark.isActive
                      ? 'grey-9'
                      : 'grey-3'
                "
                :text-color="
                  channel.id === store.activeChannelId
                    ? $q.dark.isActive
                      ? 'green-2'
                      : 'teal-10'
                    : $q.dark.isActive
                      ? 'grey-5'
                      : 'grey-7'
                "
                ><q-icon
                  :name="channel.isPrivate ? 'lock_outline' : 'tag'"
                  size="16px" /></q-avatar></q-item-section
            ><q-item-section :class="$q.dark.isActive ? 'text-grey-1' : undefined">{{
              channel.name
            }}</q-item-section
            ><q-item-section
              v-if="channel.owner === store.nickname"
              side
              :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
              ><q-icon name="verified_user" size="14px"
                ><q-tooltip>Ste správca</q-tooltip></q-icon
              ></q-item-section
            ></q-item
          ></q-list
        >
        <p
          v-if="!joined.length"
          class="text-caption q-pa-sm"
          :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
        >
          {{
            query
              ? 'Žiadny kanál nezodpovedá hľadaniu.'
              : 'Pripojte sa ku kanálu alebo vytvorte vlastný.'
          }}
        </p>
        <q-separator class="q-ma-sm" />
        <h2
          class="row items-center justify-between text-caption text-weight-medium q-mx-sm q-mt-sm q-mb-xs"
          :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
        >
          Objaviť kanály
        </h2>
        <q-list
          ><q-item
            v-for="channel in discover"
            :key="channel.id"
            clickable
            :class="$q.dark.isActive ? 'text-grey-8' : undefined"
            @click="requestJoin(channel.id)"
            ><q-item-section avatar
              ><q-avatar
                rounded
                size="28px"
                :color="$q.dark.isActive ? 'grey-9' : 'grey-3'"
                :text-color="$q.dark.isActive ? 'grey-5' : 'grey-7'"
                ><q-icon name="tag" size="16px" /></q-avatar></q-item-section
            ><q-item-section :class="$q.dark.isActive ? 'text-grey-1' : undefined">{{
              channel.name
            }}</q-item-section
            ><q-item-section side :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
              ><q-icon name="add" size="18px" /></q-item-section
            ><q-tooltip>Pripojiť sa ku #{{ channel.name }}</q-tooltip></q-item
          ></q-list
        >
        <p
          v-if="!discover.length"
          class="text-caption q-pa-sm"
          :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
        >
          {{ query ? 'Ďalšie kanály sa nenašli.' : 'Žiadne ďalšie verejné kanály.' }}
        </p>
      </nav>
    </q-scroll-area>
    <div class="q-pa-xs">
      <q-btn
        flat
        no-caps
        class="full-width"
        align="left"
        icon="science"
        label="Vyskúšať scenáre"
        @click="$emit('demo')"
      />
    </div>
    <q-separator />
    <q-item
      clickable
      class="q-my-xs"
      :aria-label="`Nastavenia profilu, ${store.user?.fullName ?? ''}`"
      @click="$emit('settings')"
    >
      <q-item-section avatar><UserAvatar :nickname="store.nickname" /></q-item-section>
      <q-item-section
        ><q-item-label>{{ store.user?.fullName }}</q-item-label
        ><q-item-label caption :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
          ><q-badge rounded :color="presenceColors[store.status]" class="q-mr-xs" />{{
            presenceLabels[store.status]
          }}</q-item-label
        ></q-item-section
      >
      <q-item-section side :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
        ><q-icon name="tune" size="20px"
      /></q-item-section>
    </q-item>
  </div>
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
import { useQuasar } from 'quasar';
import ConfirmationDialog from './ConfirmationDialog.vue';
import UserAvatar from './UserAvatar.vue';
import { presenceColors, presenceLabels, usePrototypeStore } from '@/stores/prototype';
import type { PrototypeChannel } from '@/stores/prototype';
const emit = defineEmits<{ close: []; create: []; settings: []; demo: [] }>();
const $q = useQuasar();
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
  closeOnMobile();
}
function join(id: string) {
  try {
    store.joinPublic(id);
    closeOnMobile();
  } catch (e) {
    store.feedback = e instanceof Error ? e.message : 'Pripojenie zlyhalo.';
  }
}
function accept(id: string) {
  try {
    store.acceptInvitation(id);
    closeOnMobile();
  } catch (e) {
    store.feedback = e instanceof Error ? e.message : 'Pozvánka už nie je platná.';
  }
}
function closeOnMobile() {
  if ($q.screen.width <= 700) emit('close');
}
function decline() {
  if (!decliningInvite.value) return;
  store.declineInvitation(decliningInvite.value.channel.id);
  decliningInvite.value = null;
}
</script>
