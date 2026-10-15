<template>
  <div
    class="fullscreen text-center q-pa-md flex flex-center"
    :class="$q.dark.isActive ? 'bg-dark text-white' : 'bg-grey-1 text-dark'"
  >
    <div>
      <div class="text-h1 text-primary">404</div>

      <h1 class="text-h5 q-mt-md q-mb-none">Stránka sa nenašla.</h1>

      <q-btn class="q-mt-xl" color="primary" unelevated to="/" label="Späť do aplikácie" no-caps />
    </div>
  </div>
</template>
