export class Alert {
  private api: any;
  private readOnly: boolean;
  private data: {
    type: 'info' | 'success' | 'warning' | 'danger';
    title: string;
    message: string;
  };
  private wrapper: HTMLElement | undefined;

  static get toolbox() {
    return {
      title: 'Alerte',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    };
  }

  constructor({ data, api, readOnly }: any) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      type: data.type || 'info',
      title: data.title || '',
      message: data.message || '',
    };
  }

  render() {
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('cdx-alert');

    const typeSelect = this._createTypeSelect();
    const titleInput = this._createInput('title', 'Titre', this.data.title);
    const messageInput = this._createInput('message', 'Message', this.data.message);

    this.wrapper.appendChild(typeSelect);
    this.wrapper.appendChild(titleInput);
    this.wrapper.appendChild(messageInput);

    this._updateAlertStyle();

    return this.wrapper;
  }

  private _createTypeSelect() {
    const container = document.createElement('div');
    container.classList.add('cdx-alert-type-selector');

    const types = [
      { value: 'info', label: 'Info', color: '#3b82f6' },
      { value: 'success', label: 'Succès', color: '#10b981' },
      { value: 'warning', label: 'Attention', color: '#f59e0b' },
      { value: 'danger', label: 'Danger', color: '#ef4444' },
    ];

    types.forEach((type) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = type.label;
      button.classList.add('cdx-alert-type-button');
      button.style.borderColor = type.color;
      
      if (this.data.type === type.value) {
        button.classList.add('cdx-alert-type-button--active');
        button.style.backgroundColor = type.color;
        button.style.color = 'white';
      }

      button.addEventListener('click', () => {
        this.data.type = type.value as any;
        this._updateTypeButtons(container, type.value);
        this._updateAlertStyle();
      });

      container.appendChild(button);
    });

    return container;
  }

  private _updateTypeButtons(container: HTMLElement, activeType: string) {
    const buttons = container.querySelectorAll('.cdx-alert-type-button');
    const types = [
      { value: 'info', color: '#3b82f6' },
      { value: 'success', color: '#10b981' },
      { value: 'warning', color: '#f59e0b' },
      { value: 'danger', color: '#ef4444' },
    ];

    buttons.forEach((button, index) => {
      const htmlButton = button as HTMLButtonElement;
      const type = types[index];
      
      if (type.value === activeType) {
        htmlButton.classList.add('cdx-alert-type-button--active');
        htmlButton.style.backgroundColor = type.color;
        htmlButton.style.color = 'white';
      } else {
        htmlButton.classList.remove('cdx-alert-type-button--active');
        htmlButton.style.backgroundColor = 'transparent';
        htmlButton.style.color = '#374151';
        htmlButton.style.borderColor = type.color;
      }
    });
  }

  private _createInput(name: string, placeholder: string, value: string) {
    const input = document.createElement('div');
    input.classList.add('cdx-input');
    input.contentEditable = String(!this.readOnly);
    input.dataset.placeholder = placeholder;
    input.textContent = value;

    input.addEventListener('blur', () => {
      this.data[name as keyof typeof this.data] = input.textContent || '';
    });

    return input;
  }

  private _updateAlertStyle() {
    if (!this.wrapper) return;

    const colors = {
      info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
      success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
      warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      danger: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    };

    const color = colors[this.data.type];
    this.wrapper.style.backgroundColor = color.bg;
    this.wrapper.style.borderLeft = `4px solid ${color.border}`;
    this.wrapper.style.color = color.text;
  }

  save() {
    return this.data;
  }

  static get sanitize() {
    return {
      type: false,
      title: true,
      message: true,
    };
  }
}



