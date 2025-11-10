import type { BlockTool, API } from '@editorjs/editorjs';
import { supabase } from './supabase';

interface VolunteerListData {
  volunteerSlugs: string[];
}

interface VolunteerRecord {
  slug: string;
  first_name: string;
  last_name: string | null;
  role_title: string | null;
  photo_url: string | null;
  is_active: boolean;
}

interface VolunteerListConstructorArgs {
  data?: VolunteerListData;
  api: API;
  readOnly?: boolean;
}

export class VolunteerListTool implements BlockTool {
  private data: VolunteerListData;
  private wrapper: HTMLElement;
  private readOnly: boolean;
  private cachedVolunteers: VolunteerRecord[] = [];
  private dragSourceIndex: number | null = null;

  constructor({ data, api, readOnly }: VolunteerListConstructorArgs) {
    this.data = {
      volunteerSlugs: data?.volunteerSlugs ?? [],
    };
    void api;
    this.readOnly = Boolean(readOnly);
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('editorjs-volunteer-list');
  }

  static get toolbox() {
    return {
      title: 'Liste des bénévoles',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18"><path d="M6 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm6 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 10c2.5 0 4.5 1.5 4.5 3.33V15H1.5v-1.67C1.5 11.5 3.5 10 6 10zm6 0c.39 0 .75.04 1.09.11A4.13 4.13 0 0 1 16.5 14v1h-4.5v-1.67c0-.74-.25-1.43-.68-2.05.55-.18 1.16-.28 1.68-.28z" fill="currentColor"/></svg>',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  render() {
    if (this.readOnly) {
      return this.renderReadOnly();
    }

    this.renderLoading();
    void this.loadVolunteers();
    return this.wrapper;
  }

  private renderReadOnly() {
    this.wrapper.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'border border-gray-200 rounded-xl p-4 bg-white text-sm text-gray-500';
    container.textContent = `${this.data.volunteerSlugs.length} bénévoles sélectionné·es.`;
    this.wrapper.appendChild(container);
    return this.wrapper;
  }

  private async loadVolunteers() {
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('slug, first_name, last_name, role_title, photo_url, is_active')
        .order('first_name', { ascending: true });

      if (error) throw error;

      this.cachedVolunteers = data ?? [];
      this.renderList();
    } catch (error) {
      console.error('Error loading volunteers for EditorJS:', error);
      this.renderError();
    }
  }

  private renderList() {
    this.wrapper.innerHTML = '';

    if (this.cachedVolunteers.length === 0) {
      this.renderEmpty();
      return;
    }

    const container = document.createElement('div');
    container.className = 'space-y-3';

    const info = document.createElement('p');
    info.className = 'text-xs text-gray-500';
    info.textContent = 'Cochez les bénévoles à afficher et glissez-déposez pour définir leur ordre.';
    container.appendChild(info);

    const list = document.createElement('div');
    list.className = 'space-y-2';

    const orderedVolunteers = this.getOrderedVolunteers();
    orderedVolunteers.forEach(({ volunteer, selectedIndex }) => {
      list.appendChild(this.createListItem(volunteer, selectedIndex));
    });

    container.appendChild(list);
    this.wrapper.appendChild(container);
  }

  private getOrderedVolunteers() {
    const selectedSet = new Set(this.data.volunteerSlugs);
    const selected: Array<{ volunteer: VolunteerRecord; selectedIndex: number }> = [];

    this.data.volunteerSlugs.forEach((slug, index) => {
      const volunteer = this.cachedVolunteers.find((item) => item.slug === slug);
      if (volunteer) {
        selected.push({ volunteer, selectedIndex: index });
      }
    });

    const remaining = this.cachedVolunteers
      .filter((item) => !selectedSet.has(item.slug))
      .sort((a, b) => a.first_name.localeCompare(b.first_name));

    return selected.concat(remaining.map((volunteer) => ({ volunteer, selectedIndex: -1 })));
  }

