import { computed, reactive, ref, type Ref } from 'vue';

type Dialog =
  'create' | 'invite' | 'members' | 'settings' | 'help' | 'draft' | 'demo' | 'channelAction';

// One workspace dialog at a time; a mobile drawer finishes closing before it opens.
export function useWorkspaceDialogs(isMobile: Readonly<Ref<boolean>>) {
  const sidebarOpen = ref(false);
  const active = ref<Dialog | null>(null);
  let pending: Dialog | null = null;
  const model = (name: Dialog) =>
    computed({
      get: () => active.value === name,
      set: (value: boolean) => {
        if (value) open(name);
        else if (active.value === name) active.value = null;
      },
    });
  const dialogs = reactive({
    create: model('create'),
    invite: model('invite'),
    members: model('members'),
    settings: model('settings'),
    help: model('help'),
    draft: model('draft'),
    demo: model('demo'),
    channelAction: model('channelAction'),
  });

  function open(name: Dialog) {
    if (isMobile.value && sidebarOpen.value) {
      pending = name;
      sidebarOpen.value = false;
    } else {
      pending = null;
      active.value = name;
    }
  }
  function afterSidebarHide() {
    if (pending) active.value = pending;
    pending = null;
  }
  function reset() {
    pending = null;
    active.value = null;
    sidebarOpen.value = false;
  }
  return { sidebarOpen, dialogs, open, afterSidebarHide, reset };
}
