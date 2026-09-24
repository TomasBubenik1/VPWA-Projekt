import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface PrototypeUser {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
}

const userStorageKey = 'vpwa-phase-one-user';

function readUser(): PrototypeUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(userStorageKey);
    return stored ? (JSON.parse(stored) as PrototypeUser) : null;
  } catch {
    return null;
  }
}

export const usePrototypeStore = defineStore('prototype', () => {
  const user = ref<PrototypeUser | null>(readUser());

  function signIn(email: string, password: string) {
    if (!email.trim() || !password) throw new Error('Zadajte e-mail a heslo.');
    const stored = readUser();
    user.value = stored?.email.toLowerCase() === email.trim().toLowerCase()
      ? stored
      : {
          id: email.trim().toLowerCase(),
          email: email.trim(),
          fullName: email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Demo používateľ',
          nickname: email.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') || 'demo',
        };
    localStorage.setItem(userStorageKey, JSON.stringify(user.value));
  }

  function signUp(input: { fullName: string; nickname: string; email: string; password: string; confirmation: string }) {
    if (input.fullName.trim().length < 2) throw new Error('Zadajte meno a priezvisko.');
    if (!/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(input.nickname)) {
      throw new Error('Prezývka musí mať 3 až 32 znakov.');
    }
    if (!input.email.includes('@')) throw new Error('Zadajte platný e-mail.');
    if (input.password.length < 8) throw new Error('Heslo musí mať aspoň 8 znakov.');
    if (input.password !== input.confirmation) throw new Error('Heslá sa nezhodujú.');
    user.value = {
      id: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      nickname: input.nickname,
      email: input.email.trim(),
    };
    localStorage.setItem(userStorageKey, JSON.stringify(user.value));
  }

  function signOut() {
    user.value = null;
    localStorage.removeItem(userStorageKey);
  }

  return { user, signIn, signUp, signOut };
});
