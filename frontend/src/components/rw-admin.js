import { functions } from '../lib/firebase.js';
import { httpsCallable } from 'firebase/functions';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const replacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return replacements[character];
  });
}

function formatDate(value) {
  if (!value) {
    return 'Unknown';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatRoleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Reader';
}

function formatProviderList(providerIds) {
  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    return 'Unknown';
  }

  return providerIds.join(', ');
}

export class RwAdmin extends HTMLElement {
  static get observedAttributes() {
    return ['current-user-uid'];
  }

  constructor() {
    super();
    this.accounts = [];
    this.loading = true;
    this.errorMessage = '';
    this.updatingRole = '';
    this.selectedUid = '';
    this.currentUserUid = '';
    this.handlePopState = () => {
      this.syncSelectionFromUrl();
      this.render();
    };
  }

  connectedCallback() {
    this.currentUserUid = this.getAttribute('current-user-uid') || '';
    this.syncSelectionFromUrl();
    window.addEventListener('popstate', this.handlePopState);
    this.render();
    this.fetchAccounts();
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this.handlePopState);
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === 'current-user-uid') {
      this.currentUserUid = newValue || '';
      this.render();
    }
  }

  syncSelectionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    this.selectedUid = params.get('uid') || '';
  }

  updateSelectionInUrl(uid, replace = false) {
    this.selectedUid = uid;

    const url = new URL(window.location.href);
    url.searchParams.set('view', 'admin');

    if (uid) {
      url.searchParams.set('uid', uid);
    } else {
      url.searchParams.delete('uid');
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', nextUrl);
  }

  getSelectedAccount() {
    return this.accounts.find((account) => account.uid === this.selectedUid) ?? null;
  }

  async fetchAccounts() {
    this.loading = true;
    this.errorMessage = '';
    this.render();

    try {
      const listAdminAccounts = httpsCallable(functions, 'listAdminAccounts');
      const result = await listAdminAccounts();
      this.accounts = Array.isArray(result.data?.accounts) ? result.data.accounts : [];
      this.loading = false;

      if (!this.selectedUid && this.accounts.length > 0) {
        this.updateSelectionInUrl(this.accounts[0].uid, true);
      }

      this.render();
    } catch (error) {
      console.error('Failed to fetch admin accounts:', error);
      this.loading = false;
      this.errorMessage = error.message || 'Failed to load the administration page.';
      this.render();
    }
  }

  async updateRole(role) {
    const selectedAccount = this.getSelectedAccount();

    if (!selectedAccount || this.updatingRole) {
      return;
    }

    this.updatingRole = role;
    this.errorMessage = '';
    this.render();

    try {
      const updateAdminAccountRole = httpsCallable(functions, 'updateAdminAccountRole');
      const result = await updateAdminAccountRole({
        uid: selectedAccount.uid,
        role,
      });

      const updatedAccount = result.data?.account;

      if (updatedAccount?.uid) {
        this.accounts = this.accounts.map((account) =>
          account.uid === updatedAccount.uid ? updatedAccount : account
        );
      }

      this.updatingRole = '';
      this.render();
    } catch (error) {
      console.error('Failed to update account role:', error);
      this.updatingRole = '';
      this.errorMessage = error.message || 'Failed to update the account role.';
      this.render();
    }
  }

  bindEvents() {
    this.querySelector('#admin-refresh-btn')?.addEventListener('click', () => this.fetchAccounts());

    this.querySelectorAll('[data-account-uid]').forEach((button) => {
      button.addEventListener('click', () => {
        const uid = button.getAttribute('data-account-uid');

        if (!uid || uid === this.selectedUid) {
          return;
        }

        this.updateSelectionInUrl(uid);
        this.render();
      });
    });

    this.querySelector('#grant-admin-btn')?.addEventListener('click', () => this.updateRole('admin'));
    this.querySelector('#set-reader-btn')?.addEventListener('click', () => this.updateRole('reader'));
  }

  render() {
    const selectedAccount = this.getSelectedAccount();
    const selectionMissing = this.selectedUid && !selectedAccount && !this.loading;
    const canRemoveOwnAdminRole =
      selectedAccount &&
      selectedAccount.uid === this.currentUserUid &&
      selectedAccount.role === 'admin';

    const accountsMarkup = this.loading
      ? `
        <div class="space-y-3">
          <div class="h-20 rounded-xl bg-neutral-900/80 border border-neutral-700 animate-pulse"></div>
          <div class="h-20 rounded-xl bg-neutral-900/80 border border-neutral-700 animate-pulse"></div>
          <div class="h-20 rounded-xl bg-neutral-900/80 border border-neutral-700 animate-pulse"></div>
        </div>
      `
      : this.accounts.length === 0
        ? `
          <div class="rounded-xl border border-neutral-700 bg-neutral-900/80 p-4 text-sm text-gray-400">
            No Firebase accounts were found.
          </div>
        `
        : this.accounts
            .map((account) => {
              const isSelected = account.uid === this.selectedUid;
              const roleClasses =
                account.role === 'admin'
                  ? 'bg-emerald-950/50 text-emerald-200 border-emerald-700/40'
                  : 'bg-slate-900/50 text-slate-200 border-slate-700/40';

              return `
                <button
                  type="button"
                  data-account-uid="${escapeHtml(account.uid)}"
                  class="w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/40'
                      : 'border-neutral-700 bg-neutral-900/80 hover:border-neutral-500'
                  }"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate text-sm font-semibold text-white">
                        ${escapeHtml(account.email || account.displayName || account.uid)}
                      </div>
                      <div class="mt-1 truncate text-xs text-gray-400">${escapeHtml(account.uid)}</div>
                    </div>
                    <span class="shrink-0 rounded-full border px-2 py-1 text-xs ${roleClasses}">
                      ${formatRoleLabel(account.role)}
                    </span>
                  </div>
                  <div class="mt-3 text-xs text-gray-500">
                    Created ${escapeHtml(formatDate(account.creationTime))}
                  </div>
                </button>
              `;
            })
            .join('');

    let detailMarkup = `
      <div class="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-6 text-sm text-gray-400">
        Select an account to inspect its access.
      </div>
    `;

    if (selectionMissing) {
      detailMarkup = `
        <div class="rounded-2xl border border-amber-700/40 bg-amber-950/30 p-6 text-sm text-amber-100">
          No account matches UID <span class="font-mono">${escapeHtml(this.selectedUid)}</span>.
        </div>
      `;
    } else if (selectedAccount) {
      const adminButtonDisabled = selectedAccount.role === 'admin' || Boolean(this.updatingRole);
      const readerButtonDisabled =
        selectedAccount.role === 'reader' || canRemoveOwnAdminRole || Boolean(this.updatingRole);

      detailMarkup = `
        <div class="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-6">
          <div class="flex flex-col gap-4 border-b border-neutral-700 pb-6 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <h3 class="truncate text-2xl font-bold text-white">
                ${escapeHtml(selectedAccount.email || selectedAccount.displayName || selectedAccount.uid)}
              </h3>
              <p class="mt-2 font-mono text-sm text-gray-400">${escapeHtml(selectedAccount.uid)}</p>
            </div>
            <span class="w-fit rounded-full border px-3 py-1 text-sm ${
              selectedAccount.role === 'admin'
                ? 'border-emerald-700/40 bg-emerald-950/50 text-emerald-200'
                : 'border-slate-700/40 bg-slate-900/50 text-slate-200'
            }">
              ${formatRoleLabel(selectedAccount.role)}
            </span>
          </div>

          <dl class="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
            <div class="rounded-xl border border-neutral-700 bg-neutral-950/80 p-4">
              <dt class="text-xs uppercase tracking-wide text-gray-500">Email</dt>
              <dd class="mt-2 text-sm text-gray-200">${escapeHtml(selectedAccount.email || 'No email')}</dd>
            </div>
            <div class="rounded-xl border border-neutral-700 bg-neutral-950/80 p-4">
              <dt class="text-xs uppercase tracking-wide text-gray-500">Display Name</dt>
              <dd class="mt-2 text-sm text-gray-200">${escapeHtml(selectedAccount.displayName || 'Not set')}</dd>
            </div>
            <div class="rounded-xl border border-neutral-700 bg-neutral-950/80 p-4">
              <dt class="text-xs uppercase tracking-wide text-gray-500">Providers</dt>
              <dd class="mt-2 text-sm text-gray-200">${escapeHtml(formatProviderList(selectedAccount.providerIds))}</dd>
            </div>
            <div class="rounded-xl border border-neutral-700 bg-neutral-950/80 p-4">
              <dt class="text-xs uppercase tracking-wide text-gray-500">Last Sign-In</dt>
              <dd class="mt-2 text-sm text-gray-200">${escapeHtml(formatDate(selectedAccount.lastSignInTime))}</dd>
            </div>
            <div class="rounded-xl border border-neutral-700 bg-neutral-950/80 p-4">
              <dt class="text-xs uppercase tracking-wide text-gray-500">Created</dt>
              <dd class="mt-2 text-sm text-gray-200">${escapeHtml(formatDate(selectedAccount.creationTime))}</dd>
            </div>
            <div class="rounded-xl border border-neutral-700 bg-neutral-950/80 p-4">
              <dt class="text-xs uppercase tracking-wide text-gray-500">Status</dt>
              <dd class="mt-2 text-sm text-gray-200">
                ${selectedAccount.disabled ? 'Disabled account' : 'Active account'}
                ${selectedAccount.emailVerified ? ' - email verified' : ' - email not verified'}
              </dd>
            </div>
          </dl>

          <div class="mt-6 rounded-2xl border border-neutral-700 bg-neutral-950/80 p-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 class="text-lg font-semibold text-white">Access Control</h4>
                <p class="mt-1 text-sm text-gray-400">
                  Grant write access by promoting this account to admin, or revoke it by switching back to reader.
                </p>
              </div>
              <div class="flex flex-col gap-3 sm:flex-row">
                <button
                  id="grant-admin-btn"
                  type="button"
                  class="rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    adminButtonDisabled
                      ? 'cursor-not-allowed bg-emerald-950/40 text-emerald-200/50'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }"
                  ${adminButtonDisabled ? 'disabled' : ''}
                >
                  ${this.updatingRole === 'admin' ? 'Granting...' : 'Grant Write Access'}
                </button>
                <button
                  id="set-reader-btn"
                  type="button"
                  class="rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    readerButtonDisabled
                      ? 'cursor-not-allowed bg-neutral-800 text-gray-500'
                      : 'bg-neutral-700 text-white hover:bg-neutral-600'
                  }"
                  ${readerButtonDisabled ? 'disabled' : ''}
                >
                  ${this.updatingRole === 'reader' ? 'Updating...' : 'Set Reader'}
                </button>
              </div>
            </div>
            ${
              canRemoveOwnAdminRole
                ? `
                  <p class="mt-4 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                    Your own admin role cannot be removed from this page.
                  </p>
                `
                : ''
            }
          </div>
        </div>
      `;
    }

    this.innerHTML = `
      <section class="space-y-6">
        <div class="flex flex-col gap-4 rounded-2xl border border-neutral-700 bg-neutral-800 p-6 shadow-lg lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-sm uppercase tracking-[0.2em] text-blue-300">Administration</p>
            <h2 class="mt-2 text-3xl font-bold text-white">User Access Review</h2>
            <p class="mt-2 max-w-3xl text-sm text-gray-400">
              Review all Firebase accounts, inspect their role, and update write access without leaving the app.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-gray-300">
              ${this.accounts.length} account${this.accounts.length === 1 ? '' : 's'}
            </div>
            <button
              id="admin-refresh-btn"
              type="button"
              class="rounded-lg border border-neutral-600 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:border-neutral-400 hover:bg-neutral-700"
            >
              Refresh
            </button>
          </div>
        </div>

        ${
          this.errorMessage
            ? `
              <div class="rounded-xl border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-100">
                ${escapeHtml(this.errorMessage)}
              </div>
            `
            : ''
        }

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside class="space-y-3">
            ${accountsMarkup}
          </aside>
          <div>
            ${detailMarkup}
          </div>
        </div>
      </section>
    `;

    this.bindEvents();
  }
}
