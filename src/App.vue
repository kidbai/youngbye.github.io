<template>
  <div>
    <transition name='fade' mode='out-in'>
      <router-view></router-view>
    </transition>
  </div>

</template>

<script>
  export default {
    data() {
      return {
      }
    },
  }

</script>

<style>
  body {
    margin: 0;
  }

  .wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .update {
    position: absolute;
    top: 50%;
    left: 50%;
    margin-top: -50px;
    margin-left: -50px;
    width: 100px;
    height: 100px;
    background-color: #24292e;
    color: #fff;
    border-radius: 50%;
    font-size: 2rem;
    outline: none;
    text-align: center;
    line-height: 100px;
  }

  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
  }

  h1,
  h2 {
    font-weight: normal;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }
  </style>
