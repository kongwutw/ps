<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import ComHeader from '@/components/ComHeader.vue';

import bus from '@/bus';

let imgUrl = $ref('');
const addLocalImg = (url: string) => {
  imgUrl = url;
}

bus.on('addLocalImg', addLocalImg);

onUnmounted(() => {
  bus.off('addLocalImg', addLocalImg);
});
</script>

<template>
  <div >
    <ComHeader />
    <img v-if="imgUrl" :src="imgUrl" width="500" height="500" />
  </div>
</template>

<style>
  html,
  body,
  #app {
    background-color: #4b3e51;
    width: 100%;
    height: 100%;
    margin: 0;
  }
</style>
