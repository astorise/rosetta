import './style.css';
import { RwApp } from './components/rw-app.js';
import { RwAuth } from './components/rw-auth.js';
import { RwDashboard } from './components/rw-dashboard.js';
import { RwUploader } from './components/rw-uploader.js';

// Register standard web components
customElements.define('rw-app', RwApp);
customElements.define('rw-auth', RwAuth);
customElements.define('rw-dashboard', RwDashboard);
customElements.define('rw-uploader', RwUploader);

// Initialize the root app component
document.querySelector('#app').innerHTML = '<rw-app></rw-app>';
