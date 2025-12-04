import type { BlockTool, API, OutputData } from '@editorjs/editorjs';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import ImageTool from '@editorjs/image';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table';
import Warning from '@editorjs/warning';
import Checklist from '@editorjs/checklist';
import Paragraph from '@editorjs/paragraph';
import { supabase } from './supabase';
import { Alert } from './editorjs-alert';
import { AnimListTool } from './editorjs-anim-list';
import { VolunteerListTool } from './editorjs-volunteer-list';
import { CarouselTool } from './editorjs-carousel';

interface ColumnsData {
  columns: 1 | 2 | 3 | 4;
  withBorder: boolean;
  columnContents: OutputData[];
  backgroundTheme?: string | null;
}

const BACKGROUND_THEMES = [
  { id: null, name: 'Aucun', colors: '' },
  { id: 'blue-green', name: 'Annonce', colors: 'from-[#84c19e] to-[#328fce]' },
  { id: 'purple-blue', name: 'Événement', colors: 'from-purple-500 to-blue-500' },
  { id: 'green-cyan', name: 'Bonne nouvelle', colors: 'from-green-400 to-cyan-500' },
  { id: 'yellow-pink', name: 'À noter', colors: 'from-[#ffbf40] to-[#ff9fa8]' },
  { id: 'red-pink', name: 'Important', colors: 'from-[#ff6243] to-[#ff9fa8]' },
  { id: 'orange-red', name: 'Urgent', colors: 'from-orange-400 to-red-500' },
];

interface ColumnsToolConstructorArgs {
  data?: ColumnsData;
  api: API;
  readOnly?: boolean;
}

