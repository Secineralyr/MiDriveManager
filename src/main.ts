import './app.css';
import App from './App.svelte';
import { mount } from 'svelte';

const target = document.querySelector('#app');
if (!target) {
	throw new Error('Root element "#app" was not found');
}

mount(App, { target });
