<template>
  <q-layout view="lHh Lpr lFf" :class="isDark ? 'bg-grey-10 text-grey-1' : 'bg-grey-1 text-dark'">
    <q-drawer
      v-model="sidebarOpen"
      show-if-above
      :breakpoint="mobileBreakpoint"
      :width="isMobile ? 320 : 264"
      bordered
      :class="isDark ? 'bg-dark' : 'bg-grey-2'"
      @hide="afterSidebarHide"
    >
      <ChannelSidebar
        :mobile="isMobile"
        @close="sidebarOpen = false"
        @create="open('create')"
        @settings="open('settings')"
        @demo="open('demo')"
        @action="requestChannelAction"
      />
    </q-drawer>
    <q-header :class="isDark ? 'bg-dark text-white' : 'bg-white text-dark'">
      <ConversationHeader
        :mobile="isMobile"
        @open-sidebar="sidebarOpen = true"
        @members="open('members')"
        @invite="open('invite')"
        @help="open('help')"
        @leave="requestActiveChannelAction('leave')"
        @destroy="requestActiveChannelAction('destroy')"
      />
      <WorkspaceStatus />
    </q-header>
    <q-page-container>
      <q-page :style-fn="pageStyle" class="column no-wrap overflow-hidden" aria-label="Konverzácia">
        <MessageHistory
          v-if="channel"
          :key="`${store.sessionId}:${channel.id}`"
          :channel="channel"
        />
        <div v-else class="col column flex-center text-center q-pa-xl q-gutter-sm">
          <q-icon name="forum" color="primary" size="30px" />
          <h2 class="text-h6 q-ma-none">Zatiaľ nie ste v žiadnom kanáli</h2>
          <p class="q-mb-none">Pripojte sa k verejnému kanálu alebo založte vlastný.</p>
          <div class="row justify-center q-gutter-sm">
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Vytvoriť kanál"
              @click="open('create')"
            />
            <q-btn
              v-if="isMobile"
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
    <q-footer class="bg-transparent" :class="isDark ? 'text-white' : 'text-dark'">
      <CommandDock
        ref="dock"
        :mobile="isMobile"
        @members="open('members')"
        @leave="requestActiveChannelAction('leave')"
        @destroy="requestActiveChannelAction('destroy')"
        @help="open('help')"
        @show-draft="open('draft')"
      />
    </q-footer>
    <CreateChannelDialog v-model="dialogs.create" />
    <InviteMemberDialog v-model="dialogs.invite" />
    <ChannelActionDialog v-model="dialogs.channelAction" :action="channelAction" />
    <MembersPanel v-model="dialogs.members" :mobile="isMobile" @invite="open('invite')" />
    <SettingsDialog v-model="dialogs.settings" />
    <CommandHelpDialog v-model="dialogs.help" @insert="dock?.insert($event)" />
    <TypingPreviewDialog v-model="dialogs.draft" />
    <DemoScenarios v-model="dialogs.demo" :mobile="isMobile" />
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
import ChannelActionDialog from './ChannelActionDialog.vue';
import MembersPanel from './MembersPanel.vue';
import SettingsDialog from './SettingsDialog.vue';
import CommandHelpDialog from './CommandHelpDialog.vue';
import TypingPreviewDialog from './TypingPreviewDialog.vue';
import DemoScenarios from './DemoScenarios.vue';
import WorkspaceStatus from './WorkspaceStatus.vue';
import { usePrototypeStore } from '@/stores/prototype';
import { useWorkspaceDialogs } from '@/composables/useWorkspaceDialogs';
import { useWorkspaceNotifications } from '@/composables/useWorkspaceNotifications';
import type { ChannelAction } from '@/composables/useChannelAction';

const store = usePrototypeStore();
const $q = useQuasar();
const mobileBreakpoint = 700;
const isMobile = computed(() => $q.screen.width <= mobileBreakpoint);
const isDark = computed(() => $q.dark.isActive);
const channel = computed(() => store.activeChannel);
const dock = ref<InstanceType<typeof CommandDock>>();
const channelAction = ref<ChannelAction | null>(null);
const { sidebarOpen, dialogs, open, afterSidebarHide, reset } = useWorkspaceDialogs(isMobile);
useWorkspaceNotifications();

// QLayout supplies the live header/footer height: https://quasar.dev/layout/page
const pageStyle = (offset: number) => ({ height: `calc(100dvh - ${offset}px)`, minHeight: '0' });
function requestChannelAction(action: ChannelAction) {
  channelAction.value = action;
  open('channelAction');
}
function requestActiveChannelAction(kind: 'leave' | 'destroy') {
  if (channel.value) requestChannelAction({ kind, channelId: channel.value.id });
}
watch(
  () => store.sessionId,
  () => {
    reset();
    channelAction.value = null;
  },
);
onMounted(() => store.expireInactiveChannels());
</script>
