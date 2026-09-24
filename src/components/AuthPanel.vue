<template>
  <main class="auth-screen">
    <section class="auth-story">
      <div class="brand-lockup"><span class="brand-mark"><q-icon name="forum" /></span><span>convo</span></div>
      <div>
        <div class="eyebrow">MENEJ CHAOSU. VIAC KONVERZÁCIE.</div>
        <h1>Všetky dobré<br />rozhovory začínajú<br /><span>na jednom mieste.</span></h1>
        <p>Kanály, správy a ľudia. Všetko, čo váš tím potrebuje na to, aby zostal v spojení.</p>
      </div>
      <div class="story-footer"><span class="avatar-stack"><i>MK</i><i>JP</i><i>AS</i><i>+</i></span><span>Priestor pre každý nápad.</span></div>
    </section>

    <section class="auth-form-wrap">
      <q-card flat class="auth-card">
        <div class="auth-heading">
          <div class="eyebrow">VITAJTE V CONVO</div>
          <h2>{{ mode === 'login' ? 'Prihláste sa do svojho účtu' : 'Vytvorte si účet' }}</h2>
          <p>{{ mode === 'login' ? 'Pokračujte tam, kde sa tím práve rozpráva.' : 'Zaberie to iba chvíľu.' }}</p>
        </div>

        <q-tabs v-model="mode" class="auth-tabs" no-caps dense align="left" indicator-color="primary" active-color="primary">
          <q-tab name="login" label="Prihlásenie" />
          <q-tab name="signup" label="Registrácia" />
        </q-tabs>

        <q-form class="auth-fields" @submit.prevent="submit">
          <template v-if="mode === 'signup'">
            <label class="field-label">Meno a priezvisko</label>
            <q-input v-model.trim="fullName" outlined dense placeholder="Napr. Alex Smith" autocomplete="name" />
            <label class="field-label">Prezývka</label>
            <q-input v-model.trim="nickname" outlined dense placeholder="alexsmith" autocomplete="username" />
          </template>
          <label class="field-label">E-mail</label>
          <q-input v-model.trim="email" outlined dense type="email" placeholder="meno@firma.sk" autocomplete="email" />
          <div class="password-label"><label class="field-label">Heslo</label><a href="#" @click.prevent="message = 'Obnova hesla bude dostupná po pripojení backendu.'">Zabudli ste heslo?</a></div>
          <q-input v-model="password" outlined dense type="password" placeholder="Aspoň 8 znakov" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" />
          <template v-if="mode === 'signup'">
            <label class="field-label">Potvrdenie hesla</label>
            <q-input v-model="confirmation" outlined dense type="password" placeholder="Zopakujte heslo" autocomplete="new-password" />
          </template>
          <q-banner v-if="message" dense rounded class="auth-message">{{ message }}</q-banner>
          <q-btn type="submit" no-caps unelevated color="primary" class="auth-submit" :label="mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet'"><q-icon name="arrow_forward" size="18px" class="q-ml-sm" /></q-btn>
        </q-form>
        <div class="auth-switch">{{ mode === 'login' ? 'Ešte nemáte účet?' : 'Už máte účet?' }} <button @click="toggleMode">{{ mode === 'login' ? 'Zaregistrujte sa' : 'Prihláste sa' }}</button></div>
        <div class="prototype-note"><q-icon name="info_outline" /> Klikateľný prototyp · údaje zostávajú v tomto prehliadači</div>
      </q-card>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePrototypeStore } from '@/stores/prototype';

const emit = defineEmits<{ authenticated: [] }>();
const store = usePrototypeStore();
const mode = ref<'login' | 'signup'>('login');
const fullName = ref('');
const nickname = ref('');
const email = ref('alex@convo.app');
const password = ref('convo-demo');
const confirmation = ref('');
const message = ref('');

function toggleMode() {
  message.value = '';
  mode.value = mode.value === 'login' ? 'signup' : 'login';
}

function submit() {
  message.value = '';
  try {
    if (mode.value === 'login') store.signIn(email.value, password.value);
    else store.signUp({ fullName: fullName.value, nickname: nickname.value, email: email.value, password: password.value, confirmation: confirmation.value });
    emit('authenticated');
  } catch (reason) {
    message.value = reason instanceof Error ? reason.message : 'Nepodarilo sa pokračovať.';
  }
}
</script>
