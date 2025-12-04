import type { BlockTool, API } from '@editorjs/editorjs';
import { supabase } from './supabase';

interface CTAData {
  ctaText: string;
  ctaUrl: string;
  icon: string;
  ctaType: 'external-link' | 'internal-link' | 'important-action';
  internalPageSlug?: string | null;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  order_index: number;
  is_active: boolean;
}

interface CTAToolConstructorArgs {
  data?: CTAData;
  api: API;
  readOnly?: boolean;
}

const AVAILABLE_ICONS = [
  'ArrowRight',
  'ArrowLeft',
  'ExternalLink',
  'Link',
  'Download',
  'FileText',
  'Mail',
  'Phone',
  'Calendar',
  'Clock',
  'MapPin',
  'Users',
  'UserPlus',
  'Heart',
  'Star',
  'CheckCircle',
  'AlertCircle',
  'Info',
  'Zap',
  'Target',
  'Flag',
  'Bookmark',
  'Bell',
  'Gift',
  'Trophy',
  'Award',
  'Lightbulb',
  'Sparkles',
  'TrendingUp',
  'Home',
  'Building',
  'School',
  'Briefcase',
  'Coffee',
  'Music',
  'Camera',
  'Image',
  'Film',
  'Book',
  'Folder',
  'Send',
  'Share2',
  'MessageCircle',
  'ChevronRight',
  'ChevronLeft',
];

export class CTATool implements BlockTool {
  private data: CTAData;
  private api: API;
  private readOnly: boolean;
  private wrapper: HTMLElement;
  private pages: Page[] = [];
  private pagesLoading: boolean = false;

  constructor({ data, api, readOnly }: CTAToolConstructorArgs) {
    this.api = api;
    this.readOnly = Boolean(readOnly);
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('editorjs-cta');

    // Support de l'ancien format pour la rétrocompatibilité
    const legacyData = data as any;
    this.data = {
      ctaText: data?.ctaText || legacyData?.text || '',
      ctaUrl: data?.ctaUrl || legacyData?.url || '',
      icon: data?.icon && AVAILABLE_ICONS.includes(data.icon) ? data.icon : 'ArrowRight',
      ctaType: data?.ctaType && ['external-link', 'internal-link', 'important-action'].includes(data.ctaType)
        ? data.ctaType
        : 'external-link',
      internalPageSlug: data?.internalPageSlug || null,
    };

    if (!this.readOnly) {
      this.loadPages();
    }
  }

