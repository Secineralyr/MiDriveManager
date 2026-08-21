import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const target = document.querySelector('#app');
if (target === null) {
	throw new Error('Root element "#app" was not found');
}

mount(App, { target });
