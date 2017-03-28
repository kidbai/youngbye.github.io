import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router'
import PokerGame from './components/PokerGame.vue'
import Gandengyan from './components/Gandengyan.vue'

Vue.use(VueRouter)

const routes = [
  { path: "/", component: PokerGame },
  { path: "/gandengyan", component: Gandengyan },
]

const router = new VueRouter({
  routes
})

const app = new Vue(Object.assign({}, App, { router })).$mount('#app')
