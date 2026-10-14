<template>
  <q-dialog v-model="open">
    <q-card class="prototype-dialog help-dialog">
      <q-card-section class="dialog-heading">
        <div>
          <h2>Prehľad príkazov</h2>
          <p>Napíšte ich do poľa na správu.</p>
        </div>
        <q-btn flat round dense icon="close" aria-label="Zavrieť príkazy" v-close-popup />
      </q-card-section>
      <q-list>
        <q-item
          v-for="item in commands"
          :key="item.syntax"
          clickable
          v-close-popup
          @click="emit('insert', item.example)"
        >
          <q-item-section>
            <q-item-label
              ><code>{{ item.syntax }}</code></q-item-label
            >
            <q-item-label caption>{{ item.description }}</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="south_west" size="17px" /></q-item-section>
        </q-item>
      </q-list>
      <q-card-section class="helper">
        Kliknutím vložíte príkaz. Pred odoslaním doplňte názov alebo prezývku.
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ insert: [value: string] }>();

// Syntax from the assignment, use cases 4 to 6 and 10.
const commands = [
  {
    syntax: '/join názov [private]',
    example: '/join ',
    description: 'Pripojiť sa alebo vytvoriť kanál. private vytvorí súkromný.',
  },
  {
    syntax: '/invite prezývka',
    example: '/invite ',
    description: 'Pozvať člena. V súkromnom kanáli iba správca.',
  },
  {
    syntax: '/revoke prezývka',
    example: '/revoke ',
    description: 'Správca odoberie súkromné členstvo alebo pozvánku.',
  },
  {
    syntax: '/kick prezývka',
    example: '/kick ',
    description: 'Verejný kanál: hlasovať za ban. Správca zakáže prístup ihneď.',
  },
  { syntax: '/list', example: '/list', description: 'Zobraziť členov aktuálneho kanála.' },
  {
    syntax: '/cancel',
    example: '/cancel',
    description: 'Opustiť kanál. Odchod správcu kanál zruší.',
  },
  { syntax: '/quit', example: '/quit', description: 'Správca zruší kanál pre všetkých.' },
  {
    syntax: '@prezývka správa',
    example: '@',
    description: 'Zvýrazniť správu konkrétnemu používateľovi.',
  },
];
</script>
