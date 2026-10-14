<template>
  <main class="auth-screen">
    <aside class="auth-welcome" aria-label="Convo">
      <div class="brand-lockup"><q-icon name="forum" size="26px" /><span>convo</span></div>
      <!-- Decorative preview built from the demo data: an invite, a mention and typing. -->
      <div class="auth-preview" aria-hidden="true">
        <div class="preview-card preview-invite">
          <q-icon name="lock_outline" size="18px" />
          <div>
            <b>launch-week</b>
            <small>@jules vás pozýva</small>
          </div>
          <span class="preview-pill">Prijať</span>
        </div>
        <div class="preview-card preview-message">
          <UserAvatar nickname="mira" />
          <div>
            <b>Mira Novotná</b>
            <p><span class="mention">@alex</span> pozrieš ešte odosielanie cez Enter?</p>
          </div>
        </div>
        <div class="preview-card preview-typing">
          <span class="typing-dots"><i /><i /><i /></span>@nina píše
        </div>
      </div>
      <p class="auth-welcome-title">Dobrý tím začína rozhovorom.</p>
    </aside>
    <q-btn
      class="auth-theme-toggle"
      flat
      round
      :icon="isDark ? 'light_mode' : 'dark_mode'"
      :aria-label="isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'"
      @click="toggleTheme"
    >
      <q-tooltip>{{ isDark ? 'Svetlý režim' : 'Tmavý režim' }}</q-tooltip>
    </q-btn>
    <header class="auth-brand brand-lockup">
      <q-icon name="forum" size="28px" /><span>convo</span>
    </header>
    <section class="auth-form-wrap" aria-labelledby="auth-title">
      <div class="auth-card">
        <h1 id="auth-title">{{ mode === 'login' ? 'Vitajte späť.' : 'Pridajte sa k tímu.' }}</h1>
        <p v-if="mode === 'login'" class="auth-intro">Pokračujte tam, kde ste skončili.</p>
        <q-tabs
          v-model="mode"
          no-caps
          align="left"
          active-color="primary"
          indicator-color="primary"
          class="auth-tabs"
          @update:model-value="message = ''"
          ><q-tab name="login" label="Prihlásenie" /><q-tab name="signup" label="Registrácia"
        /></q-tabs>
        <q-form class="auth-fields" @submit="submit">
          <template v-if="mode === 'signup'">
            <q-input
              v-model.trim="fullName"
              outlined
              hide-bottom-space
              label="Meno a priezvisko"
              autocomplete="name"
              :rules="[
                (v) => String(v).trim().split(/\s+/).length >= 2 || 'Vyplňte meno aj priezvisko.',
              ]"
              lazy-rules
            />
            <q-input
              v-model.trim="nickname"
              outlined
              hide-bottom-space
              label="Prezývka"
              autocomplete="username"
              :rules="[
                (v) =>
                  /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(String(v)) ||
                  'Prezývka musí začínať písmenom.',
              ]"
              lazy-rules
            />
          </template>
          <q-input
            v-model.trim="email"
            outlined
            hide-bottom-space
            type="email"
            label="E-mail"
            autocomplete="email"
            :rules="[
              (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) || 'Zadajte platný e-mail.',
            ]"
            lazy-rules
          />
          <q-input
            v-model="password"
            outlined
            hide-bottom-space
            :type="showPassword ? 'text' : 'password'"
            label="Heslo"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :rules="[(v) => String(v).length >= 8 || 'Použite aspoň 8 znakov.']"
            lazy-rules
            ><template #append
              ><q-btn
                flat
                round
                dense
                :icon="showPassword ? 'visibility_off' : 'visibility'"
                :aria-label="showPassword ? 'Skryť heslo' : 'Zobraziť heslo'"
                @click="showPassword = !showPassword" /></template
          ></q-input>
          <q-input
            v-if="mode === 'signup'"
            v-model="confirmation"
            outlined
            hide-bottom-space
            type="password"
            label="Potvrdenie hesla"
            autocomplete="new-password"
            :rules="[(v) => v === password || 'Heslá sa nezhodujú.']"
            lazy-rules
          />
          <p v-if="message" class="inline-error" role="alert">{{ message }}</p>
          <q-btn
            type="submit"
            no-caps
            unelevated
            color="primary"
            class="auth-submit"
            :label="mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet'"
          />
        </q-form>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import UserAvatar from './UserAvatar.vue';
import { usePrototypeStore } from '@/stores/prototype';
const store = usePrototypeStore();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);
const mode = ref<'login' | 'signup'>('login');
const fullName = ref('');
const nickname = ref('');
const email = ref('alex@convo.app');
const password = ref('convo-demo');
const confirmation = ref('');
const showPassword = ref(false);
const message = ref('');
function toggleTheme() {
  const nextTheme = !isDark.value;
  $q.dark.set(nextTheme);
  try {
    localStorage.setItem('convo-theme', nextTheme ? 'dark' : 'light');
  } catch {
    /* The choice stays in memory only. */
  }
}
function submit() {
  message.value = '';
  try {
    if (mode.value === 'login') store.signIn(email.value, password.value);
    else
      store.signUp({
        fullName: fullName.value,
        nickname: nickname.value,
        email: email.value,
        password: password.value,
        confirmation: confirmation.value,
      });
  } catch (reason) {
    message.value = reason instanceof Error ? reason.message : 'Nepodarilo sa pokračovať.';
  }
}
</script>
