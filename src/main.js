import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router'
import GameCenter from './components/GameCenter.vue'
import PokerGame from './components/PokerGame.vue'
import Gandengyan from './components/Gandengyan.vue'
import Dice from './components/Dice.vue'

Vue.use(VueRouter)

const routes = [
  { path: "/", component: GameCenter },
  { path: "/pokergame", component: PokerGame },
  { path: "/gandengyan", component: Gandengyan },
  { path: "/dice", component: Dice}
]

const router = new VueRouter({
  routes
})

const app = new Vue(Object.assign({}, App, { router })).$mount('#app')
