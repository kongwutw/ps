<script setup lang="ts">

</script>

<template>
  <div class="header-ctn">
    <div class="left-group">
      <button>文件</button>
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
      <div>kongwu</div>
    </div>
  </div>
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
