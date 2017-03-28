<template>
  <div>
    <router-link to='/pokergame'>
      <div class="link">24点</div>
    </router-link>
    <router-link to='/gandengyan'>
      <div class="link">干瞪眼</div>
    </router-link>
  </div>
</template>

<style>
  .link {
    display: inline-block;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    background: #fff;
    border: 1px solid #bfcbd9;
    color: #1f2d3d;
    -webkit-appearance: none;
    text-align: center;
    box-sizing: border-box;
    outline: none;
    margin: 0;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    padding: 10px 15px;
    font-size: 14px;
    border-radius: 4px;
  }
</style>
