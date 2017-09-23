<template>
  <div class="gameCenter">
    <router-link to='/pokergame' class="item">
      <div class="link">24点</div>
    </router-link>
    <router-link to='/gandengyan' class="item">
      <div class="link">干瞪眼</div>
    </router-link>
    <router-link to='/dice' class="item">
      <div class="link">骰子</div>
    </router-link>
  </div>
</template>

<style>
  .gameCenter {
    position: relative;
    width: 100%;
    text-align: center;
  }
  .item {
    display: inline-block;
    width: 90%;
    height: 150px;
    margin: 15px 0;
    text-decoration: none;
  }
  .link {
    border: 1px solid #f1f1f1;
    -webkit-border-radius: 10px;
    border-radius: 10px;
    line-height: 150px;
    white-space: nowrap;
    cursor: pointer;
    background-color: #f1f1f1;
    color: #1f2d3d;
    -webkit-appearance: none;
    text-align: center;
    outline: none;
    margin: 0;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    font-size: 20px;
  }
</style>
