<template>
  <q-layout view="lHh Lpr lFf" :class="isDark ? 'bg-grey-10 text-grey-1' : 'bg-grey-1 text-dark'">
    <q-drawer
      v-model="sidebarOpen"
      show-if-above
      :breakpoint="700"
      :width="drawerWidth"
      bordered
      :class="isDark ? 'bg-dark' : 'bg-grey-2'"
      @hide="openSidebarDestination"
    >
      <ChannelSidebar
        @close="sidebarOpen = false"
        @create="openFromSidebar('create')"
        @settings="openFromSidebar('settings')"
        @demo="openFromSidebar('demo')"
      />
    </q-drawer>

    <q-header :class="isDark ? 'bg-dark text-white' : 'bg-white text-dark'">
      <ConversationHeader
        @open-sidebar="sidebarOpen = true"
        @members="membersOpen = true"
        @invite="inviteOpen = true"
        @help="helpOpen = true"
        @leave="openLeave('leave')"
        @destroy="openLeave('destroy')"
      />
      <q-banner v-if="store.status === 'offline'" dense :class="isDark ? 'bg-grey-9' : 'bg-grey-2'">
        <q-icon name="cloud_off" size="18px" class="q-mr-sm" />
        <span>Ste offline. Nové správy sa doručia po návrate online.</span>
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          label="Prejsť online"
          @click="store.setStatus('online')"
        />
      </q-banner>
      <q-banner
        v-else-if="store.status === 'dnd'"
        dense
        :class="isDark ? 'bg-grey-9' : 'bg-grey-2'"
      >
        <q-icon name="do_not_disturb_on" size="18px" class="q-mr-sm" />
        <span>Nerušiť je zapnuté. Správy prichádzajú bez upozornení.</span>
      </q-banner>
      <q-banner
        v-if="store.storageWarning"
        dense
        role="alert"
        :class="isDark ? 'bg-grey-9' : 'bg-grey-2'"
      >
        {{ store.storageWarning }}
      </q-banner>
    </q-header>

    <q-page-container>
      <q-page :style-fn="pageStyle" class="column no-wrap overflow-hidden" aria-label="Konverzácia">
        <MessageHistory v-if="channel" :channel="channel" />
        <div v-else class="col column flex-center text-center q-pa-xl q-gutter-sm">
          <q-icon name="forum" color="primary" size="30px" />
          <h2 class="text-h6 q-ma-none">Zatiaľ nie ste v žiadnom kanáli</h2>
          <p class="q-mb-none" :class="isDark ? 'text-grey-4' : 'text-grey-7'">
            Pripojte sa k verejnému kanálu alebo založte vlastný.
          </p>
          <div class="row justify-center q-gutter-sm">
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Vytvoriť kanál"
              @click="createOpen = true"
            />
            <q-btn
              v-if="$q.screen.width <= 700"
              flat
              no-caps
              color="primary"
              label="Otvoriť kanály"
              @click="sidebarOpen = true"
            />
          </div>
        </div>
      </q-page>
    </q-page-container>

    <q-footer :class="isDark ? 'bg-transparent text-white' : 'bg-transparent text-dark'">
      <CommandDock
        ref="dock"
        @members="membersOpen = true"
        @leave="openLeave('leave')"
        @destroy="openLeave('destroy')"
        @help="helpOpen = true"
        @show-draft="draftOpen = true"
      />
    </q-footer>

    <CreateChannelDialog v-model="createOpen" />
    <InviteMemberDialog v-model="inviteOpen" />
    <LeaveChannelDialog v-model="leaveOpen" :mode="leaveMode" @left="membersOpen = false" />
    <MembersPanel v-model="membersOpen" @invite="inviteOpen = true" />
    <SettingsDialog v-model="settingsOpen" />
    <CommandHelpDialog v-model="helpOpen" @insert="dock?.insert($event)" />
    <TypingPreviewDialog v-model="draftOpen" />
    <DemoScenarios v-model="demoOpen" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import ChannelSidebar from './ChannelSidebar.vue';
