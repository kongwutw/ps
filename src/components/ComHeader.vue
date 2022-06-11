<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Menu from '@/components/Menu.vue';

import bus from '@/bus';

let isShow = $ref(false);

const onClick = () => {
  isShow = !isShow;
}

const closeMenu = () => {
  isShow = false;
}

bus.on('closeMenu', closeMenu);

onUnmounted(() => {
  bus.off('closeMenu', closeMenu);
});

</script>

<template>
  <div class="header-ctn">
    <div class="left-group">
      <button @click="onClick">文件</button>
      <button>编辑</button>
      <button>图像</button>
      <button>图层</button>
      <button>选择</button>
      <button>滤镜</button>
      <button>视图</button>
      <button>窗口</button>
    </div>
    <div class="right-group">
      <img src="https://kongwutw.github.io/blog/logo.png" width="20" height="20"/>
      <div style="margin-right: 12px;">kongwu</div>
      <a href="https://github.com/kongwutw/ps" target="blank" style="color: #fff; text-decoration-line: none; ">GitHub</a>
    </div>
  </div>
  <Menu v-show="isShow" />
</template>

<style lang="postcss" scoped>
.header-ctn {
  width: 100%;
  height: 30px;
  background-color: #4b3e51;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  border-bottom: #333 1px solid;

  .left-group {
    display: flex;

    button {
      margin: 4px;
      color: #f0f0fa;
      background-color: #4b3e51;
      border-width: 0px;
    }
  }

  .right-group {
    margin-right: 12px;
    color: #f0f0fa;
    display: flex;

    img {
      border-radius: 10px;
      margin-right: 12px;
    }
  }
}
</style>
