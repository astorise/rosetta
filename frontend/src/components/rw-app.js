import { auth, db } from '../lib/firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export class RwApp extends HTMLElement {
  constructor() {
    super();
    this.user = null;
    this.role = null;
    this.loading = true;
  }

  connectedCallback() {
    this.unsubscribe = onAuthStateChanged(auth, async (user) => {
      this.user = user;
      if (user) {
        try {
          const roleDoc = await getDoc(doc(db, 'user_roles', user.uid));
          if (roleDoc.exists()) {
            this.role = roleDoc.data().role;
          } else {
            this.role = 'reader'; // default fallback
          }
        } catch (error) {
          console.error("Error fetching role:", error);
          this.role = 'reader';
        }
      } else {
        this.role = null;
      }
      this.loading = false;
      this.render();
    });
    this.render(); // initial loading state
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  async handleSignOut() {
    await signOut(auth);
  }

  render() {
    if (this.loading) {
      this.innerHTML = `<div class="p-8 text-center text-gray-400 animate-pulse">Loading App...</div>`;
      return;
    }

    if (!this.user) {
      this.innerHTML = `
        <div class="min-h-screen bg-neutral-900 flex items-center justify-center p-4 w-full">
          <rw-auth></rw-auth>
        </div>
      `;
      return;
    }

    // Authenticated state
    this.innerHTML = `
      <div class="min-h-screen bg-neutral-900 text-white w-full">
        <header class="bg-neutral-800 p-4 shadow-md flex justify-between items-center w-full">
          <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Teacher Portal</h1>
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-400">Role: <span class="text-gray-200">${this.role}</span></span>
            <button id="sign-out-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors">Sign Out</button>
          </div>
        </header>
        <main class="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          ${this.role === 'admin' ? '<section class="order-1 md:order-2"><rw-uploader></rw-uploader></section>' : ''}
          <section class="${this.role === 'admin' ? 'order-2 md:order-1' : 'col-span-1 md:col-span-2'}">
            <rw-dashboard></rw-dashboard>
          </section>
        </main>
      </div>
    `;

    const signOutBtn = this.querySelector('#sign-out-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => this.handleSignOut());
    }
  }
}