  private async loadPages() {
    if (this.pagesLoading) return; // Éviter les chargements multiples
    
    this.pagesLoading = true;
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, parent_id, order_index, is_active')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      this.pages = (data || []) as Page[];
    } catch (error) {
      console.error('Error loading pages for CTA:', error);
      this.pages = [];
    } finally {
      this.pagesLoading = false;
      // Mettre à jour le select si on est en mode édition et que le type est internal-link
      if (!this.readOnly && this.data.ctaType === 'internal-link') {
        this.updatePageSelect();
      }
    }
  }

  private updatePageSelect() {
    const pageSelect = this.wrapper.querySelector('#editorjs-cta-page-select') as HTMLSelectElement | null;
    if (!pageSelect) return;

    // Vider le select sauf la première option
    while (pageSelect.options.length > 1) {
      pageSelect.removeChild(pageSelect.lastChild!);
    }

    // Mettre à jour le texte de la première option
    if (pageSelect.options.length > 0) {
      pageSelect.options[0].textContent = this.pagesLoading ? 'Chargement...' : 'Sélectionner une page';
      pageSelect.disabled = this.pagesLoading;
    }

    // Ajouter les pages
    if (!this.pagesLoading && this.pages.length > 0) {
      this.pages.forEach((page) => {
        const option = document.createElement('option');
        const path = this.buildPagePath(page);
        option.value = path;
        option.textContent = page.title;
        option.dataset.slug = page.slug;
        option.selected = this.data.internalPageSlug === path || this.data.ctaUrl === path;
        pageSelect.appendChild(option);
      });
    } else if (!this.pagesLoading && this.pages.length === 0) {
      const noPagesOption = document.createElement('option');
      noPagesOption.value = '';
      noPagesOption.textContent = 'Aucune page disponible';
      noPagesOption.disabled = true;
      pageSelect.appendChild(noPagesOption);
    }
  }

  private buildPagePath(page: Page): string {
    if (!page.parent_id) {
      return `/${page.slug}`;
    }
    const parent = this.pages.find((p) => p.id === page.parent_id);
    if (parent) {
      return `${this.buildPagePath(parent)}/${page.slug}`;
    }
    return `/${page.slug}`;
  }

  static get toolbox() {
    return {
      title: 'Bouton CTA',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>',
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
    container.textContent = `CTA: ${this.data.ctaText || 'Sans texte'} (${this.data.ctaType})`;
    this.wrapper.appendChild(container);
  }

  private renderEditor() {
    this.wrapper.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200';

    // Type de CTA
    const typeGroup = document.createElement('div');
    typeGroup.className = 'space-y-2';
    const typeLabel = document.createElement('label');
    typeLabel.className = 'block text-sm font-medium text-gray-700';
    typeLabel.textContent = 'Type de bouton';
    typeGroup.appendChild(typeLabel);

    const typeSelect = document.createElement('select');
    typeSelect.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
    const types = [
      { value: 'external-link', label: 'Lien externe (bleu)' },
      { value: 'internal-link', label: 'Lien interne (vert)' },
      { value: 'important-action', label: 'Action importante (rouge)' },
    ];
    types.forEach((type) => {
      const option = document.createElement('option');
      option.value = type.value;
      option.textContent = type.label;
      option.selected = type.value === this.data.ctaType;
      typeSelect.appendChild(option);
    });

    typeSelect.addEventListener('change', async () => {
      const newType = typeSelect.value as CTAData['ctaType'];
      this.data.ctaType = newType;
      if (newType !== 'internal-link') {
        this.data.internalPageSlug = null;
      } else if (this.pages.length === 0 && !this.pagesLoading) {
        // Recharger les pages si on passe à "internal-link" et qu'elles ne sont pas chargées
        await this.loadPages();
      }
      this.notifyEditor();
      this.renderEditor();
    });

    typeGroup.appendChild(typeSelect);
    container.appendChild(typeGroup);

    // Icône
    const iconGroup = document.createElement('div');
    iconGroup.className = 'space-y-2';
    const iconLabel = document.createElement('label');
    iconLabel.className = 'block text-sm font-medium text-gray-700';
    iconLabel.textContent = 'Icône';
    iconGroup.appendChild(iconLabel);

    const iconSelect = document.createElement('select');
    iconSelect.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
    AVAILABLE_ICONS.forEach((iconName) => {
      const option = document.createElement('option');
      option.value = iconName;
      option.textContent = iconName;
      option.selected = iconName === this.data.icon;
      iconSelect.appendChild(option);
    });

    iconSelect.addEventListener('change', () => {
      this.data.icon = iconSelect.value;
      this.notifyEditor();
    });

    iconGroup.appendChild(iconSelect);
    container.appendChild(iconGroup);

    // Texte du bouton
    const textGroup = document.createElement('div');
    textGroup.className = 'space-y-2';
    const textLabel = document.createElement('label');
    textLabel.className = 'block text-sm font-medium text-gray-700';
    textLabel.textContent = 'Texte du bouton';
    textGroup.appendChild(textLabel);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = this.data.ctaText;
    textInput.placeholder = 'Ex: En savoir plus, Contactez-nous...';
    textInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
    textInput.addEventListener('input', () => {
      this.data.ctaText = textInput.value;
      this.notifyEditor();
    });

    textGroup.appendChild(textInput);
    container.appendChild(textGroup);

    // URL ou sélection de page interne
    const urlGroup = document.createElement('div');
    urlGroup.className = 'space-y-2';
    const urlLabel = document.createElement('label');
    urlLabel.className = 'block text-sm font-medium text-gray-700';
    urlLabel.textContent = this.data.ctaType === 'internal-link' ? 'Page interne' : 'URL';
    urlGroup.appendChild(urlLabel);

    if (this.data.ctaType === 'internal-link') {
      const pageSelect = document.createElement('select');
      pageSelect.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
      pageSelect.id = 'editorjs-cta-page-select';
      pageSelect.disabled = this.pagesLoading;
      
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = this.pagesLoading ? 'Chargement...' : 'Sélectionner une page';
      emptyOption.selected = !this.data.internalPageSlug && !this.data.ctaUrl;
      pageSelect.appendChild(emptyOption);

      if (!this.pagesLoading && this.pages.length > 0) {
        this.pages.forEach((page) => {
          const option = document.createElement('option');
          const path = this.buildPagePath(page);
          option.value = path;
          option.textContent = page.title;
          option.dataset.slug = page.slug;
          option.selected = this.data.internalPageSlug === path || this.data.ctaUrl === path;
          pageSelect.appendChild(option);
        });
      } else if (!this.pagesLoading && this.pages.length === 0) {
        const noPagesOption = document.createElement('option');
        noPagesOption.value = '';
        noPagesOption.textContent = 'Aucune page disponible';
        noPagesOption.disabled = true;
        pageSelect.appendChild(noPagesOption);
      }

      pageSelect.addEventListener('change', () => {
        const path = pageSelect.value;
        this.data.internalPageSlug = path || null;
        this.data.ctaUrl = path || '';
        this.notifyEditor();
        updatePreview();
      });

      urlGroup.appendChild(pageSelect);
    } else {
      const urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.value = this.data.ctaUrl;
      urlInput.placeholder = 'https://exemple.com ou /page';
      urlInput.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
      urlInput.addEventListener('input', () => {
        this.data.ctaUrl = urlInput.value;
        if (this.data.ctaType !== 'internal-link') {
          this.data.internalPageSlug = null;
        }
        this.notifyEditor();
        updatePreview();
      });

      urlGroup.appendChild(urlInput);
    }

    container.appendChild(urlGroup);

    // Aperçu
    const previewGroup = document.createElement('div');
    previewGroup.className = 'space-y-2 pt-2 border-t border-gray-200';
    const previewLabel = document.createElement('label');
    previewLabel.className = 'block text-sm font-medium text-gray-700';
    previewLabel.textContent = 'Aperçu';
    previewGroup.appendChild(previewLabel);

    const preview = document.createElement('div');
    preview.className = 'p-3 bg-white border border-gray-200 rounded-lg';
    preview.innerHTML = this.getPreviewHTML();
    previewGroup.appendChild(preview);

    // Mettre à jour l'aperçu quand les données changent
    const updatePreview = () => {
      preview.innerHTML = this.getPreviewHTML();
    };

    iconSelect.addEventListener('change', updatePreview);
    textInput.addEventListener('input', updatePreview);

    container.appendChild(previewGroup);
    this.wrapper.appendChild(container);
  }

  private getPreviewHTML(): string {
    if (!this.data.ctaText && !this.data.ctaUrl) {
      return '<p class="text-sm text-gray-400 italic">Aperçu du bouton...</p>';
    }

    const typeClasses = {
      'external-link': 'text-white',
      'internal-link': 'text-white',
      'important-action': 'text-white',
    };
    
    const typeBgColors = {
      'external-link': '#0090d3',
      'internal-link': '#77b698',
      'important-action': '#ff5232',
    };
    
    const typeHoverColors = {
      'external-link': '#007bb3',
      'internal-link': '#659d82',
      'important-action': '#e6482a',
    };

    const classes = typeClasses[this.data.ctaType] || typeClasses['external-link'];
    const bgColor = typeBgColors[this.data.ctaType] || typeBgColors['external-link'];
    const hoverColor = typeHoverColors[this.data.ctaType] || typeHoverColors['external-link'];
    const iconSvg = this.getIconSVG();
    const previewId = `cta-preview-${Math.random().toString(36).substring(7)}`;

    return `
      <style>
        #${previewId} {
          background-color: ${bgColor} !important;
        }
        #${previewId}:hover {
          background-color: ${hoverColor} !important;
        }
      </style>
      <a id="${previewId}" href="${this.data.ctaUrl || '#'}" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${classes}" target="${this.data.ctaType === 'external-link' ? '_blank' : '_self'}" rel="${this.data.ctaType === 'external-link' ? 'noopener noreferrer' : ''}">
        ${iconSvg}
        <span>${this.data.ctaText || 'Texte du bouton'}</span>
      </a>
    `;
  }

  private getIconSVG(): string {
    // Retourne un SVG simple pour l'aperçu (l'icône réelle sera rendue côté React)
    return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
  }

  private notifyEditor() {
    this.wrapper.dispatchEvent(new Event('input', { bubbles: true }));
  }

  save(): CTAData {
    return {
      ctaText: this.data.ctaText,
      ctaUrl: this.data.ctaUrl,
      icon: this.data.icon,
      ctaType: this.data.ctaType,
      internalPageSlug: this.data.internalPageSlug,
    };
  }
}

