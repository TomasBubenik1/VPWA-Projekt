<template>
  <q-page class="workspace-page">
    <aside class="workspace-sidebar">
      <div class="workspace-brand"><span class="brand-mark"><q-icon name="forum" /></span><div><b>convo</b><small>FIIT Workspace</small></div><q-btn flat round dense icon="keyboard_arrow_down" aria-label="Výber pracovného priestoru" /></div>
      <div class="sidebar-search"><q-icon name="search" /><span>Hľadať</span><kbd>⌘ K</kbd></div>

      <div class="sidebar-section-title"><span>VAŠE KANÁLY</span><q-btn flat round dense icon="add" aria-label="Vytvoriť kanál" @click="createOpen = true" /></div>
      <q-list class="channel-list" dense>
        <q-item v-for="channel in joinedChannels" :key="channel.id" clickable :active="channel.id === store.activeChannelId" active-class="channel-selected" @click="selectChannel(channel.id)">
          <q-item-section avatar><q-icon :name="channel.isPrivate ? 'lock' : 'tag'" size="16px" /></q-item-section>
          <q-item-section>{{ channel.name }}</q-item-section>
          <q-item-section side><q-btn flat round dense size="sm" icon="more_horiz" :aria-label="`Možnosti #${channel.name}`" @click.stop><q-menu><q-list dense style="min-width: 168px">
            <q-item clickable v-close-popup @click="openInvite(channel)"><q-item-section avatar><q-icon name="person_add" /></q-item-section><q-item-section>Pozvať člena</q-item-section></q-item>
            <q-separator />
            <q-item clickable v-close-popup class="text-negative" @click="askLeave(channel)"><q-item-section avatar><q-icon name="logout" /></q-item-section><q-item-section>{{ isOwner(channel) ? 'Zrušiť kanál' : 'Opustiť kanál' }}</q-item-section></q-item>
          </q-list></q-menu></q-btn></q-item-section>
        </q-item>
        <div v-if="joinedChannels.length === 0" class="sidebar-empty">Zatiaľ nie ste členom žiadneho kanála.</div>
      </q-list>

      <template v-if="store.invitations.length">
        <div class="sidebar-section-title invite-title"><span>POZVÁNKY</span><span class="count-badge">{{ store.invitations.length }}</span></div>
        <div v-for="invite in invitationDetails" :key="invite.channel.id" class="invite-card">
          <div class="invite-card-title"><q-icon name="lock" /> #{{ invite.channel.name }}</div>
          <small>@{{ invite.from }} vás pozýva</small>
          <div class="invite-actions"><q-btn flat dense no-caps label="Odmietnuť" @click="store.declineInvitation(invite.channel.id)" /><q-btn unelevated dense no-caps color="primary" label="Prijať" @click="acceptInvite(invite.channel.id)" /></div>
        </div>
      </template>

      <div class="sidebar-section-title discover-title"><span>OBJAVIŤ KANÁLY</span></div>
      <q-list class="channel-list" dense>
        <q-item v-for="channel in publicChannels" :key="channel.id" class="discover-item">
          <q-item-section avatar><q-icon name="tag" size="16px" /></q-item-section><q-item-section>{{ channel.name }}</q-item-section>
          <q-item-section side><q-btn flat round dense icon="add" :aria-label="`Pridať sa do #${channel.name}`" @click="join(channel.id)" /></q-item-section>
        </q-item>
        <div v-if="publicChannels.length === 0" class="sidebar-empty">Ste v každom verejnom kanáli.</div>
      </q-list>

      <div class="sidebar-profile">
        <q-avatar size="34px" class="profile-avatar">{{ initials }}</q-avatar>
        <div class="profile-copy"><b>{{ store.user?.fullName }}</b><small><i :class="['status-dot', status.toLowerCase()]"></i>{{ statusLabel }}</small></div>
        <q-btn flat round dense icon="more_horiz" aria-label="Profil a nastavenia" @click="settingsOpen = true" />
      </div>
    </aside>

    <section class="workspace-main">
      <header class="conversation-header">
        <div class="conversation-heading">
          <div v-if="activeChannel" class="channel-symbol"><q-icon :name="activeChannel.isPrivate ? 'lock' : 'tag'" /></div>
          <div><h1>{{ activeChannel ? activeChannel.name : 'Vitajte v Convo' }}</h1><p>{{ activeChannel?.isPrivate ? 'Súkromný kanál' : activeChannel ? 'Verejný kanál' : 'Vytvorte alebo objavte kanál' }}</p></div>
        </div>
        <div class="header-actions">
          <q-btn flat round icon="group" aria-label="Členovia kanála" :disable="!activeChannel" @click="membersOpen = true"><q-tooltip>Členovia kanála</q-tooltip></q-btn>
          <q-btn flat round icon="notifications_none" aria-label="Nastavenia upozornení" @click="settingsOpen = true"><q-tooltip>Nastavenia upozornení</q-tooltip></q-btn>
          <q-btn flat round icon="info_outline" aria-label="Informácie o prototypu"><q-tooltip>Klikateľný prototyp · fáza 1</q-tooltip></q-btn>
        </div>
      </header>

      <main class="conversation-content">
        <div v-if="activeChannel" class="empty-conversation">
          <div class="conversation-icon"><q-icon name="forum" /></div>
          <div class="conversation-overline">KANÁL #{{ activeChannel.name }}</div>
          <h2>Tu sa začína dobrá konverzácia.</h2>
          <p>Pošlite prvú správu alebo pozvite niekoho do kanála.</p>
          <q-btn outline no-caps color="primary" icon="person_add" label="Pozvať člena" @click="openInvite(activeChannel)" />
        </div>
        <div v-else class="empty-conversation">
          <div class="conversation-icon"><q-icon name="forum" /></div>
          <div class="conversation-overline">VÁŠ PRACOVNÝ PRIESTOR</div>
          <h2>Začnime konverzáciu.</h2>
          <p>Vytvorte kanál alebo sa pridajte k verejnému.</p>
          <q-btn unelevated no-caps color="primary" icon="add" label="Vytvoriť kanál" @click="createOpen = true" />
        </div>
      </main>

      <footer class="command-dock">
        <q-input v-model="commandLine" borderless autogrow dense class="command-input" :placeholder="activeChannel ? `Správa do #${activeChannel.name} alebo zadajte príkaz…` : 'Zadajte /join názov-kanála na vytvorenie alebo pripojenie…'" @keydown.enter.exact.prevent="submitCommand">
          <template #prepend><q-icon name="add_circle_outline" color="grey-6" /></template>
          <template #append><span class="enter-key">↵</span></template>
        </q-input>
        <div class="command-hints"><span>Enter odošle</span><span>/join kanál</span><span>/cancel</span><span>/quit</span></div>
      </footer>
    </section>

    <q-dialog v-model="createOpen">
      <q-card class="prototype-dialog">
        <q-card-section class="dialog-heading"><div class="dialog-icon"><q-icon name="tag" /></div><div><h2>Vytvoriť kanál</h2><p>Kanály udržia konverzácie prehľadné.</p></div></q-card-section>
        <q-card-section class="q-pt-none"><q-form @submit.prevent="create">
          <label class="field-label">Názov kanála</label><q-input v-model.trim="newChannelName" outlined dense placeholder="napr. produktovy-tim" prefix="#" autofocus />
          <div class="privacy-choice" @click="newChannelPrivate = !newChannelPrivate"><q-icon :name="newChannelPrivate ? 'lock' : 'tag'" /><div><b>{{ newChannelPrivate ? 'Súkromný' : 'Verejný' }}</b><small>{{ newChannelPrivate ? 'Iba pozvaní členovia môžu vstúpiť.' : 'Ktokoľvek v priestore sa môže pridať.' }}</small></div><q-toggle v-model="newChannelPrivate" color="primary" /></div>
          <q-banner v-if="dialogError" dense rounded class="auth-message">{{ dialogError }}</q-banner>
          <div class="dialog-actions"><q-btn flat no-caps label="Zrušiť" v-close-popup /><q-btn unelevated no-caps color="primary" label="Vytvoriť kanál" type="submit" /></div>
        </q-form></q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="inviteOpen">
      <q-card class="prototype-dialog">
        <q-card-section class="dialog-heading"><div class="dialog-icon"><q-icon name="person_add" /></div><div><h2>Pridať ľudí</h2><p>Pozývate do #{{ inviteChannel?.name }}</p></div></q-card-section>
        <q-card-section class="q-pt-none"><q-form @submit.prevent="invite">
          <label class="field-label">Prezývka</label><q-input v-model.trim="inviteNickname" outlined dense placeholder="napr. sam" prefix="@" autofocus />
          <div v-if="inviteError" class="inline-error">{{ inviteError }}</div>
          <div class="dialog-actions"><q-btn flat no-caps label="Zrušiť" v-close-popup /><q-btn unelevated no-caps color="primary" label="Pozvať" type="submit" /></div>
        </q-form></q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="leaveOpen">
      <q-card class="prototype-dialog">
        <q-card-section class="dialog-heading"><div class="dialog-icon danger"><q-icon :name="leaveChannelTarget && isOwner(leaveChannelTarget) ? 'delete_outline' : 'logout'" /></div><div><h2>{{ leaveChannelTarget && isOwner(leaveChannelTarget) ? 'Zrušiť kanál?' : 'Opustiť kanál?' }}</h2><p>{{ leaveChannelTarget && isOwner(leaveChannelTarget) ? `#${leaveChannelTarget.name} zanikne pre všetkých členov.` : `Kanál #${leaveChannelTarget?.name} sa odstráni z vášho zoznamu.` }}</p></div></q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Späť" v-close-popup /><q-btn unelevated no-caps color="negative" :label="leaveChannelTarget && isOwner(leaveChannelTarget) ? 'Zrušiť kanál' : 'Opustiť kanál'" @click="confirmLeave" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="settingsOpen">
      <q-card class="prototype-dialog settings-dialog">
        <q-card-section class="dialog-heading"><div class="dialog-icon"><q-icon name="tune" /></div><div><h2>Vaše nastavenia</h2><p>Prispôsobte si dostupnosť a upozornenia.</p></div></q-card-section>
        <q-card-section class="settings-group"><div class="settings-label">VÁŠ STAV</div><q-option-group v-model="status" :options="statusOptions" type="radio" color="primary" inline /></q-card-section>
        <q-separator inset />
        <q-card-section class="settings-group"><div class="settings-label">UPOZORNENIA</div><q-toggle v-model="notifyDirectOnly" color="primary" label="Iba správy adresované mne" /><q-toggle v-model="notificationsEnabled" color="primary" label="Upozorniť ma, keď je Convo skryté" /></q-card-section>
        <q-card-actions align="between"><q-btn flat no-caps color="negative" label="Odhlásiť sa" @click="store.signOut()" /><q-btn unelevated no-caps color="primary" label="Hotovo" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="membersOpen" position="right">
      <q-card class="members-panel">
        <q-card-section class="row items-center justify-between"><div><h2>Členovia</h2><p>#{{ activeChannel?.name }}</p></div><q-btn flat round dense icon="close" v-close-popup /></q-card-section>
        <q-separator /><q-list separator><q-item v-for="member in activeChannel?.members" :key="member"><q-item-section avatar><q-avatar size="34px" :color="avatarColor(member)" text-color="white">{{ member.slice(0, 2).toUpperCase() }}</q-avatar></q-item-section><q-item-section><q-item-label>@{{ member }}{{ member === store.user?.nickname ? ' (vy)' : '' }}</q-item-label><q-item-label caption>{{ member === activeChannel?.owner ? 'Správca' : 'Člen' }}</q-item-label></q-item-section></q-item></q-list>
      </q-card>
    </q-dialog>
    <q-banner v-if="store.feedback" class="prototype-toast" rounded>{{ store.feedback }}<template #action><q-btn flat round dense icon="close" @click="store.feedback = ''" /></template></q-banner>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { usePrototypeStore, type PrototypeChannel } from '@/stores/prototype';

