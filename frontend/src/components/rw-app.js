import { auth, db } from '../lib/firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export class RwApp extends HTMLElement {
  constructor() {
    super();
    this.user = null;
    this.role = null;
    this.loading = true;
    this.handleLocationChange = () => this.render();
  }

  connectedCallback() {
    window.addEventListener('popstate', this.handleLocationChange);

    this.unsubscribe = onAuthStateChanged(auth, async (user) => {
      this.user = user;

      if (user) {
        try {
          const roleDoc = await getDoc(doc(db, 'user_roles', user.uid));
          if (roleDoc.exists()) {
            this.role = roleDoc.data().role;
          } else {
            this.role = 'reader';
          }
        } catch (error) {
          console.error('Error fetching role:', error);
          this.role = 'reader';
        }

        if (this.role === 'admin') {
          sessionStorage.removeItem('rw-onboarding-pending');
        }
      } else {
        this.role = null;
      }

      this.loading = false;
      this.render();
    });

    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this.handleLocationChange);

    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  getRouteState() {
    const params = new URLSearchParams(window.location.search);

    return {
      view: params.get('view') === 'admin' ? 'admin' : 'home',
    };
  }

  navigateTo(view) {
    const url = new URL(window.location.href);

    if (view === 'admin') {
      url.searchParams.set('view', 'admin');
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('uid');
    }

    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    this.render();
  }

  async handleSignOut() {
    await signOut(auth);
  }

  bindEvents() {
    this.querySelector('#sign-out-btn')?.addEventListener('click', () => this.handleSignOut());
    this.querySelector('#nav-home-btn')?.addEventListener('click', () => this.navigateTo('home'));
    this.querySelector('#nav-admin-btn')?.addEventListener('click', () => this.navigateTo('admin'));
  }

  renderHomeView() {
    return `
      <main class="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        ${this.role === 'admin' ? '<section class="order-1 md:order-2"><rw-uploader></rw-uploader></section>' : ''}
        <section class="${this.role === 'admin' ? 'order-2 md:order-1' : 'col-span-1 md:col-span-2'}">
          <rw-dashboard></rw-dashboard>
        </section>
      </main>
    `;
  }

  renderAdminView() {
    return `
      <main class="max-w-7xl mx-auto p-6 w-full">
        <rw-admin current-user-uid="${this.user?.uid || ''}"></rw-admin>
      </main>
    `;
  }

  render() {
    const route = this.getRouteState();
    const onboardingPending =
      this.user &&
      this.role === 'reader' &&
      sessionStorage.getItem('rw-onboarding-pending') === 'true';
    const adminRequestedWithoutAccess =
      this.user && route.view === 'admin' && this.role !== 'admin';
    const activeView = this.role === 'admin' && route.view === 'admin' ? 'admin' : 'home';

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

    this.innerHTML = `
      <div class="min-h-screen bg-neutral-900 text-white w-full">
        <header class="bg-neutral-800 p-4 shadow-md w-full">
          <div class="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
              <div>
                <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Teacher Portal</h1>
                <p class="text-sm text-gray-500">${this.user.email || this.user.uid}</p>
              </div>
              <nav class="flex items-center gap-2">
                <button
                  id="nav-home-btn"
                  type="button"
                  class="rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeView === 'home'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-900 text-gray-300 hover:bg-neutral-700'
                  }"
                >
                  Dashboard
                </button>
                ${
                  this.role === 'admin'
                    ? `
                      <button
                        id="nav-admin-btn"
                        type="button"
                        class="rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          activeView === 'admin'
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-900 text-gray-300 hover:bg-neutral-700'
                        }"
                      >
                        Administration
                      </button>
                    `
                    : ''
                }
              </nav>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-400">Role: <span class="text-gray-200">${this.role}</span></span>
              <button id="sign-out-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors">Sign Out</button>
            </div>
          </div>
        </header>
        ${onboardingPending ? `
          <section class="max-w-7xl mx-auto px-6 pt-6">
            <div class="rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              Your account was created successfully. An administrator has been notified and must grant write access before upload features become available.
            </div>
          </section>
        ` : ''}
        ${adminRequestedWithoutAccess ? `
          <section class="max-w-7xl mx-auto px-6 pt-6">
            <div class="rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              The administration page is reserved for admin accounts.
            </div>
          </section>
        ` : ''}
        ${activeView === 'admin' ? this.renderAdminView() : this.renderHomeView()}
      </div>
    `;

    this.bindEvents();
  }
}