const getToolsConfig = () => ({
  paragraph: {
    class: Paragraph,
    inlineToolbar: true,
  },
  header: {
    class: Header,
    inlineToolbar: true,
    config: {
      placeholder: 'Entrez un titre',
      levels: [2, 3, 4, 5, 6],
      defaultLevel: 2,
    },
  },
  list: {
    class: List,
    inlineToolbar: true,
    config: {
      defaultStyle: 'unordered',
    },
  },
  image: {
    class: ImageTool,
    config: {
      uploader: {
        async uploadByFile(file: File) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `content/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('page_assets')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('page_assets')
              .getPublicUrl(filePath);

            return {
              success: 1,
              file: {
                url: publicUrl,
              },
            };
          } catch (error) {
            console.error('Error uploading image:', error);
            return {
              success: 0,
            };
          }
        },
      },
    },
  },
  quote: {
    class: Quote,
    inlineToolbar: true,
    config: {
      quotePlaceholder: 'Entrez une citation',
      captionPlaceholder: 'Auteur de la citation',
    },
  },
  delimiter: Delimiter,
  table: {
    class: Table,
    inlineToolbar: true,
  },
  warning: {
    class: Warning,
    inlineToolbar: true,
    config: {
      titlePlaceholder: 'Titre',
      messagePlaceholder: 'Message',
    },
  },
  alert: {
    class: Alert,
    inlineToolbar: true,
  },
  checklist: {
    class: Checklist,
    inlineToolbar: true,
  },
  'anim-list': {
    class: AnimListTool,
  },
  'volunteer-list': {
    class: VolunteerListTool,
  },
  carousel: {
    class: CarouselTool,
  },
  // Note: 'columns' est intentionnellement exclu pour éviter la récursion
});

export class ColumnsTool implements BlockTool {
  private data: ColumnsData;
  private api: API;
  private readOnly: boolean;
  private wrapper: HTMLElement;
  private editors: EditorJS[] = [];
  private editorContainers: HTMLElement[] = [];

  constructor({ data, api, readOnly }: ColumnsToolConstructorArgs) {
    this.api = api;
    void api; // Utilisé pour la compatibilité avec l'interface
    this.readOnly = Boolean(readOnly);
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('editorjs-columns');

    const numColumns = data?.columns && [1, 2, 3, 4].includes(data.columns) ? data.columns : 2;
    const withBorder = Boolean(data?.withBorder);
    const columnContents = Array.isArray(data?.columnContents) ? data.columnContents : [];
    const backgroundTheme = data?.backgroundTheme || null;

    // S'assurer qu'on a le bon nombre de colonnes
    while (columnContents.length < numColumns) {
      columnContents.push({ time: Date.now(), blocks: [], version: '2.28.2' });
    }
    while (columnContents.length > numColumns) {
      columnContents.pop();
    }

    this.data = {
      columns: numColumns,
      withBorder,
      columnContents,
      backgroundTheme,
    };
  }

  static get toolbox() {
    return {
      title: 'Colonnes',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"></rect><rect x="14" y="3" width="7" height="18" rx="1"></rect></svg>',
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
    const gridClasses = this.getGridClasses();
    const backgroundClasses = this.getBackgroundClasses();
    container.className = `grid gap-4 ${gridClasses}`;
    if (this.data.withBorder) {
      container.className += ' border border-gray-300 rounded-lg p-4';
    }
    if (backgroundClasses) {
      container.className += ` ${backgroundClasses} p-4 rounded-lg`;
    }

    this.data.columnContents.forEach((content, index) => {
      const column = document.createElement('div');
      column.className = 'min-h-[100px]';
      column.textContent = `Colonne ${index + 1} (${content.blocks?.length || 0} bloc${(content.blocks?.length || 0) > 1 ? 's' : ''})`;
      container.appendChild(column);
    });

    this.wrapper.appendChild(container);
  }

  private async renderEditor() {
    this.wrapper.innerHTML = '';
    this.destroyEditors();

    const container = document.createElement('div');
    container.className = 'space-y-4';

    // Contrôles
    const controls = document.createElement('div');
    controls.className = 'flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200';

    // Sélecteur de nombre de colonnes
    const columnsGroup = document.createElement('div');
    columnsGroup.className = 'flex items-center gap-2';
    const columnsLabel = document.createElement('label');
    columnsLabel.className = 'text-sm font-medium text-gray-700';
    columnsLabel.textContent = 'Nombre de colonnes:';
    columnsGroup.appendChild(columnsLabel);

    const columnsSelect = document.createElement('select');
    columnsSelect.className = 'px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
    [1, 2, 3, 4].forEach((num) => {
      const option = document.createElement('option');
      option.value = num.toString();
      option.textContent = num.toString();
      option.selected = num === this.data.columns;
      columnsSelect.appendChild(option);
    });

    columnsSelect.addEventListener('change', async () => {
      const newColumns = Number(columnsSelect.value) as 1 | 2 | 3 | 4;
      if (newColumns !== this.data.columns) {
        this.data.columns = newColumns;
        // Ajuster le nombre de colonnes
        while (this.data.columnContents.length < newColumns) {
          this.data.columnContents.push({ time: Date.now(), blocks: [], version: '2.28.2' });
        }
        while (this.data.columnContents.length > newColumns) {
          this.data.columnContents.pop();
        }
        await this.saveColumnContents();
        this.notifyEditor();
        this.renderEditor();
      }
    });

    columnsGroup.appendChild(columnsSelect);
    controls.appendChild(columnsGroup);

    // Case à cocher pour la bordure
    const borderGroup = document.createElement('label');
    borderGroup.className = 'flex items-center gap-2 text-sm text-gray-700 cursor-pointer';
    const borderCheckbox = document.createElement('input');
    borderCheckbox.type = 'checkbox';
    borderCheckbox.checked = this.data.withBorder;
    borderCheckbox.className = 'w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]';
    borderCheckbox.addEventListener('change', () => {
      this.data.withBorder = borderCheckbox.checked;
      this.notifyEditor();
      this.renderEditor();
    });
    borderGroup.appendChild(borderCheckbox);
    const borderLabel = document.createElement('span');
    borderLabel.textContent = 'Afficher la bordure';
    borderGroup.appendChild(borderLabel);
    controls.appendChild(borderGroup);

    // Sélecteur de thème de background
    const themeGroup = document.createElement('div');
    themeGroup.className = 'space-y-2';
    const themeLabel = document.createElement('label');
    themeLabel.className = 'block text-sm font-medium text-gray-700';
    themeLabel.textContent = 'Thème de fond';
    themeGroup.appendChild(themeLabel);

    const themeSelect = document.createElement('select');
    themeSelect.className = 'w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-[#328fce] focus:ring-2 focus:ring-[#328fce]/20 outline-none';
    BACKGROUND_THEMES.forEach((theme) => {
      const option = document.createElement('option');
      option.value = theme.id || '';
      option.textContent = theme.name;
      option.selected = (theme.id === null && this.data.backgroundTheme === null) || theme.id === this.data.backgroundTheme;
      themeSelect.appendChild(option);
    });

    themeSelect.addEventListener('change', () => {
      const selectedValue = themeSelect.value;
      this.data.backgroundTheme = selectedValue === '' ? null : selectedValue;
      this.notifyEditor();
      this.renderEditor();
    });

    themeGroup.appendChild(themeSelect);
    controls.appendChild(themeGroup);

    container.appendChild(controls);

    // Colonnes avec éditeurs
    const columnsContainer = document.createElement('div');
    const backgroundClasses = this.getBackgroundClasses();
    columnsContainer.className = `grid gap-4 ${this.getGridClasses()}`;
    if (this.data.withBorder) {
      columnsContainer.className += ' border border-gray-300 rounded-lg p-4';
    }
    if (backgroundClasses) {
      columnsContainer.className += ` ${backgroundClasses} p-4 rounded-lg`;
      // Ajouter une classe pour forcer le texte blanc dans les éditeurs
      columnsContainer.classList.add('editorjs-columns-with-theme');
    }

    this.editorContainers = [];
    for (let i = 0; i < this.data.columns; i++) {
      const column = document.createElement('div');
      column.className = 'min-h-[200px]';

      const editorContainer = document.createElement('div');
      editorContainer.className = 'editorjs-column-editor';
      editorContainer.dataset.columnIndex = i.toString();
      column.appendChild(editorContainer);

      columnsContainer.appendChild(column);
      this.editorContainers.push(editorContainer);
    }

    container.appendChild(columnsContainer);
    this.wrapper.appendChild(container);

    // Initialiser les éditeurs après un court délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.initEditors();
    }, 100);
  }

  private getGridClasses(): string {
    const cols = this.data.columns;
    const gridClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };
    return gridClasses[cols] || 'grid-cols-1 md:grid-cols-2';
  }

  private getBackgroundClasses(): string {
    if (!this.data.backgroundTheme) {
      return '';
    }
    const theme = BACKGROUND_THEMES.find((t) => t.id === this.data.backgroundTheme);
    if (!theme || !theme.colors) {
      return '';
    }
    return `bg-gradient-to-r ${theme.colors} text-white`;
  }

  private async initEditors() {
    this.destroyEditors();

    for (let i = 0; i < this.editorContainers.length; i++) {
      const container = this.editorContainers[i];
      const content = this.data.columnContents[i] || { time: Date.now(), blocks: [], version: '2.28.2' };

      const editorId = `editorjs-column-${Date.now()}-${i}`;
      container.id = editorId;

      try {
        const editor = new EditorJS({
          holder: editorId,
          data: content,
          placeholder: `Contenu de la colonne ${i + 1}...`,
          tools: getToolsConfig() as any,
          onChange: async () => {
            await this.saveColumnContents();
            this.notifyEditor();
          },
        });

        await editor.isReady;
        this.editors.push(editor);
      } catch (error) {
        console.error(`Error initializing column editor ${i}:`, error);
      }
    }
  }

  private async saveColumnContents() {
    const contents: OutputData[] = [];
    for (const editor of this.editors) {
      try {
        const saved = await editor.save();
        contents.push(saved);
      } catch (error) {
        console.error('Error saving column content:', error);
        contents.push({ time: Date.now(), blocks: [], version: '2.28.2' });
      }
    }

    // S'assurer qu'on a le bon nombre de colonnes
    while (contents.length < this.data.columns) {
      contents.push({ time: Date.now(), blocks: [], version: '2.28.2' });
    }

    this.data.columnContents = contents.slice(0, this.data.columns);
  }

  private destroyEditors() {
    this.editors.forEach((editor) => {
      try {
        editor.destroy();
      } catch (error) {
        console.error('Error destroying editor:', error);
      }
    });
    this.editors = [];
  }

  private notifyEditor() {
    this.wrapper.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async save(): Promise<ColumnsData> {
    await this.saveColumnContents();
    return {
      columns: this.data.columns,
      withBorder: this.data.withBorder,
      columnContents: this.data.columnContents,
      backgroundTheme: this.data.backgroundTheme,
    };
  }
}

