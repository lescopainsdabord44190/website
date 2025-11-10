import type { BlockTool, API } from '@editorjs/editorjs';
import { supabase } from './supabase';

interface CarouselImage {
  url: string;
  caption?: string;
  alt?: string;
}

interface CarouselData {
  images: CarouselImage[];
  autoplay?: boolean;
}

interface CarouselToolConstructorArgs {
  data?: CarouselData;
  api: API;
  readOnly?: boolean;
}

interface CarouselItem extends CarouselImage {
  id: string;
  uploading?: boolean;
  previewUrl?: string;
}

const BUCKET_NAME = 'page_assets';

export class CarouselTool implements BlockTool {
  private images: CarouselItem[];
  private autoplay: boolean;
  private api: API;
  private readOnly: boolean;
  private wrapper: HTMLElement;
  private data: CarouselData;
  private draggingId: string | null;

  constructor({ data, api, readOnly }: CarouselToolConstructorArgs) {
    this.api = api;
    this.readOnly = Boolean(readOnly);
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('editorjs-carousel');

    this.images = Array.isArray(data?.images)
      ? data!.images.map((img) => ({
          id: this.generateId(),
          url: img.url,
          caption: img.caption ?? '',
          alt: img.alt ?? '',
        }))
      : [];

    this.autoplay = Boolean(data?.autoplay);
    this.data = {
      images: this.images.map(({ url, caption, alt }) => ({
        url,
        caption: caption ?? '',
        alt: alt ?? '',
      })),
      autoplay: this.autoplay,
    };
    this.draggingId = null;
    this.syncData();
  }

  static get toolbox() {
    return {
      title: 'Carrousel',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="8" y1="22" x2="8" y2="18"></line><line x1="16" y1="22" x2="16" y2="18"></line><circle cx="12" cy="12" r="3"></circle></svg>',
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
    const count = this.images.length;
    this.wrapper.innerHTML = `
      <div class="border border-gray-200 bg-white rounded-xl p-4 text-sm text-gray-600">
        Carrousel (${count} image${count > 1 ? 's' : ''}).
      </div>
    `;
  }

  private renderEditor() {
    this.wrapper.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'space-y-4';

    const header = document.createElement('div');
    header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3';

    const title = document.createElement('div');
    title.innerHTML = `
      <p class="text-sm font-medium text-gray-800">Images du carrousel</p>
      <p class="text-xs text-gray-500">Ajoutez plusieurs images, définissez un alt et une légende. Faites glisser les cartes pour réorganiser.</p>
    `;

    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'inline-flex items-center gap-2 px-3 py-2 bg-[#328fce] text-white text-sm font-medium rounded-lg shadow hover:bg-[#84c19e] transition-colors';
    uploadButton.innerHTML = '<span>Ajouter des images</span>';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'hidden';

    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      const files = input.files;
      if (files && files.length > 0) {
        this.handleFilesUpload(Array.from(files));
      }
      input.value = '';
    });

    header.appendChild(title);
    header.appendChild(uploadButton);
    header.appendChild(fileInput);

    container.appendChild(header);

    const autoplayWrapper = document.createElement('label');
    autoplayWrapper.className = 'flex items-center gap-2 text-sm text-gray-700';

