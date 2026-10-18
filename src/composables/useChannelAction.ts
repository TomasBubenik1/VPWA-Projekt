import { computed, ref, watch, type Ref } from 'vue';
import type { createPrototypeStore } from '../stores/prototype.ts';

export interface ChannelAction {
  kind: 'join' | 'decline' | 'leave' | 'destroy';
  channelId: string;
}

// Keep the target ID from the clicked row, even when a different conversation is active.
export function useChannelAction(
  action: Readonly<Ref<ChannelAction | null>>,
  store: ReturnType<typeof createPrototypeStore>,
) {
  const error = ref('');
  const channel = computed(() =>
    store.channels.find((item) => item.id === action.value?.channelId),
  );
  const details = computed(() => {
    const name = `#${channel.value?.name ?? ''}`;
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
            channel.value?.owner === store.nickname
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

  function confirm() {
    const request = action.value;
    const target = channel.value;
    try {
      if (!request || !target) throw new Error('Kanál už neexistuje.');
      switch (request.kind) {
        case 'join':
          store.joinPublic(target.id);
          break;
        case 'decline':
          if (!store.invitations.some((invite) => invite.channelId === target.id))
            throw new Error('Pozvánka už nie je platná.');
          store.declineInvitation(target.id);
          break;
        case 'destroy':
        case 'leave': {
          const isOwner = target.owner === store.nickname;
          if (request.kind === 'destroy' && !isOwner)
            throw new Error('Kanál môže zrušiť iba správca.');
          store.leaveChannel(target.id);
          store.feedback = isOwner ? 'Kanál bol zrušený.' : 'Opustili ste kanál.';
          break;
        }
      }
      error.value = '';
      return true;
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'Akciu sa nepodarilo dokončiť.';
      return false;
    }
  }
  return { details, error, confirm };
}