  private createListItem(volunteer: VolunteerRecord, selectedIndex: number) {
    const isSelected = selectedIndex >= 0;

    const card = document.createElement('div');
    card.className = `flex items-center gap-3 border rounded-xl p-3 transition-colors ${
      isSelected
        ? 'border-[#328fce]/60 bg-blue-50/80 cursor-grab'
        : 'border-gray-200 bg-white hover:border-[#328fce]/60'
    }`;
    card.dataset.slug = volunteer.slug;
    card.dataset.selectedIndex = isSelected ? selectedIndex.toString() : '';

    if (isSelected) {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', this.onDragStart);
      card.addEventListener('dragover', this.onDragOver);
      card.addEventListener('dragleave', this.onDragLeave);
      card.addEventListener('drop', this.onDrop);
      card.addEventListener('dragend', this.onDragEnd);
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isSelected;
    checkbox.className = 'w-4 h-4 text-[#328fce] border-gray-300 rounded focus:ring-[#328fce]';
    checkbox.addEventListener('change', () => {
      this.toggleSlug(volunteer.slug, checkbox.checked);
    });
    card.appendChild(checkbox);

    const content = document.createElement('div');
    content.className = 'flex items-center gap-3 flex-1';

    content.appendChild(this.createAvatar(volunteer.photo_url, volunteer.first_name, volunteer.last_name));

    const textContainer = document.createElement('div');
    textContainer.className = 'flex flex-col';

    const name = document.createElement('span');
    name.className = 'text-sm font-medium text-gray-800';
    name.textContent = `${volunteer.first_name} ${volunteer.last_name ?? ''}`;
    textContainer.appendChild(name);

    if (volunteer.role_title) {
      const role = document.createElement('span');
      role.className = 'text-xs text-[#328fce]';
      role.textContent = volunteer.role_title;
      textContainer.appendChild(role);
    }

    const slugInfo = document.createElement('span');
    slugInfo.className = 'text-xs text-gray-500';
    slugInfo.textContent = volunteer.slug;
    textContainer.appendChild(slugInfo);

    if (!volunteer.is_active) {
      const badge = document.createElement('span');
      badge.className = 'inline-block mt-1 text-[11px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full';
      badge.textContent = 'Inactif·ve';
      textContainer.appendChild(badge);
    }

    content.appendChild(textContainer);
    card.appendChild(content);

    if (isSelected) {
      const handle = document.createElement('span');
      handle.className = 'text-gray-400 select-none ml-auto';
      handle.innerHTML = '&#8942;';
      card.appendChild(handle);
    }

    return card;
  }

  private renderLoading() {
    this.wrapper.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 text-sm text-gray-500';
    loading.textContent = 'Chargement des bénévoles...';
    this.wrapper.appendChild(loading);
  }

  private renderError() {
    this.wrapper.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 text-sm';
    error.textContent = 'Impossible de charger la liste des bénévoles. Veuillez réessayer.';
    this.wrapper.appendChild(error);
  }

  private renderEmpty() {
    this.wrapper.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'border border-yellow-200 bg-yellow-50 text-yellow-700 rounded-xl p-4 text-sm';
    empty.textContent = 'Aucun·e bénévole disponible pour le moment.';
    this.wrapper.appendChild(empty);
  }

  private toggleSlug(slug: string, selected: boolean) {
    if (selected) {
      if (!this.data.volunteerSlugs.includes(slug)) {
        this.data.volunteerSlugs.push(slug);
      }
    } else {
      this.data.volunteerSlugs = this.data.volunteerSlugs.filter((item) => item !== slug);
    }

    this.renderList();
  }

  private onDragStart = (event: DragEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    const selectedIndexAttr = target.dataset.selectedIndex;
    if (!selectedIndexAttr) return;

    this.dragSourceIndex = Number(selectedIndexAttr);
    target.classList.add('opacity-60');
    const dataTransfer = event.dataTransfer;
    if (dataTransfer) {
      dataTransfer.effectAllowed = 'move';
    }
  };

  private onDragOver = (event: DragEvent) => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement | null;
    if (!target?.dataset.selectedIndex) return;
    target.classList.add('border-[#328fce]');
    const dataTransfer = event.dataTransfer;
    if (dataTransfer) {
      dataTransfer.dropEffect = 'move';
    }
  };

  private onDragLeave = (event: DragEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    target.classList.remove('border-[#328fce]');
  };

  private onDrop = (event: DragEvent) => {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement | null;
    if (!target?.dataset.selectedIndex || this.dragSourceIndex === null) {
      return;
    }

    const targetIndex = Number(target.dataset.selectedIndex);
    const sourceIndex = this.dragSourceIndex;
    this.dragSourceIndex = null;

    target.classList.remove('border-[#328fce]');

    if (targetIndex === sourceIndex) {
      this.renderList();
      return;
    }

    const slugs = [...this.data.volunteerSlugs];
    const [moved] = slugs.splice(sourceIndex, 1);
    slugs.splice(targetIndex, 0, moved);
    this.data.volunteerSlugs = slugs;

    this.renderList();
  };

  private onDragEnd = (event: DragEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    if (target) {
      target.classList.remove('opacity-60');
      target.classList.remove('border-[#328fce]');
    }
    this.dragSourceIndex = null;
  };

  private createAvatar(photoUrl: string | null, firstName: string, lastName: string | null) {
    const wrapper = document.createElement('div');
    wrapper.className =
      'w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-[#328fce]/10 text-[#328fce] flex items-center justify-center font-semibold uppercase';

    if (photoUrl) {
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = `${firstName} ${lastName ?? ''}`;
      img.className = 'w-full h-full object-cover';
      wrapper.appendChild(img);
    } else {
      const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim() || '–';
      wrapper.textContent = initials;
    }

    return wrapper;
  }

  save(): VolunteerListData {
    return {
      volunteerSlugs: this.data.volunteerSlugs,
    };
  }
}