    const autoplayCheckbox = document.createElement('input');
    autoplayCheckbox.type = 'checkbox';
    autoplayCheckbox.checked = this.autoplay;
    autoplayCheckbox.className = 'w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]';
    autoplayCheckbox.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      this.autoplay = input.checked;
      this.syncData();
      this.notifyEditor();
    });

    autoplayWrapper.appendChild(autoplayCheckbox);
    const autoplayLabel = document.createElement('span');
    autoplayLabel.textContent = 'Activer l’autoplay (désactivé par défaut)';
    autoplayWrapper.appendChild(autoplayLabel);

    container.appendChild(autoplayWrapper);

    if (this.images.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500 bg-gray-50';
      emptyState.textContent = 'Aucune image pour le moment. Ajoutez-en pour créer votre carrousel.';
      container.appendChild(emptyState);
    } else {
      const list = document.createElement('div');
      list.className = 'space-y-3';

      this.images.forEach((image, index) => {
        const card = document.createElement('div');
        card.className = 'group border border-gray-200 rounded-2xl bg-white shadow-sm hover:border-[#328fce] transition-colors';
        card.draggable = true;

        card.addEventListener('dragstart', (event) => {
          this.draggingId = image.id;
          card.classList.add('opacity-60');
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('application/x-carousel-item', image.id);
          }
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('opacity-60');
          this.draggingId = null;
        });

        card.addEventListener('dragover', (event) => {
          event.preventDefault();
          card.classList.add('ring-2', 'ring-dashed', 'ring-[#328fce]');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('ring-2', 'ring-dashed', 'ring-[#328fce]');
        });

        card.addEventListener('drop', (event) => {
          event.preventDefault();
          event.stopPropagation();
          card.classList.remove('ring-2', 'ring-dashed', 'ring-[#328fce]');

          const fromId = this.draggingId || event.dataTransfer?.getData('application/x-carousel-item');
          if (!fromId) {
            return;
          }

          const fromIndex = this.images.findIndex((item) => item.id === fromId);
          if (fromIndex === -1 || fromIndex === index) {
            return;
          }

          const [moved] = this.images.splice(fromIndex, 1);
          this.images.splice(index, 0, moved);
          this.draggingId = null;
          this.syncData();
          this.notifyEditor();
          this.renderEditor();
        });

        const content = document.createElement('div');
        content.className = 'flex items-center gap-4 p-4';

        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'relative w-28 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0';

        const thumb = document.createElement('img');
        thumb.src = image.url || image.previewUrl || '';
        thumb.alt = image.alt || image.caption || `Image ${index + 1}`;
        thumb.className = 'w-full h-full object-cover';
        thumbWrapper.appendChild(thumb);

        if (image.uploading) {
          const overlay = document.createElement('div');
          overlay.className = 'absolute inset-0 bg-white/80 flex items-center justify-center';
          overlay.innerHTML = '<svg class="w-6 h-6 animate-spin text-[#328fce]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>';
          thumbWrapper.appendChild(overlay);
        }

        const info = document.createElement('div');
        info.className = 'flex-1 min-w-0 space-y-1';

        const altText = document.createElement('p');
        altText.className = 'text-sm font-medium text-gray-800 truncate';
        altText.textContent = image.alt?.trim() ? image.alt.trim() : 'Alt non renseigné';
        info.appendChild(altText);

        const captionText = document.createElement('p');
        captionText.className = 'text-xs text-gray-500 truncate';
        captionText.textContent = image.caption?.trim() ? image.caption.trim() : 'Légende vide';
        info.appendChild(captionText);

        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-2 self-stretch';

        const dragHandle = document.createElement('button');
        dragHandle.type = 'button';
        dragHandle.className = 'flex items-center justify-center w-9 h-9 text-gray-400 hover:text-[#328fce] transition-colors cursor-grab';
        dragHandle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>';
        dragHandle.addEventListener('mousedown', () => {
          card.classList.add('cursor-grabbing');
        });
        dragHandle.addEventListener('mouseup', () => {
          card.classList.remove('cursor-grabbing');
        });
        actions.appendChild(dragHandle);

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'px-3 py-2 text-sm border border-[#328fce]/30 text-[#328fce] rounded-lg hover:bg-[#328fce] hover:text-white transition-colors';
        editButton.textContent = 'Modifier';
        editButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.openEditDialog(index);
        });
        actions.appendChild(editButton);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors';
        removeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
        removeButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const removed = this.images.splice(index, 1)[0];
          if (removed?.previewUrl) {
            URL.revokeObjectURL(removed.previewUrl);
          }
          this.syncData();
          this.notifyEditor();
          this.renderEditor();
        });
        actions.appendChild(removeButton);

        content.appendChild(thumbWrapper);
        content.appendChild(info);
        content.appendChild(actions);
        card.appendChild(content);
        list.appendChild(card);
      });

      container.appendChild(list);
    }

    this.wrapper.appendChild(container);
  }

  private syncData() {
    this.data = {
      images: this.images
        .filter((img) => !img.uploading && Boolean(img.url))
        .map(({ url, caption, alt }) => ({
          url,
          caption: caption ?? '',
          alt: alt ?? '',
        })),
      autoplay: this.autoplay,
    };
  }

  private notifyEditor() {
    this.wrapper.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private async handleFilesUpload(files: File[]) {
    if (!files.length) return;

    const placeholders = files.map((file) => ({
      id: this.generateId(),
      url: '',
      caption: '',
      alt: '',
      uploading: true,
      previewUrl: URL.createObjectURL(file),
    }));

    this.images.push(...placeholders);
    this.syncData();
    this.notifyEditor();
    this.renderEditor();

    await Promise.all(
      placeholders.map(async (placeholder, idx) => {
        const file = files[idx];
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
          const filePath = `content/${fileName}`;

          const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

          placeholder.url = publicUrlData?.publicUrl || '';
        } catch (error) {
          console.error('Error uploading carousel image:', error);
          this.images = this.images.filter((img) => img.id !== placeholder.id);
        } finally {
          placeholder.uploading = false;
          if (placeholder.previewUrl) {
            URL.revokeObjectURL(placeholder.previewUrl);
            delete placeholder.previewUrl;
          }
          this.syncData();
          this.notifyEditor();
          this.renderEditor();
        }
      })
    );
  }

  private openEditDialog(index: number) {
    const image = this.images[index];
    if (!image) return;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4';

    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5';

    const header = document.createElement('div');
    header.className = 'flex items-start justify-between gap-4';
    header.innerHTML = `
      <div>
        <h3 class="text-lg font-semibold text-gray-800">Modifier l’image</h3>
        <p class="text-sm text-gray-500">Mettez à jour le texte alternatif et la légende.</p>
      </div>
    `;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'text-gray-400 hover:text-gray-600';
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';

    const cleanup = () => {
      document.body.style.overflow = '';
      overlay.remove();
    };

    closeButton.addEventListener('click', cleanup);

    header.appendChild(closeButton);
    dialog.appendChild(header);

    const preview = document.createElement('div');
    preview.className = 'rounded-xl overflow-hidden bg-gray-100';
    preview.innerHTML = `<img src="${image.url}" alt="${image.alt || ''}" class="w-full h-48 object-cover" />`;
    dialog.appendChild(preview);

    const altGroup = document.createElement('div');
    altGroup.className = 'space-y-2';
    altGroup.innerHTML = `
      <label class="block text-sm font-medium text-gray-700">Texte alternatif</label>
      <input type="text" value="${image.alt || ''}" class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none" placeholder="Décrivez brièvement l’image" />
      <p class="text-xs text-gray-500">Ce texte est utilisé par les lecteurs d’écran et s’affiche si l’image ne peut pas être chargée.</p>
    `;
    const altInput = altGroup.querySelector('input') as HTMLInputElement;
    dialog.appendChild(altGroup);

    const captionGroup = document.createElement('div');
    captionGroup.className = 'space-y-2';
    captionGroup.innerHTML = `
      <label class="block text-sm font-medium text-gray-700">Légende (optionnel)</label>
      <input type="text" value="${image.caption || ''}" class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none" placeholder="Texte affiché sous l’image" />
    `;
    const captionInput = captionGroup.querySelector('input') as HTMLInputElement;
    dialog.appendChild(captionGroup);

    const actions = document.createElement('div');
    actions.className = 'flex items-center justify-end gap-2 pt-4 border-t border-gray-100';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'px-4 py-2 text-sm text-gray-600 hover:text-gray-800';
    cancelButton.textContent = 'Annuler';
    cancelButton.addEventListener('click', cleanup);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'px-4 py-2 text-sm bg-[#328fce] text-white rounded-lg hover:bg-[#84c19e] transition-colors';
    saveButton.textContent = 'Enregistrer';
    saveButton.addEventListener('click', () => {
      image.alt = altInput.value.trim();
      image.caption = captionInput.value.trim();
      this.syncData();
      this.notifyEditor();
      cleanup();
      this.renderEditor();
    });

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup();
      }
    });

    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);

    const escapeListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cleanup();
        document.removeEventListener('keydown', escapeListener);
      }
    };
    document.addEventListener('keydown', escapeListener);
  }

  private generateId() {
    return `carousel-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
  }

  save(): CarouselData {
    this.syncData();
    return this.data;
  }
}
