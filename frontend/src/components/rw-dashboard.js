import { db } from '../lib/firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { gsap } from 'gsap';

export class RwDashboard extends HTMLElement {
  constructor() {
    super();
    this.docs = [];
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.subscribeToDocs();
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  subscribeToDocs() {
    const q = query(collection(db, 'processed_docs'), orderBy('createdAt', 'desc'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.renderList();
    }, (error) => {
      console.error("Error fetching processed_docs:", error);
      this.querySelector('#docs-list').innerHTML = `<p class="text-red-500 p-4 bg-red-900/20 rounded">Failed to load documents: ${error.message}</p>`;
    });
  }

  render() {
    this.innerHTML = `
      <div class="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 overflow-hidden">
        <div class="p-6 border-b border-neutral-700 flex justify-between items-center">
          <h2 class="text-2xl font-bold text-white">Processed Documents</h2>
          <span class="text-xs font-semibold px-2 py-1 bg-green-900/50 text-green-400 rounded-full border border-green-700">RAG Ready</span>
        </div>
        <div class="p-6 h-[600px] overflow-y-auto">
          <ul id="docs-list" class="space-y-4">
            <li class="text-gray-400 text-center py-8">Loading documents...</li>
          </ul>
        </div>
      </div>
    `;
  }

  renderList() {
    const listEl = this.querySelector('#docs-list');
    
    if (this.docs.length === 0) {
      listEl.innerHTML = `<li class="text-gray-400 text-center py-8">No processed documents found.</li>`;
      return;
    }

    listEl.innerHTML = this.docs.map(doc => `
      <li class="doc-item bg-neutral-900 border border-neutral-700 p-4 rounded-lg flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:border-blue-500/50 transition-colors group">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-gray-200 truncate group-hover:text-blue-400 transition-colors">${doc.title || doc.name || doc.id}</h3>
          <p class="text-sm text-gray-400 mt-1 line-clamp-2">${doc.excerpt || 'No summary available.'}</p>
        </div>
        <div class="flex flex-col items-end shrink-0 gap-2">
          <span class="text-xs text-gray-500">${doc.createdAt ? new Date(doc.createdAt.toDate()).toLocaleDateString() : 'Unknown date'}</span>
          <button class="px-3 py-1 bg-neutral-800 hover:bg-blue-600 border border-neutral-600 hover:border-blue-500 rounded text-sm text-gray-300 hover:text-white transition-colors">
            View Markdown
          </button>
        </div>
      </li>
    `).join('');

    // GSAP Stagger Animation
    const items = this.querySelectorAll('.doc-item');
    gsap.fromTo(items, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }
    );
  }
}
