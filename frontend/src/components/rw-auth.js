import { auth } from '../lib/firebase.js';
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from 'firebase/auth';

export class RwAuth extends HTMLElement {
  constructor() {
    super();
    this.mode = 'signin';
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    const form = this.querySelector('form');
    const errorDiv = this.querySelector('#error-message');
    const googleBtn = this.querySelector('#google-signin');
    const githubBtn = this.querySelector('#github-signin');
    const toggleBtn = this.querySelector('#auth-mode-toggle');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.email.value;
      const password = form.password.value;
      const submitBtn = form.querySelector('button[type="submit"]');
      const isSignUp = this.mode === 'signup';

      try {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = isSignUp ? 'Creating account...' : 'Signing in...';

        if (isSignUp) {
          sessionStorage.setItem('rw-onboarding-pending', 'true');
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (error) {
        if (isSignUp) {
          sessionStorage.removeItem('rw-onboarding-pending');
        }
        this.handleAuthError(error, submitBtn, isSignUp ? 'Create Account' : 'Sign In');
      }
    });

    googleBtn.addEventListener('click', () => this.handleSocialSignIn(new GoogleAuthProvider(), googleBtn));
    githubBtn.addEventListener('click', () => this.handleSocialSignIn(new GithubAuthProvider(), githubBtn));

    toggleBtn.addEventListener('click', () => {
      this.mode = this.mode === 'signin' ? 'signup' : 'signin';
      this.render();
      this.bindEvents();
    });
  }

  async handleSocialSignIn(provider, button) {
    const errorDiv = this.querySelector('#error-message');
    const originalText = button.innerHTML;

    try {
      errorDiv.textContent = '';
      errorDiv.classList.add('hidden');
      button.disabled = true;
      button.innerHTML = 'Signing in...';
      const credential = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(credential);

      if (additionalUserInfo?.isNewUser) {
        sessionStorage.setItem('rw-onboarding-pending', 'true');
      }
    } catch (error) {
      this.handleAuthError(error, button, originalText);
    }
  }

  handleAuthError(error, button, originalText) {
    const errorDiv = this.querySelector('#error-message');
    console.error('Auth error:', error);
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');

    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  render() {
    const isSignUp = this.mode === 'signup';
    const title = isSignUp ? 'Create Account' : 'Welcome Back';
    const subtitle = isSignUp
      ? 'New accounts start in read-only mode until an administrator grants write access.'
      : 'Sign in to access the Teacher Portal';
    const submitLabel = isSignUp ? 'Create Account' : 'Sign In';
    const helperCopy = isSignUp
      ? 'After registration, the administrator receives an email to review write access.'
      : 'Need an account? Create one to request access.';
    const toggleLabel = isSignUp ? 'Already have an account? Sign in' : 'Create an account';

    this.innerHTML = `
      <div class="bg-neutral-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-neutral-700">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">${title}</h2>
          <p class="text-gray-400 mt-2">${subtitle}</p>
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
              placeholder="Password"
            />
          </div>
          <div id="error-message" class="hidden p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg text-sm"></div>
          <button
            type="submit"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg transform transition hover:-translate-y-0.5"
          >
            ${submitLabel}
          </button>
        </form>

        <p class="mt-4 text-sm text-amber-200 bg-amber-950/40 border border-amber-700/40 rounded-lg px-4 py-3">
          ${helperCopy}
        </p>

        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-neutral-700"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-neutral-800 text-gray-400">Or continue with</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <button id="google-signin" class="w-full inline-flex justify-center py-3 px-4 border border-neutral-700 rounded-lg shadow-sm bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:ring-blue-500">
            <span class="ml-2">Google</span>
          </button>
          <button id="github-signin" class="w-full inline-flex justify-center py-3 px-4 border border-neutral-700 rounded-lg shadow-sm bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:ring-blue-500">
            <span class="ml-2">GitHub</span>
          </button>
        </div>

        <button
          id="auth-mode-toggle"
          type="button"
          class="mt-6 w-full text-sm text-blue-300 hover:text-blue-200 transition-colors"
        >
          ${toggleLabel}
        </button>
      </div>
    `;
  }
}
