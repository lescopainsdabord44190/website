import type { BlockTool, API } from '@editorjs/editorjs';
import { supabase } from './supabase';

interface AnimListData {
  counselorSlugs: string[];
}

interface CounselorRecord {
  slug: string;
  first_name: string;
  last_name: string | null;
  is_active: boolean;
}

interface AnimListConstructorArgs {
  data?: AnimListData;
  api: API;
  readOnly?: boolean;
}

export class AnimListTool implements BlockTool {
  private data: AnimListData;
  private api: API;
  private wrapper: HTMLElement;
  private readOnly: boolean;

  constructor({ data, api, readOnly }: AnimListConstructorArgs) {
    this.data = {
      counselorSlugs: data?.counselorSlugs ?? [],
    };
    this.api = api;
    this.readOnly = Boolean(readOnly);
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('editorjs-anim-list');
  }

  static get toolbox() {
    return {
      title: 'Liste des anims',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M12 11a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-6-7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm7.5-.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM6 12c2.32 0 4.2 1.42 4.2 3.17V16H1.8v-.83C1.8 13.42 3.68 12 6 12zm6 1c-.3 0-.58.03-.85.07a4.17 4.17 0 0 1 1.13 2.93H16.8v-.83C16.8 13.42 14.92 12 12 12z" fill="currentColor"/></svg>',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  async render() {
    if (this.readOnly) {
      this.renderReadOnly();
      return this.wrapper;
    }

    this.wrapper.innerHTML = `
      <div class="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 text-sm text-gray-500">
        Chargement des animateur·rices...
      </div>
    `;

    try {
      const { data, error } = await supabase
        .from('counselors')
        .select('slug, first_name, last_name, is_active')
        .order('first_name', { ascending: true });

      if (error) throw error;

      this.renderEditorList(data || []);
    } catch (error) {
      console.error('Error loading counselors for EditorJS:', error);
      this.wrapper.innerHTML = `
        <div class="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 text-sm">
          Impossible de charger la liste des animateur·rices. Veuillez réessayer.
        </div>
      `;
    }

    return this.wrapper;
  }

  private renderReadOnly() {
    this.wrapper.innerHTML = `
      <div class="border border-gray-200 rounded-xl p-4 bg-white text-sm text-gray-500">
        ${this.data.counselorSlugs.length} animateur·rices sélectionné·es.
      </div>
    `;
  }

  private renderEditorList(counselors: CounselorRecord[]) {
    this.wrapper.innerHTML = '';

    if (!counselors.length) {
      this.wrapper.innerHTML = `
        <div class="border border-yellow-200 bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm">
          Aucun animateur·rice disponible pour le moment.
        </div>
      `;
      return;
    }

    const container = document.createElement('div');
    container.className = 'space-y-3';

    const info = document.createElement('p');
    info.className = 'text-xs text-gray-500';
    info.textContent = 'Sélectionnez les animateur·rices à afficher. Les contenus publics afficheront automatiquement les projets liés.';
    container.appendChild(info);

    const list = document.createElement('div');
    list.className = 'grid gap-2 md:grid-cols-2';

    counselors.forEach((counselor) => {
      const isChecked = this.data.counselorSlugs.includes(counselor.slug);
      const card = document.createElement('label');
      card.className = `flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
        isChecked ? 'border-[#328fce] bg-blue-50/60' : 'border-gray-200 hover:border-[#328fce]'
      }`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isChecked;
      checkbox.className = 'mt-1 w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]';
      checkbox.addEventListener('change', (event) => {
        const input = event.target as HTMLInputElement;
        this.toggleSlug(counselor.slug, input.checked);
        card.className = `flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
          input.checked ? 'border-[#328fce] bg-blue-50/60' : 'border-gray-200 hover:border-[#328fce]'
        }`;
      });

      const body = document.createElement('div');
      const title = document.createElement('p');
      title.className = 'text-sm font-medium text-gray-800';
      title.textContent = `${counselor.first_name} ${counselor.last_name || ''}`;

      const meta = document.createElement('p');
      meta.className = 'text-xs text-gray-500 mt-0.5';
      meta.textContent = counselor.slug;

      body.appendChild(title);
      body.appendChild(meta);

      if (!counselor.is_active) {
        const badge = document.createElement('span');
        badge.className = 'inline-block mt-1 text-[11px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full';
        badge.textContent = 'Inactif·ve';
        body.appendChild(badge);
      }

      card.appendChild(checkbox);
      card.appendChild(body);
      list.appendChild(card);
    });

    container.appendChild(list);
    this.wrapper.appendChild(container);
  }

  private toggleSlug(slug: string, selected: boolean) {
    if (selected) {
      if (!this.data.counselorSlugs.includes(slug)) {
        this.data.counselorSlugs.push(slug);
      }
    } else {
      this.data.counselorSlugs = this.data.counselorSlugs.filter((item) => item !== slug);
    }
  }

  save(): AnimListData {
    return {
      counselorSlugs: this.data.counselorSlugs,
    };
  }
}


