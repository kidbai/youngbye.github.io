<template>
  <div>
    <div class="count">
      <input type="text" placeholder='请输入人数' v-model='count'>
      <button @click="updatePeople">更新人数</button>
    </div>
    <div class="count">
      <button @click='calCost'>计算费用</button>
    </div>
    <ol>
      <li v-for='(people, index) in people'>
        <label style='clear: both'>序号{{ index + 1 }}: </label>
        <div class="clear"></div>
        <label>亏分:</label><input type="text" v-model='people.count'>
        <label>收益:</label><input type="text" v-model='people.cost' readonly>
      </li>
    </ol>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        people: [
          // default value
          { count: '0', cost: 0 },
        ],
        count: 1
      }
    },
    mounted() {
      this.bindEvent()
    },
    methods: {
      updatePeople() {
        if(isNaN(this.count)) {
          alert('请输入数字')
        }
        this.people = []
        for(let i = 0; i < this.count; i++) {
          this.people.push({
            count: '0',
            cost: 0
          })
        }
      },
      bindEvent() {
        window.addEventListener('keydown', (e) =>  {
          if(e.keyCode === 13){
            this.updatePeople()
          }
        })
      },
      calCost() {
        const length = this.people.length
        for(var i = 0; i < length; i++) {
          for(var j = 0; j < length; j++) {
            if(i !== j) {
              console.log(j)
              this.people[i].cost +=  parseInt(this.people[j].count) - parseInt(this.people[i].count)
              console.log(parseInt(this.people[j].count))
              console.log(parseInt(this.people[i].count))
              console.log(this.people[i].cost)
            }
          }
          console.log('----')
        }

      }
    }
  }
</script>

<style >
  .count {
    position: relative;
    padding: 1rem;
  }
  .count input, ol li input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-color: #fff;
    background-image: none;
    border-radius: 4px;
    border: 1px solid #bfcbd9;
    box-sizing: border-box;
    color: #1f2d3d;
    display: block;
    font-size: inherit;
    height: 36px;
    line-height: 1;
    outline: none;
    padding: 3px 10px;
    transition: border-color .2s cubic-bezier(.645,.045,.355,1);
    width: 100%;
    margin-bottom: 10px;
  }
  .count button {
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
  ol {
    padding: 1rem;
    margin: 0;
  }
  ol li {
    margin: 0 5px;
    width: 20%;
    margin-bottom: 10px;
    border-bottom: 2px solid #666;

  }
  ol li .clear {
    clear: both;
  }
</style>
