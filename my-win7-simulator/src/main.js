import Vue from 'vue';
import App from './App.vue';
import Winui from 'win7-ui';

Vue.use(Winui);

Vue.config.productionTip = false;

new Vue({
render: h => h(App),
}).$mount('#app');