<template>
  <div class="wrapper">
    <template v-for="(item, index) in dice">
      <div class="dice">
        <div v-if="dice[index].num === 1" class="first-face face">
          <span class="pip"></span>
        </div>
        <div v-if="dice[index].num === 2" class="second-face face">
          <span class="pip"></span>
          <span class="pip"></span>
        </div>
        <div v-if="dice[index].num === 3" class="third-face face">
          <span class="pip"></span>
          <span class="pip"></span>
          <span class="pip"></span>
        </div>
        <div v-if="dice[index].num === 4" class="fourth-face face">
          <div class="column">
            <span class="pip"></span>
            <span class="pip"></span>
          </div>
          <div class="column">
            <span class="pip"></span>
            <span class="pip"></span>
          </div>
        </div>
        <div v-if="dice[index].num === 5" class="fifth-face face">
          <div class="column">
            <span class="pip"></span>
            <span class="pip"></span>
          </div>
          <div class="column">
            <span class="pip"></span>
          </div>
          <div class="column">
            <span class="pip"></span>
            <span class="pip"></span>
          </div>
        </div>
        <div v-if="dice[index].num === 6" class="sixth-face face">
          <div class="column">
            <span class="pip"></span>
            <span class="pip"></span>
            <span class="pip"></span>
          </div>
          <div class="column">
            <span class="pip"></span>
            <span class="pip"></span>
            <span class="pip"></span>
          </div>
        </div>
      </div>
    </template>
    <!-- <div class="dice">
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
    </div> -->
    <div class="shake" @click="shake">摇</div>
    <audio id="audio" src="https://kidbai.github.io/youngbye.github.io/dist/dice.mp3" controls="controls" style="visibility: hidden">
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
        dice: [{
          num: 2
        },{
          num: 2
        },{
          num: 3
        },{
          num: 4
        },{
          num: 5
        },{
          num: 6
        }],
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
        this.dice.map((el, idx) => {
          el.num = this.numGenerator()
        })
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
  .face {
    position: absolute;
    top: 50%;
    margin-top: -52px;
    left: 50%;
    margin-left: -52px;
  }
  .first-face {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .second-face {
    display: flex;
    justify-content: space-between;
  }

  .second-face .pip:nth-of-type(2) {
    align-self: flex-end;
  }

  .third-face {
    display: flex;
    justify-content: space-between;
  }

  .third-face .pip:nth-of-type(2) {
    align-self: center;
  }

  .third-face .pip:nth-of-type(3) {
    align-self: flex-end;
  }

  .fourth-face, .sixth-face {
    display: flex;
    justify-content: space-between;
  }

  .fourth-face .column, .sixth-face .column {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .fifth-face {
    display: flex;
    justify-content: space-between;
  }

  .fifth-face .column {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .fifth-face .column:nth-of-type(2) {
    justify-content: center;
  }



  [class$="face"] {

    background-color: #e7e7e7;
    width: 104px;
    height: 104px;
    object-fit: contain;

    box-shadow:
      inset 0 5px white,
      inset 0 -5px #bbb,
      inset 5px 0 #d7d7d7,
      inset -5px 0 #d7d7d7;

    border-radius: 10%;
  }

  .pip {
    display: block;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    margin: 4px;

    background-color: #333;
    box-shadow: inset 0 3px #111, inset 0 -3px #555;
  }
</style>
