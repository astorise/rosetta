import { db } from '../lib/firebase.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { gsap } from 'gsap';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function coerceDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }

  return null;
}

function displayDate(doc) {
  const date =
    coerceDate(doc.createdAt) ||
    coerceDate(doc.extraction_timestamp) ||
    coerceDate(doc.extractionTimestamp);

  return date ? date.toLocaleDateString() : 'Unknown date';
}

function displayTitle(doc) {
  return (
    doc.title ||
    doc.source_filename ||
    doc.sourceFilename ||
    doc.name ||
    doc.id
  );
}

function displayExcerpt(doc) {
  return doc.excerpt || doc.summary || 'No summary available.';
}

function displayTags(doc) {
  const tags = Array.isArray(doc.semantic_tags)
    ? doc.semantic_tags
    : Array.isArray(doc.semanticTags)
      ? doc.semanticTags
      : [];

  return tags.slice(0, 4);
}

function sortDocs(docs) {
  return [...docs].sort((left, right) => {
    const leftTime =
      coerceDate(left.createdAt)?.getTime() ||
      coerceDate(left.extraction_timestamp)?.getTime() ||
      coerceDate(left.extractionTimestamp)?.getTime() ||
      0;
    const rightTime =
      coerceDate(right.createdAt)?.getTime() ||
      coerceDate(right.extraction_timestamp)?.getTime() ||
      coerceDate(right.extractionTimestamp)?.getTime() ||
      0;

    return rightTime - leftTime;
  });
}

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
    this.unsubscribe = onSnapshot(collection(db, 'processed_docs'), (snapshot) => {
      this.docs = sortDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

    listEl.innerHTML = this.docs.map(doc => {
      const title = escapeHtml(displayTitle(doc));
      const excerpt = escapeHtml(displayExcerpt(doc));
      const createdAt = escapeHtml(displayDate(doc));
      const documentType = escapeHtml((doc.document_type || doc.documentType || 'doc').toUpperCase());
      const tags = displayTags(doc)
        .map(tag => `<span class="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">${escapeHtml(tag)}</span>`)
        .join('');

      return `
      <li class="doc-item bg-neutral-900 border border-neutral-700 p-4 rounded-lg flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:border-blue-500/50 transition-colors group">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-semibold text-gray-200 truncate group-hover:text-blue-400 transition-colors">${title}</h3>
            <span class="px-2 py-1 text-[11px] rounded-full bg-neutral-800 text-gray-400 border border-neutral-700">${documentType}</span>
          </div>
          <p class="text-sm text-gray-400 mt-1">${excerpt}</p>
          ${tags ? `<div class="flex flex-wrap gap-2 mt-3">${tags}</div>` : ''}
        </div>
        <div class="flex flex-col items-end shrink-0 gap-2">
          <span class="text-xs text-gray-500">${createdAt}</span>
          <span class="text-xs font-semibold px-2 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-700/40">Indexed</span>
        </div>
      </li>
    `;
    }).join('');

    // GSAP Stagger Animation
    const items = this.querySelectorAll('.doc-item');
    gsap.fromTo(items,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }
    );
  }
}
