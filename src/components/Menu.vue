<script setup lang="ts">
import bus from '@/bus';

const onClick = () => {
  alert('被点击了~')
}

const addImg = () => {
  const uploadInputDom = document.createElement('input');
  uploadInputDom.type = 'file';
  uploadInputDom.id = 'uploadInput';
  uploadInputDom.style.display = 'none';
  document.body.appendChild(uploadInputDom);
  uploadInputDom.click();
  uploadInputDom.addEventListener('change', (event: any) => {
    event.stopPropagation();
    event.preventDefault();
    const file: any = event.target.files[0];
    const fileReader = new FileReader();
    fileReader.readAsDataURL(file);
    fileReader.onload = function (e: any) {
      const { result } = e.target;
      bus.emit('addLocalImg', result);
      bus.emit('closeMenu');
      uploadInputDom.remove();
    };
  });

}
</script>

<template>
    <div class="menu-ctn">
      <button @click="onClick">新建</button>
      <button>打开</button>
      <button>保存</button>
      <button @click="addImg">导入</button>
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
