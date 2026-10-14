<template>
  <q-page class="workspace-page">
    <div class="desktop-sidebar">
      <ChannelSidebar
        @create="createOpen = true"
        @settings="settingsOpen = true"
        @demo="demoOpen = true"
      />
    </div>
    <q-dialog
      v-model="sidebarOpen"
      position="left"
      class="sidebar-dialog"
      @hide="openSidebarDestination"
    >
      <div>
        <ChannelSidebar
          @close="sidebarOpen = false"
          @create="closeSidebarFor('create')"
          @settings="closeSidebarFor('settings')"
          @demo="closeSidebarFor('demo')"
        />
      </div>
    </q-dialog>

    <section class="workspace-main" aria-label="Konverzácia">
      <ConversationHeader
        @open-sidebar="sidebarOpen = true"
        @members="membersOpen = true"
        @invite="inviteOpen = true"
        @help="helpOpen = true"
        @leave="openLeave('leave')"
        @destroy="openLeave('destroy')"
      />
      <div v-if="store.status === 'offline'" class="status-banner">
        <q-icon name="cloud_off" size="18px" />
        <span>Ste offline. Nové správy sa doručia po návrate online.</span>
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          label="Prejsť online"
          @click="store.setStatus('online')"
        />
      </div>
      <div v-else-if="store.status === 'dnd'" class="status-banner">
        <q-icon name="do_not_disturb_on" size="18px" />
        <span>Nerušiť je zapnuté. Správy prichádzajú bez upozornení.</span>
      </div>
      <div v-if="store.storageWarning" class="status-banner" role="alert">
        {{ store.storageWarning }}
      </div>

      <MessageHistory v-if="channel" :channel="channel" />
      <div v-else class="workspace-empty empty-state">
        <span class="empty-icon"><q-icon name="forum" size="30px" /></span>
        <h2>Zatiaľ nie ste v žiadnom kanáli</h2>
        <p>Pripojte sa k verejnému kanálu alebo založte vlastný.</p>
        <div class="workspace-empty-actions">
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Vytvoriť kanál"
            @click="createOpen = true"
          />
          <q-btn
            flat
            no-caps
            color="primary"
            class="mobile-control"
            label="Otvoriť kanály"
            @click="sidebarOpen = true"
          />
        </div>
      </div>

      <CommandDock
        ref="dock"
        @members="membersOpen = true"
        @leave="openLeave('leave')"
        @destroy="openLeave('destroy')"
        @help="helpOpen = true"
        @show-draft="draftOpen = true"
      />
    </section>

    <CreateChannelDialog v-model="createOpen" />
    <InviteMemberDialog v-model="inviteOpen" />
    <LeaveChannelDialog v-model="leaveOpen" :mode="leaveMode" @left="membersOpen = false" />
    <MembersPanel v-model="membersOpen" @invite="inviteOpen = true" />
    <SettingsDialog v-model="settingsOpen" />
    <CommandHelpDialog v-model="helpOpen" @insert="dock?.insert($event)" />
    <TypingPreviewDialog v-model="draftOpen" />
    <DemoScenarios v-model="demoOpen" />
    <FeedbackToast />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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
import FeedbackToast from './FeedbackToast.vue';
import { usePrototypeStore } from '@/stores/prototype';

// Page layout only: it places the parts and decides which dialog is open.
const store = usePrototypeStore();
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

// On mobile the sidebar is a dialog. A second dialog opens only after it has fully closed.
type SidebarDestination = 'create' | 'settings' | 'demo';
let sidebarDestination: SidebarDestination | null = null;
function closeSidebarFor(destination: SidebarDestination) {
  sidebarDestination = destination;
  sidebarOpen.value = false;
}
function openLeave(mode: 'leave' | 'destroy') {
  leaveMode.value = mode;
  leaveOpen.value = true;
}
function openSidebarDestination() {
  if (sidebarDestination === 'create') createOpen.value = true;
  if (sidebarDestination === 'settings') settingsOpen.value = true;
  if (sidebarDestination === 'demo') demoOpen.value = true;
  sidebarDestination = null;
}

onMounted(() => store.expireInactiveChannels());
</script>
