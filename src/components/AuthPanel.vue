<template>
  <main
    class="row no-wrap window-height overflow-hidden"
    :class="isDark ? 'bg-grey-10' : 'bg-grey-2'"
  >
    <aside
      v-if="!isMobile"
      class="col-5"
      :class="isDark ? 'bg-grey-10' : 'bg-grey-3'"
      aria-label="Convo"
    >
      <q-img
        class="fit flip-horizontal"
        fit="cover"
        :src="isDark ? authArtDark : authArtLight"
        alt=""
      />
    </aside>
    <section
      class="col column no-wrap"
      :class="isDark ? 'bg-dark' : isMobile ? 'bg-grey-2' : 'bg-white'"
      aria-labelledby="auth-title"
    >
      <header class="row items-center justify-between" :class="isMobile ? 'q-pa-md' : 'q-pa-lg'">
        <div class="row items-center q-gutter-sm text-primary text-h4 text-weight-bold">
          <q-icon name="forum" size="34px" /><span>convo</span>
        </div>
        <q-btn
          outline
          round
          color="primary"
          :icon="isDark ? 'light_mode' : 'dark_mode'"
          :aria-label="isDark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'"
          @click="toggleTheme"
        >
          <q-tooltip>{{ isDark ? 'Svetlý režim' : 'Tmavý režim' }}</q-tooltip>
        </q-btn>
      </header>
      <div class="col flex flex-center overflow-auto q-pa-md">
        <q-card flat :bordered="isMobile" :class="isMobile ? 'full-width' : 'q-dialog-plugin'">
          <q-card-section :class="isMobile ? 'q-pa-md' : 'q-pa-none'">
            <h1 id="auth-title" class="text-h4 text-weight-bold q-ma-none">
              {{ mode === 'login' ? 'Vitajte späť.' : 'Pridajte sa k tímu.' }}
            </h1>
            <p class="q-mt-sm q-mb-none" :class="isDark ? 'text-grey-5' : 'text-grey-7'">
              {{
                mode === 'login'
                  ? 'Pokračujte tam, kde ste skončili.'
                  : 'Zadajte svoje údaje a zvoľte si prezývku.'
              }}
            </p>
            <q-tabs
              v-model="mode"
              no-caps
              align="left"
              active-color="primary"
              indicator-color="primary"
              :class="isMobile ? 'q-mt-md q-mb-md' : 'q-mt-lg q-mb-md'"
              @update:model-value="message = ''"
              ><q-tab name="login" label="Prihlásenie" /><q-tab name="signup" label="Registrácia"
            /></q-tabs>
            <q-form class="column q-gutter-y-sm" @submit="submit">
              <template v-if="mode === 'signup'">
                <q-input
                  v-model.trim="fullName"
                  outlined
                  hide-bottom-space
                  label="Meno a priezvisko"
                  autocomplete="name"
                  :rules="[
                    (v) =>
                      String(v).trim().split(/\s+/).length >= 2 || 'Vyplňte meno aj priezvisko.',
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
              <p v-if="message" class="text-negative text-caption q-my-sm" role="alert">
                {{ message }}
              </p>
              <q-btn
                type="submit"
                no-caps
                unelevated
                color="primary"
                class="full-width"
                size="lg"
                :label="mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet'"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import authArtDark from '@/assets/auth-abstract.png';
import authArtLight from '@/assets/auth-abstract-light.png';
import { usePrototypeStore } from '@/stores/prototype';
const store = usePrototypeStore();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);
const isMobile = computed(() => $q.screen.width <= 700);
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
