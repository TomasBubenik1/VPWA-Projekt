import { computed, ref, watch, type Ref } from 'vue';
import type { createWorkspaceStore } from '../stores/workspace.ts';

export interface ChannelAction {
  kind: 'join' | 'decline' | 'leave' | 'destroy';
  channelId: number;
  invitationId?: number;
}
export function useChannelAction(
  action: Readonly<Ref<ChannelAction | null>>,
  store: ReturnType<typeof createWorkspaceStore>,
) {
  const error = ref('');
  const busy = ref(false);
  const channel = computed(() =>
    store.channels.find((item) => item.id === action.value?.channelId),
  );
  const details = computed(() => {
    const name = `#${channel.value?.name ?? store.invitations.find((i) => i.id === action.value?.invitationId)?.channelName ?? ''}`;
    switch (action.value?.kind) {
      case 'join':
        return {
          title: 'Pripojiť sa ku kanálu?',
          message: `Pripojíte sa do verejného kanála ${name}.`,
          label: 'Pripojiť sa',
          destructive: false,
        };
      case 'decline':
        return {
          title: 'Odmietnuť pozvánku?',
          message: `Pozvánka do ${name} sa odstráni.`,
          label: 'Odmietnuť',
          destructive: true,
        };
      case 'destroy':
        return {
          title: 'Zrušiť kanál?',
          message: `Kanál ${name} aj jeho správy sa odstránia všetkým členom. Tento krok sa nedá vrátiť.`,
          label: 'Zrušiť kanál',
          destructive: true,
        };
      default:
        return {
          title: 'Opustiť kanál?',
          message:
            channel.value?.ownerId === store.user?.id
              ? `Odchodom správcu kanál ${name} zanikne aj pre ostatných členov.`
              : `Kanál ${name} zmizne z vášho zoznamu.`,
          label: 'Opustiť kanál',
          destructive: true,
        };
    }
  });
  watch(action, () => {
    error.value = '';
  });
  async function confirm() {
    if (busy.value) return false;
    busy.value = true;
    const request = action.value;
    try {
      if (!request) throw new Error('Vyberte kanál.');
      switch (request.kind) {
        case 'join':
          await store.joinPublic(request.channelId);
          break;
        case 'decline':
          if (!request.invitationId) throw new Error('Pozvánka už nie je platná.');
          await store.declineInvitation(request.invitationId);
          break;
        case 'destroy':
          await store.destroyChannel(request.channelId);
          store.feedback = 'Kanál bol zrušený.';
          break;
        case 'leave': {
          const isOwner = channel.value?.ownerId === store.user?.id;
          await store.leaveChannel(request.channelId);
          store.feedback = isOwner ? 'Kanál bol zrušený.' : 'Opustili ste kanál.';
          break;
        }
      }
      error.value = '';
      return true;
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'Akciu sa nepodarilo dokončiť.';
      return false;
    } finally {
      busy.value = false;
    }
  }
  return { details, error, busy, confirm };
}