import ConversationHeader from './ConversationHeader.vue';
import MessageHistory from './MessageHistory.vue';
import CommandDock from './CommandDock.vue';
import CreateChannelDialog from './CreateChannelDialog.vue';
import InviteMemberDialog from './InviteMemberDialog.vue';
import LeaveChannelDialog from './LeaveChannelDialog.vue';
import MembersPanel from './MembersPanel.vue';
import SettingsDialog from './SettingsDialog.vue';
import CommandHelpDialog from './CommandHelpDialog.vue';
import TypingPreviewDialog from './TypingPreviewDialog.vue';
import DemoScenarios from './DemoScenarios.vue';
import { usePrototypeStore } from '@/stores/prototype';

// Page layout only: it places the parts and decides which dialog is open.
const store = usePrototypeStore();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);
const drawerWidth = computed(() =>
  $q.screen.width <= 700
    ? 320
    : $q.screen.width >= 1500
      ? 284
      : $q.screen.width <= 1000
        ? 236
        : 264,
);
// QPage style-fn receives the live header/footer offset from QLayout.
// https://quasar.dev/layout/page
const pageStyle = (offset: number) => ({ height: `calc(100dvh - ${offset}px)`, minHeight: '0' });
const channel = computed(() => store.activeChannel);
const dock = ref<InstanceType<typeof CommandDock>>();

const sidebarOpen = ref(false);
const createOpen = ref(false);
const inviteOpen = ref(false);
const leaveOpen = ref(false);
const leaveMode = ref<'leave' | 'destroy'>('leave');
const membersOpen = ref(false);
const settingsOpen = ref(false);
const helpOpen = ref(false);
const draftOpen = ref(false);
const demoOpen = ref(false);

// On mobile a dialog opens after QDrawer has finished closing.
type SidebarDestination = 'create' | 'settings' | 'demo';
let sidebarDestination: SidebarDestination | null = null;
function openFromSidebar(destination: SidebarDestination) {
  if ($q.screen.width > 700) {
    showSidebarDestination(destination);
    return;
  }
  sidebarDestination = destination;
  sidebarOpen.value = false;
}
function openLeave(mode: 'leave' | 'destroy') {
  leaveMode.value = mode;
  leaveOpen.value = true;
}
function openSidebarDestination() {
  if (sidebarDestination) showSidebarDestination(sidebarDestination);
  sidebarDestination = null;
}
function showSidebarDestination(destination: SidebarDestination) {
  if (destination === 'create') createOpen.value = true;
  if (destination === 'settings') settingsOpen.value = true;
  if (destination === 'demo') demoOpen.value = true;
}

onMounted(() => store.expireInactiveChannels());
watch(
  () => store.feedback,
  (message) => {
    if (!message) return;
    $q.notify({
      message,
      icon: 'info_outline',
      position: 'bottom',
      timeout: 6500,
      color: isDark.value ? 'grey-9' : 'grey-2',
      textColor: isDark.value ? 'white' : 'dark',
      actions: [{ icon: 'close', color: isDark.value ? 'white' : 'dark' }],
    });
    store.feedback = '';
  },
);
watch(
  () => store.notices[0]?.id,
  (id) => {
    if (!id) return;
    const notice = store.notices[0];
    if (!notice) return;
    const channelName = store.data.channels.find(
      (channel) => channel.id === notice.channelId,
    )?.name;
    $q.notify({
      message: channelName ? `@${notice.from} · #${channelName}` : `@${notice.from}`,
      caption: notice.body,
      icon: 'chat_bubble_outline',
      position: 'top-right',
      timeout: 6500,
      color: isDark.value ? 'grey-9' : 'grey-2',
      textColor: isDark.value ? 'white' : 'dark',
      actions: [{ icon: 'close', color: isDark.value ? 'white' : 'dark' }],
    });
  },
);
</script>