const store = usePrototypeStore();
const nickname = computed(() => store.user?.nickname ?? 'alex');
const joinedChannels = computed(() => store.channels.filter((channel) => channel.members.includes(nickname.value)));
const publicChannels = computed(() => store.channels.filter((channel) => !channel.isPrivate && !channel.members.includes(nickname.value)));
const activeChannel = computed(() => joinedChannels.value.find((channel) => channel.id === store.activeChannelId));
const invitationDetails = computed(() => store.invitations.flatMap((invite) => {
  const channel = store.channels.find((item) => item.id === invite.channelId);
  return channel ? [{ channel, from: invite.from }] : [];
}));
const initials = computed(() => store.user?.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() ?? 'A');
const avatarPalette = ['#7a71d9', '#4e9a83', '#dc936e', '#547fbc', '#aa78b8'];

const createOpen = ref(false);
const newChannelName = ref('');
const newChannelPrivate = ref(false);
const dialogError = ref('');
const inviteOpen = ref(false);
const inviteChannel = ref<PrototypeChannel | null>(null);
const inviteNickname = ref('');
const inviteError = ref('');
const leaveOpen = ref(false);
const leaveChannelTarget = ref<PrototypeChannel | null>(null);
const settingsOpen = ref(false);
const membersOpen = ref(false);
const commandLine = ref('');
const status = ref<'Online' | 'DND' | 'Offline'>('Online');
const notifyDirectOnly = ref(false);
const notificationsEnabled = ref(true);
const statusOptions = [
  { label: 'Online', value: 'Online' },
  { label: 'DND', value: 'DND' },
  { label: 'Offline', value: 'Offline' },
];

