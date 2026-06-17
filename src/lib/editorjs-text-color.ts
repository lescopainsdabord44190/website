import type { API, InlineTool } from '@editorjs/editorjs';

interface BrandColor {
  name: string;
  label: string;
  hex: string | null;
}

// Couleurs de la charte (cf. src/index.css). `default` retire la couleur.
const COLORS: BrandColor[] = [
  { name: 'brand-blue', label: 'Bleu', hex: '#328fce' },
  { name: 'brand-green', label: 'Vert', hex: '#84c19e' },
  { name: 'brand-pink', label: 'Rose', hex: '#ff9fa8' },
  { name: 'brand-yellow', label: 'Jaune', hex: '#ffbf40' },
  { name: 'brand-orange', label: 'Orange', hex: '#ff6243' },
  { name: 'brand-brown', label: 'Brun', hex: '#6b3a1f' },
  { name: 'default', label: 'Par défaut', hex: null },
];

const ICON = `<svg width="17" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"></path><path d="M7 16l5-12 5 12"></path><path d="M8.5 13h7"></path></svg>`;

/**
 * Retire les spans de couleur d'un fragment/élément en conservant leur contenu.
 */
function unwrapColorSpans(root: DocumentFragment | HTMLElement) {
  const spans = root.querySelectorAll('span.cda-text-color');
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });
}

export class TextColorTool implements InlineTool {
  private api: API;
  private button: HTMLButtonElement | null = null;
  private palette: HTMLDivElement | null = null;
  private savedRange: Range | null = null;

  static get isInline() {
    return true;
  }

  static get title() {
    return 'Couleur du texte';
  }

  static get sanitize() {
    return {
      span: {
        class: true,
      },
    };
  }

  constructor({ api }: { api: API }) {
    this.api = api;
  }

  render(): HTMLElement {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add(this.api.styles.inlineToolButton);
    this.button.innerHTML = ICON;
    return this.button;
  }

  surround(range: Range) {
    if (!range) return;
    this.savedRange = range;
    if (this.palette) {
      this.palette.hidden = !this.palette.hidden;
    }
  }

  renderActions(): HTMLElement {
    this.palette = document.createElement('div');
    this.palette.className = 'cda-color-palette';
    this.palette.hidden = true;

    COLORS.forEach((color) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'cda-color-swatch';
      swatch.title = color.label;
      if (color.hex) {
        swatch.style.backgroundColor = color.hex;
      } else {
        swatch.classList.add('cda-color-swatch--default');
        swatch.textContent = '×';
      }
      // mousedown plutôt que click pour appliquer avant toute perte de focus.
      swatch.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.applyColor(color);
        if (this.palette) this.palette.hidden = true;
      });
      this.palette!.appendChild(swatch);
    });

    return this.palette;
  }

  private applyColor(color: BrandColor) {
    const range = this.savedRange;
    if (!range || range.collapsed) return;

    const fragment = range.extractContents();
    unwrapColorSpans(fragment);

    if (color.name === 'default') {
      range.insertNode(fragment);
    } else {
      const span = document.createElement('span');
      span.className = `cda-text-color cda-color-${color.name}`;
      span.appendChild(fragment);
      range.insertNode(span);
      range.selectNodeContents(span);
    }

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.api.inlineToolbar.close();
  }

  checkState(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    let node: Node | null = selection.anchorNode;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && node.classList.contains('cda-text-color')) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }
}
