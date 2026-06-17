import type { BlockTool, API } from '@editorjs/editorjs';
import { supabase } from './supabase';

interface FileDownloadData {
  url: string;
  fileName: string;
  label: string;
  size?: number;
}

interface FileDownloadToolConstructorArgs {
  data?: FileDownloadData;
  api: API;
  readOnly?: boolean;
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export class FileDownloadTool implements BlockTool {
  private data: FileDownloadData;
  private readOnly: boolean;
  private wrapper: HTMLElement;
  private uploading = false;

  constructor({ data, readOnly }: FileDownloadToolConstructorArgs) {
    this.readOnly = Boolean(readOnly);
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('editorjs-file-download');
    this.data = {
      url: data?.url || '',
      fileName: data?.fileName || '',
      label: data?.label || '',
      size: data?.size,
    };
  }

  static get toolbox() {
    return {
      title: 'Fichier à télécharger',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  render() {
    if (this.readOnly) {
      this.renderReadOnly();
      return this.wrapper;
    }
    this.renderEditor();
    return this.wrapper;
  }

  private renderReadOnly() {
    this.wrapper.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'border border-gray-200 rounded-xl p-4 bg-white text-sm text-gray-500';
    container.textContent = this.data.url
      ? `Fichier : ${this.data.label || this.data.fileName}`
      : 'Fichier : aucun fichier';
    this.wrapper.appendChild(container);
  }

  private renderEditor() {
    this.wrapper.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200';

    // Sélection de fichier
    const fileGroup = document.createElement('div');
    fileGroup.className = 'space-y-2';
    const fileLabel = document.createElement('label');
    fileLabel.className = 'block text-sm font-medium text-gray-700';
    fileLabel.textContent = 'Fichier';
    fileGroup.appendChild(fileLabel);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#328fce] file:text-white file:cursor-pointer hover:file:bg-[#84c19e]';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        this.uploadFile(file);
      }
    });
    fileGroup.appendChild(fileInput);

    const status = document.createElement('p');
    status.className = 'text-xs text-gray-500';
    status.id = 'editorjs-file-status';
    if (this.uploading) {
      status.textContent = 'Téléversement en cours…';
    } else if (this.data.fileName) {
      status.textContent = `Fichier actuel : ${this.data.fileName}${
        this.data.size ? ` (${formatSize(this.data.size)})` : ''
      }`;
    } else {
      status.textContent = 'Aucun fichier sélectionné';
    }
    fileGroup.appendChild(status);
    container.appendChild(fileGroup);

    // Label du bouton
    const labelGroup = document.createElement('div');
    labelGroup.className = 'space-y-2';
    const labelLabel = document.createElement('label');
    labelLabel.className = 'block text-sm font-medium text-gray-700';
    labelLabel.textContent = 'Label du bouton de téléchargement';
    labelGroup.appendChild(labelLabel);

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = this.data.label;
    labelInput.placeholder = 'Ex: Télécharger la brochure';
    labelInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
    labelInput.addEventListener('input', () => {
      this.data.label = labelInput.value;
      this.notifyEditor();
      this.updatePreview();
    });
    labelGroup.appendChild(labelInput);
    container.appendChild(labelGroup);

    // Aperçu
    const previewGroup = document.createElement('div');
    previewGroup.className = 'space-y-2 pt-2 border-t border-gray-200';
    const previewLabel = document.createElement('label');
    previewLabel.className = 'block text-sm font-medium text-gray-700';
    previewLabel.textContent = 'Aperçu';
    previewGroup.appendChild(previewLabel);

    const preview = document.createElement('div');
    preview.className = 'p-3 bg-white border border-gray-200 rounded-lg';
    preview.id = 'editorjs-file-preview';
    preview.innerHTML = this.getPreviewHTML();
    previewGroup.appendChild(preview);
    container.appendChild(previewGroup);

    this.wrapper.appendChild(container);
  }

  private async uploadFile(file: File) {
    this.uploading = true;
    this.updateStatus('Téléversement en cours…');

    try {
      const fileName = `files/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('page_assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('page_assets')
        .getPublicUrl(fileName);

      this.data.url = publicUrl;
      this.data.fileName = file.name;
      this.data.size = file.size;
      if (!this.data.label) {
        this.data.label = file.name;
      }
      this.notifyEditor();
      // Re-render pour refléter le label par défaut éventuel et le statut.
      this.renderEditor();
    } catch (error) {
      console.error('Error uploading file:', error);
      this.updateStatus('Échec du téléversement. Réessayez.');
    } finally {
      this.uploading = false;
    }
  }

  private updateStatus(message: string) {
    const status = this.wrapper.querySelector('#editorjs-file-status');
    if (status) status.textContent = message;
  }

  private updatePreview() {
    const preview = this.wrapper.querySelector('#editorjs-file-preview');
    if (preview) preview.innerHTML = this.getPreviewHTML();
  }

  private getPreviewHTML(): string {
    if (!this.data.url) {
      return '<p class="text-sm text-gray-400 italic">Aperçu du bouton…</p>';
    }
    const label = this.data.label || this.data.fileName || 'Télécharger';
    const sizeLabel = this.data.size ? ` (${formatSize(this.data.size)})` : '';
    return `
      <span class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-[#328fce]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>${label}${sizeLabel}</span>
      </span>
    `;
  }

  private notifyEditor() {
    this.wrapper.dispatchEvent(new Event('input', { bubbles: true }));
  }

  save(): FileDownloadData {
    return {
      url: this.data.url,
      fileName: this.data.fileName,
      label: this.data.label,
      size: this.data.size,
    };
  }

  validate(data: FileDownloadData): boolean {
    return Boolean(data.url);
  }
}
