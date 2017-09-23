<template>
  <div class="wrapper">
    <div class="card">
    <div class="num">
        {{ first }}
    </div>
    </div>
    <div class="card">
    <div class="num">
        {{ second }}
    </div>
    </div>
    <div class="card">
    <div class="num">
        {{ third }}
    </div>
    </div>
    <div class="card">
    <div class="num">
        {{ forth }}
    </div>
    </div>
    <div class="update" @click="updateCardMore">换</div>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        // default value
        first: 1,
        second: 2,
        third: 3,
        forth: 4
      }
    },
    computed: {
    },
    methods: {
      updateCardMore() {
        const interval = setInterval(() => {
          this.updateCard();
        }, 50);
        setTimeout(() => {
          clearInterval(interval)
        }, 1000)
      },
      updateCard() {
        this.first = this.numGenerator();
        this.second = this.numGenerator();
        this.third = this.numGenerator();
        this.forth = this.numGenerator();
      },
      numGenerator() {
        var num = parseInt(Math.random() * 13 + 1, 10);
        if (num === 11) {
          return 'J'
        }
        if (num === 12) {
          return 'Q'
        }
        if (num === 13) {
          return 'K'
        }
        return num;
      }
    },
  }
</script>

<style>
  .card {
    position: relative;
    width: 50%;
    height: 50%;
    text-align: center;
    box-sizing: border-box;
    border-radius: 10px;
    border: 1px solid #000;
    background-color: #fff;
    float: left;
  }

  .num {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    margin-top: -1.5rem;
    font-size: 3rem;
    height: 3rem;
  }

</style>
