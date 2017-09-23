<template>
  <div class="wrapper">
    <div class="dice">
      <div class="num">
          {{ first }}
      </div>
    </div>
    <div class="dice">
      <div class="num">
          {{ second }}
      </div>
    </div>
    <div class="dice">
      <div class="num">
          {{ third }}
      </div>
    </div>
    <div class="dice">
      <div class="num">
          {{ forth }}
      </div>
    </div>
    <div class="dice">
      <div class="num">
          {{ forth }}
      </div>
    </div>
    <div class="dice">
      <div class="num">
          {{ forth }}
      </div>
    </div>
    <div class="shake" @click="shake">摇</div>
    <audio id="audio" src="./dist/dice.mp3" controls="controls" style="visibility: hidden">
    Your browser does not support the audio element.
    </audio>
    <div v-show="shade" class="shade" @mouseup="shadeMouseUp" @mousedown="shadeMouseDown"></div>
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
        forth: 4,
        fifth: 5,
        sixth: 6,
        shade: false
      }
    },
    computed: {
    },
    methods: {
      shadeMouseUp () {
        this.shade = true
      },
      shadeMouseDown () {
        this.shade = false
      },
      shake () {
        var audio = document.getElementById('audio')
        console.log(audio)
        audio.play()
        const interval = setInterval(() => {
          this.updateDice();
        }, 50);
        setTimeout(() => {
          clearInterval(interval)
        }, 1000)
      },
      updateDice() {
        this.first = this.numGenerator();
        this.second = this.numGenerator();
        this.third = this.numGenerator();
        this.forth = this.numGenerator();
        this.fifth = this.numGenerator();
        this.sixth = this.numGenerator();
      },
      numGenerator() {
        var num = parseInt(Math.random() * 6 + 1, 10);
        return num;
      }
    },
  }
</script>

<style>
  .dice {
    position: relative;
    width: 50%;
    height: 33%;
    text-align: center;
    box-sizing: border-box;
    border-radius: 10px;
    border: 1px solid #000;
    background-color: #fff;
    float: left;
  }

  .diceNum {
    position: absolute;
    left: 0;
    right: 0;
    top: 33%;
    margin-top: -1.5rem;
    font-size: 3rem;
    height: 3rem;
  }

  .shake {
    position: absolute;
    width: 60px;
    height: 60px;
    -webkit-border-radius: 50%;
    border-radius: 50%;
    text-align: center;
    line-height: 60px;
    background-color: #000;
    color: #fff;
    left: 50%;
    top: 66%;
    margin-left: -30px;
    margin-top: -30px;
  }
  .shade {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #000;
    z-index: 2;
  }
</style>