onMounted(() => store.expireInactiveChannels());

const statusLabel = computed(() => status.value === 'DND' ? 'Nerušiť' : status.value === 'Offline' ? 'Offline' : 'Online');
const avatarColor = (name: string) => avatarPalette[Math.abs(name.split('').reduce((n, char) => n + char.charCodeAt(0), 0)) % avatarPalette.length];
const isOwner = (channel: PrototypeChannel) => channel.owner === nickname.value;

function selectChannel(id: string) { store.activeChannelId = id; store.saveWorkspace(); }
function openInvite(channel: PrototypeChannel) { inviteChannel.value = channel; inviteNickname.value = ''; inviteError.value = ''; inviteOpen.value = true; }
function acceptInvite(id: string) { store.acceptInvitation(id); store.feedback = 'Pozvánka prijatá. Kanál je teraz vo vašom zozname.'; }
function join(id: string) { store.joinPublic(id); store.feedback = 'Pripojili ste sa k verejnému kanálu.'; }
function create() {
  dialogError.value = '';
  try {
    store.createChannel(newChannelName.value, newChannelPrivate.value);
    createOpen.value = false;
    newChannelName.value = '';
    newChannelPrivate.value = false;
    store.feedback = 'Kanál bol vytvorený.';
  } catch (reason) { dialogError.value = reason instanceof Error ? reason.message : 'Kanál sa nepodarilo vytvoriť.'; }
}
function invite() {
  inviteError.value = '';
  const channel = inviteChannel.value;
  const target = inviteNickname.value.replace(/^@/, '');
  if (!channel || !target) { inviteError.value = 'Zadajte prezývku používateľa.'; return; }
  if (channel.isPrivate && !isOwner(channel)) { inviteError.value = 'Súkromné kanály môže pozývať iba správca.'; return; }
  if (target.toLowerCase() === nickname.value.toLowerCase()) { inviteError.value = 'Už ste členom tohto kanála.'; return; }
  if (channel.members.includes(target)) { inviteError.value = `Používateľ @${target} už je členom.`; return; }
  if (!channel.isPrivate) channel.members.push(target);
  store.saveWorkspace();
  inviteOpen.value = false;
  store.feedback = `@${target} bol pridaný do #${channel.name}.`;
}
function askLeave(channel: PrototypeChannel) { leaveChannelTarget.value = channel; leaveOpen.value = true; }
function confirmLeave() {
  if (!leaveChannelTarget.value) return;
  const owner = isOwner(leaveChannelTarget.value);
  store.leaveChannel(leaveChannelTarget.value.id);
  store.feedback = owner ? 'Kanál bol zrušený.' : 'Opustili ste kanál.';
  leaveOpen.value = false;
}
function submitCommand() {
  const value = commandLine.value.trim();
  if (!value) return;
  if (value.startsWith('/')) {
    try {
      store.processChannelCommand(value);
      commandLine.value = '';
      store.feedback = 'Príkaz bol vykonaný.';
    } catch (reason) { store.feedback = reason instanceof Error ? reason.message : 'Príkaz sa nepodarilo vykonať.'; }
    return;
  }
  store.feedback = 'Odosielanie správ je súčasťou ďalšej časti prototypu.';
}
</script>
