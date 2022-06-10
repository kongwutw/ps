<script setup lang="ts">
const onClick = () => {
  alert('被点击了~')
}
</script>

<template>
    <div class="menu-ctn">
      <button @click="onClick">新建</button>
      <button>打开</button>
      <button>保存</button>
      <button>导入</button>
      <button>导出</button>
    </div>
</template>

<style lang="postcss" scoped>
.menu-ctn {
    position: absolute;
    top: 30px;
    left: 6px;
    display: flex;
    flex-direction: column;
    background-color: #f0f0fa;
    padding: 0 12px;

    button {
      margin: 4px;
      color: #4b3e51;
      background-color: #f0f0fa;
      border-width: 0px;
    }
}
</style>
