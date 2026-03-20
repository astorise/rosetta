import { functions } from '../lib/firebase.js';
import { httpsCallable } from 'firebase/functions';
import { gsap } from 'gsap';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['.pdf', '.zip', '.jar'];

export class RwUploader extends HTMLElement {
  constructor() {
    super();
    this.uploading = false;
  }

  connectedCallback() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.innerHTML = `
      <div class="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 overflow-hidden h-full flex flex-col">
        <div class="p-6 border-b border-neutral-700">
          <h2 class="text-2xl font-bold text-white">Upload Documents</h2>
          <p class="text-gray-400 text-sm mt-1">Upload PDF, ZIP, or JAR files for async RAG processing.</p>
        </div>
        <div class="p-6 flex-1 flex flex-col items-center justify-center">
          <div id="drop-zone" class="w-full h-full min-h-[300px] border-2 border-dashed border-neutral-600 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-900/50 transition-colors relative overflow-hidden">
            <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p class="text-lg font-medium text-gray-300">Drag & Drop files here</p>
            <p class="text-sm text-gray-500 mt-2">PDF, ZIP, or JAR, 50MB max</p>
            <input type="file" id="file-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.zip,.jar" />
            
            <div id="upload-overlay" class="absolute inset-0 bg-neutral-900/90 hidden flex-col items-center justify-center p-8">
              <p id="upload-status" class="text-white font-medium mb-4">Uploading...</p>
              <div class="w-full bg-neutral-800 rounded-full h-4 overflow-hidden border border-neutral-700">
                <div id="progress-bar" class="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-0 rounded-full"></div>
              </div>
            </div>
          </div>
          <div id="message-area" class="mt-4 w-full text-center text-sm"></div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const dropZone = this.querySelector('#drop-zone');
    const fileInput = this.querySelector('#file-input');
    
    // Drag events
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      gsap.to(dropZone, {
        scale: 1.02,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        duration: 0.2
      });
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      gsap.to(dropZone, {
        scale: 1,
        borderColor: '#525252',
        backgroundColor: 'transparent',
        duration: 0.2
      });
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      gsap.to(dropZone, {
        scale: 1,
        borderColor: '#525252',
        backgroundColor: 'transparent',
        duration: 0.2
      });
      
      if (this.uploading) return;
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (this.uploading) return;
      
      if (e.target.files.length > 0) {
        this.handleUpload(e.target.files[0]);
      }
    });
  }

  handleUpload(file) {
    const lowerName = file.name.toLowerCase();

    if (!SUPPORTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
      this.showMessage('Unsupported file type. Use PDF, ZIP, or JAR.', 'error');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.showMessage('File is larger than 50MB limit.', 'error');
      return;
    }

    this.uploading = true;
    const overlay = this.querySelector('#upload-overlay');
    const progressBar = this.querySelector('#progress-bar');
    const statusText = this.querySelector('#upload-status');
    const fileInput = this.querySelector('#file-input');
    
    fileInput.disabled = true;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    gsap.set(progressBar, { width: 0 });

    statusText.textContent = 'Preparing upload...';
    const createRawUploadSession = httpsCallable(functions, 'createRawUploadSession');

    createRawUploadSession({
      fileName: file.name,
      contentType: file.type || null,
      size: file.size,
    })
      .then((result) => {
        const uploadUrl = result.data?.uploadUrl;
        const contentType = result.data?.contentType || file.type || 'application/octet-stream';
        const bucketName = result.data?.bucketName || 'raw-docs';

        if (!uploadUrl) {
          throw new Error('The upload session did not return a URL.');
        }

        return this.uploadWithSession({
          uploadUrl,
          file,
          contentType,
          onProgress: (progress) => {
            gsap.to(progressBar, { width: `${progress}%`, duration: 0.2, ease: "power1.out" });
            statusText.textContent = `Uploading ${Math.round(progress)}%`;
          },
        }).then(() => ({ bucketName }));
      })
      .then(({ bucketName }) => {
        this.uploading = false;
        gsap.to(progressBar, { width: '100%', duration: 0.3, ease: "power1.out" });
        statusText.textContent = 'Upload complete. Processing started.';

        setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.classList.remove('flex');
          fileInput.disabled = false;
          fileInput.value = '';
          this.showMessage(`Uploaded ${file.name} to ${bucketName}. Processing runs asynchronously.`, 'success');
        }, 1500);
      })
      .catch((error) => {
        this.uploading = false;
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        fileInput.disabled = false;
        fileInput.value = '';
        console.error("Upload failed:", error);
        this.showMessage(`Upload failed: ${error.message}`, 'error');
      });
  }

  uploadWithSession({ uploadUrl, file, contentType, onProgress }) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType);

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }

        reject(new Error(this.parseUploadError(xhr)));
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error while uploading the file.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('The upload was interrupted.'));
      });

      xhr.send(file);
    });
  }

  parseUploadError(xhr) {
    const fallbackMessage = `Cloud Storage upload failed with status ${xhr.status}.`;

    if (!xhr.responseText) {
      return fallbackMessage;
    }

    try {
      const parsed = JSON.parse(xhr.responseText);
      return parsed.error?.message || fallbackMessage;
    } catch (_error) {
      return xhr.responseText || fallbackMessage;
    }
  }

  showMessage(msg, type) {
    const area = this.querySelector('#message-area');
    area.textContent = msg;
    area.className = `mt-4 w-full text-center text-sm p-3 rounded ${type === 'error' ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-green-900/50 text-green-400 border border-green-800'}`;
    gsap.fromTo(area, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
    
    setTimeout(() => {
      gsap.to(area, { opacity: 0, y: -10, duration: 0.3, onComplete: () => { area.textContent = ''; area.className = 'mt-4 w-full text-center text-sm'; } });
    }, 4000);
  }
}
