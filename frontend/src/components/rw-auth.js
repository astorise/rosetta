import { auth } from '../lib/firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

export class RwAuth extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    const form = this.querySelector('form');
    const errorDiv = this.querySelector('#error-message');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value;
      const password = form.password.value;
      const submitBtn = form.querySelector('button[type="submit"]');
      
      try {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Signing in...';
        
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        console.error("Auth error:", error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
      }
    });
  }

  render() {
    this.innerHTML = `
      <div class="bg-neutral-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-neutral-700">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Welcome Back</h2>
          <p class="text-gray-400 mt-2">Sign in to access the Teacher Portal</p>
        </div>
        <form class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1" for="email">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              class="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="teacher@example.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1" for="password">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              class="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="••••••••"
            />
          </div>
          <div id="error-message" class="hidden p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg text-sm"></div>
          <button 
            type="submit" 
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg transform transition hover:-translate-y-0.5"
          >
            Sign In
          </button>
        </form>
      </div>
    `;
  }
}
