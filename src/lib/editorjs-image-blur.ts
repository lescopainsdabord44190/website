import type { API } from '@editorjs/editorjs';
import ImageTool from '@editorjs/image';

type ImageToolConfig = {
  uploader?: {
    uploadByFile?: (file: File) => Promise<{ success: number; file?: { url: string } }>;
  };
};

type ImageToolConstructorArgs = {
  data?: Record<string, unknown>;
  api: API;
  config?: ImageToolConfig;
  readOnly?: boolean;
  block?: unknown;
};

type BlurState = {
  isDrawing: boolean;
  brushSize: number;
  mode: 'blur' | 'emoji';
  emojiRotation: number;
  emojiChar: string;
};

export class ImageBlurTool extends (ImageTool as unknown as {
  new (args: ImageToolConstructorArgs): any;
}) {
  private api: API;
  private config?: ImageToolConfig;
  private readOnly: boolean;
  private overlay: HTMLElement | null = null;
  private activeBlockId: string | null = null;
  private blurState: BlurState = {
    isDrawing: false,
    brushSize: 15,
    mode: 'blur',
    emojiRotation: 0,
    emojiChar: '😜',
  };

  constructor({ data, api, config, readOnly, block }: ImageToolConstructorArgs) {
    super({ data, api, config, readOnly, block });
    this.api = api;
    this.config = config;
    this.readOnly = Boolean(readOnly);
  }

  renderSettings() {
    const settings = (ImageTool as unknown as { prototype: { renderSettings?: () => unknown[] } })
      .prototype.renderSettings?.call(this) || [];

    return [
      ...settings,
      {
        icon: this.getBlurIcon(),
        label: 'Flouter l\'image',
        closeOnActivate: true,
        onActivate: () => {
          if (!this.readOnly) {
            void this.openBlurEditor();
          }
        },
      },
    ];
  }

  private getBlurIcon() {
    return (
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
      'xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 4a8 8 0 1 0 8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M16 4h4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M7 12h1M10 12h1M13 12h1M16 12h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>'
    );
  }

  private getCurrentImageUrl(): string | null {
    const data = (this as unknown as { data?: { file?: { url?: string } } }).data;
    if (data?.file?.url) {
      return data.file.url;
    }

    const blockIndex = this.api.blocks.getCurrentBlockIndex();
    const block = this.api.blocks.getBlockByIndex(blockIndex);
    const imageElement = block?.holder?.querySelector('img') as HTMLImageElement | null;
    return imageElement?.src || null;
  }

  private async openBlurEditor() {
    if (this.overlay) return;
    const imageUrl = this.getCurrentImageUrl();
    if (!imageUrl) return;

    const blockIndex = this.api.blocks.getCurrentBlockIndex();
    const block = this.api.blocks.getBlockByIndex(blockIndex);
    this.activeBlockId = block?.id || null;

    const overlay = document.createElement('div');
    overlay.className = 'editorjs-image-blur-overlay';

    const panel = document.createElement('div');
    panel.className = 'editorjs-image-blur-panel';

    const header = document.createElement('div');
    header.className = 'editorjs-image-blur-header';
    header.innerHTML = '<h3>Edition visage</h3><p>Choisissez un mode puis restez appuye et frottez.</p>';

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'editorjs-image-blur-canvas-wrapper';

    const canvas = document.createElement('canvas');
    canvas.className = 'editorjs-image-blur-canvas';
    canvasWrapper.appendChild(canvas);

    const brushPreview = document.createElement('div');
    brushPreview.className = 'editorjs-image-blur-brush';
    canvasWrapper.appendChild(brushPreview);

    const controls = document.createElement('div');
    controls.className = 'editorjs-image-blur-controls';

    const modeGroup = document.createElement('div');
    modeGroup.className = 'editorjs-image-blur-mode';

    const blurModeButton = document.createElement('button');
    blurModeButton.type = 'button';
    blurModeButton.className = 'editorjs-image-blur-toggle active';
    blurModeButton.textContent = 'Floutage';

    const emojiModeButton = document.createElement('button');
    emojiModeButton.type = 'button';
    emojiModeButton.className = 'editorjs-image-blur-toggle';
    emojiModeButton.textContent = 'Emoji';

    modeGroup.appendChild(blurModeButton);
    modeGroup.appendChild(emojiModeButton);

    const sizeGroup = document.createElement('label');
    sizeGroup.className = 'editorjs-image-blur-size';
    sizeGroup.textContent = 'Taille';

    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.min = '1';
    sizeInput.max = '100';
    sizeInput.value = String(this.blurState.brushSize);
    sizeInput.addEventListener('input', () => {
      this.blurState.brushSize = Number(sizeInput.value);
    });
    sizeGroup.appendChild(sizeInput);

    const rotationGroup = document.createElement('div');
    rotationGroup.className = 'editorjs-image-blur-size editorjs-image-blur-rotation';

    const rotationLabel = document.createElement('span');
    rotationLabel.textContent = 'Rotation emoji';
    rotationGroup.appendChild(rotationLabel);

    const rotationPreview = document.createElement('span');
    rotationPreview.className = 'editorjs-image-blur-emoji-preview';
    rotationPreview.textContent = this.blurState.emojiChar;

    const rotationInput = document.createElement('input');
    rotationInput.type = 'range';
    rotationInput.min = '-180';
    rotationInput.max = '180';
    rotationInput.value = String(this.blurState.emojiRotation);
    rotationInput.addEventListener('input', () => {
      this.blurState.emojiRotation = Number(rotationInput.value);
      rotationPreview.style.transform = `rotate(${this.blurState.emojiRotation}deg)`;
    });
    rotationPreview.style.transform = `rotate(${this.blurState.emojiRotation}deg)`;
    rotationGroup.appendChild(rotationInput);
    rotationGroup.appendChild(rotationPreview);

    const emojiPicker = document.createElement('div');
    emojiPicker.className = 'editorjs-image-blur-emoji-picker';
    const emojiList = [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
      '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
      '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
      '🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥',
      '😌','😔','😪','🤤','😴','😵','🤓','😎','🥳','😤',
    ];

    const closeEmojiPicker = () => {
      emojiPicker.classList.remove('open');
    };

    const openEmojiPicker = () => {
      emojiPicker.classList.add('open');
    };

    rotationPreview.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (emojiPicker.classList.contains('open')) {
        closeEmojiPicker();
        return;
      }
      openEmojiPicker();
    });

    const actions = document.createElement('div');
    actions.className = 'editorjs-image-blur-actions';

    const undoButton = document.createElement('button');
    undoButton.type = 'button';
    undoButton.className = 'editorjs-image-blur-button secondary';
    undoButton.textContent = 'Revenir en arriere';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'editorjs-image-blur-button secondary';
    cancelButton.textContent = 'Annuler';

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = 'editorjs-image-blur-button primary';
    applyButton.textContent = 'Appliquer';

    actions.appendChild(undoButton);
    actions.appendChild(cancelButton);
    actions.appendChild(applyButton);

    controls.appendChild(modeGroup);
    controls.appendChild(sizeGroup);
    controls.appendChild(rotationGroup);
    controls.appendChild(actions);

    panel.appendChild(header);
    panel.appendChild(canvasWrapper);
    panel.appendChild(controls);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.overlay = overlay;

    const suppressOnce = () => {
      setTimeout(() => {
        // no-op placeholder to keep behavior consistent
      }, 0);
    };

    panel.addEventListener('pointerdown', (event) => {
      suppressOnce();
      event.stopPropagation();
    });
    panel.addEventListener('click', (event) => {
      suppressOnce();
      event.stopPropagation();
    });

    let objectUrlToRevoke: string | null = null;
    const cleanup = () => {
      this.overlay?.remove();
      this.overlay = null;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        objectUrlToRevoke = null;
      }
    };

    cancelButton.addEventListener('click', cleanup);
    overlay.addEventListener('pointerdown', (event) => {
      const path = event.composedPath();
      if (path.includes(panel)) {
        suppressOnce();
        return;
      }
      if (event.target === overlay) {
        cleanup();
      }
    });

    try {
      const { image, objectUrl } = await this.loadImage(imageUrl);
      objectUrlToRevoke = objectUrl;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.drawImage(image, 0, 0);

      const history: ImageData[] = [];
      const pushHistory = () => {
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        undoButton.disabled = history.length <= 1;
      };

      const restoreLastHistory = () => {
        if (history.length <= 1) return;
        history.pop();
        const last = history[history.length - 1];
        ctx.putImageData(last, 0, 0);
        undoButton.disabled = history.length <= 1;
      };

      pushHistory();

      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = image.naturalWidth;
      blurCanvas.height = image.naturalHeight;
      const blurCtx = blurCanvas.getContext('2d');
      if (!blurCtx) return;
      blurCtx.filter = 'blur(8px)';
      blurCtx.drawImage(image, 0, 0);

      const applyBlurAt = (x: number, y: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, this.blurState.brushSize, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(blurCanvas, 0, 0);
        ctx.restore();
      };

      const applyEmojiAt = (x: number, y: number) => {
        const rotationRadians = (this.blurState.emojiRotation * Math.PI) / 180;
        const fontSize = Math.max(10, this.blurState.brushSize * 2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotationRadians);
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.blurState.emojiChar, 0, 0);
        ctx.restore();
      };

      const applyEffectAt = (x: number, y: number) => {
        if (this.blurState.mode === 'emoji') {
          applyEmojiAt(x, y);
          return;
        }
        applyBlurAt(x, y);
      };

      const getCanvasPoint = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
          displayScale: scaleX,
        };
      };

      const updateBrushPreview = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const { displayScale } = getCanvasPoint(event);
        const displaySize = (this.blurState.brushSize * 2) / displayScale;
        brushPreview.style.width = `${displaySize}px`;
        brushPreview.style.height = `${displaySize}px`;
        brushPreview.style.left = `${event.clientX - rect.left - displaySize / 2}px`;
        brushPreview.style.top = `${event.clientY - rect.top - displaySize / 2}px`;
      };

      let strokeHasDrawn = false;
      const onPointerDown = (event: PointerEvent) => {
        this.blurState.isDrawing = true;
        canvas.setPointerCapture(event.pointerId);
        strokeHasDrawn = false;
        const { x, y } = getCanvasPoint(event);
        applyEffectAt(x, y);
        strokeHasDrawn = true;
        updateBrushPreview(event);
      };

      const onPointerMove = (event: PointerEvent) => {
        updateBrushPreview(event);
        if (!this.blurState.isDrawing) return;
        const { x, y } = getCanvasPoint(event);
        applyEffectAt(x, y);
        strokeHasDrawn = true;
      };

      const onPointerUp = () => {
        this.blurState.isDrawing = false;
        if (strokeHasDrawn) {
          pushHistory();
          strokeHasDrawn = false;
        }
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointerleave', onPointerUp);

      const updateModeButtons = () => {
        const isEmoji = this.blurState.mode === 'emoji';
        blurModeButton.classList.toggle('active', !isEmoji);
        emojiModeButton.classList.toggle('active', isEmoji);
        rotationGroup.style.display = isEmoji ? 'flex' : 'none';
        if (!isEmoji) {
          closeEmojiPicker();
        }
      };

      blurModeButton.addEventListener('click', () => {
        this.blurState.mode = 'blur';
        updateModeButtons();
      });

      emojiModeButton.addEventListener('click', () => {
        this.blurState.mode = 'emoji';
        updateModeButtons();
      });

      updateModeButtons();

      undoButton.addEventListener('click', restoreLastHistory);

      emojiList.forEach((emoji) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'editorjs-image-blur-emoji-option';
        button.textContent = emoji;
        button.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          event.stopPropagation();
          suppressOnce();
          this.blurState.emojiChar = emoji;
          rotationPreview.textContent = emoji;
          closeEmojiPicker();
        });
        emojiPicker.appendChild(button);
      });

      rotationGroup.appendChild(emojiPicker);
      emojiPicker.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });

      document.addEventListener('pointerdown', (event) => {
        if (!emojiPicker.classList.contains('open')) return;
        const path = event.composedPath();
        if (path.includes(rotationPreview) || path.includes(emojiPicker)) return;
        closeEmojiPicker();
      }, true);

      applyButton.addEventListener('click', async () => {
        const mime = this.getOutputMime(imageUrl);
        const quality = mime === 'image/jpeg' ? 0.92 : undefined;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, mime, quality)
        );
        if (!blob) return;

        const file = new File([blob], this.getOutputFileName(imageUrl, mime), { type: mime });
        const uploadResult = await this.uploadBlurredFile(file);
        if (uploadResult?.success && uploadResult.file?.url) {
          this.updateImageData(uploadResult.file.url);
          cleanup();
        }
      });

    } catch (error) {
      console.error('Error opening blur editor:', error);
      cleanup();
    }
  }

  private async loadImage(imageUrl: string) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = objectUrl;
    });

    return { image, objectUrl };
  }

  private getOutputMime(imageUrl: string) {
    const lower = imageUrl.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  private getOutputFileName(imageUrl: string, mime: string) {
    const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const baseName = imageUrl.split('/').pop()?.split('?')[0] || `image-${Date.now()}`;
    const sanitized = baseName.replace(/\.[a-z0-9]+$/i, '');
    return `${sanitized}-blur.${extension}`;
  }

  private async uploadBlurredFile(file: File) {
    if (!this.config?.uploader?.uploadByFile) {
      console.error('Image uploader is not configured.');
      return null;
    }
    try {
      return await this.config.uploader.uploadByFile(file);
    } catch (error) {
      console.error('Error uploading blurred image:', error);
      return null;
    }
  }

  private updateImageData(url: string) {
    const self = this as unknown as { data?: { file?: { url?: string } } };
    const data = self.data || {};
    data.file = { url };
    self.data = data;

    const blockIndex = this.api.blocks.getCurrentBlockIndex();
    const block = this.api.blocks.getBlockByIndex(blockIndex);
    const holderById = this.activeBlockId
      ? (document.querySelector(`[data-id="${this.activeBlockId}"]`) as HTMLElement | null)
      : null;
    const holder = holderById || block?.holder || null;
    const imageElement = holder?.querySelector('img') as HTMLImageElement | null;
    if (imageElement) {
      imageElement.src = url;
    }

    if (block?.id) {
      this.api.blocks.update(block.id, data);
    }

    if (holder) {
      const removeDuplicates = () => {
        const images = Array.from(holder.querySelectorAll('img'));
        if (images.length <= 1) return;
        let kept = false;
        images.forEach((img) => {
          if (!kept) {
            kept = true;
            img.src = url;
            return;
          }
          img.remove();
        });

        const imageWrapper = holder.querySelector('.image-tool__image');
        if (imageWrapper) {
          const wrapperImages = Array.from(imageWrapper.querySelectorAll('img'));
          let keptWrapper = false;
          wrapperImages.forEach((img) => {
            if (!keptWrapper) {
              keptWrapper = true;
              img.src = url;
              return;
            }
            img.remove();
          });
        }
      };

      requestAnimationFrame(removeDuplicates);
      setTimeout(removeDuplicates, 50);
      setTimeout(removeDuplicates, 200);

      const observer = new MutationObserver(() => {
        removeDuplicates();
      });
      observer.observe(holder, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 1000);
    }
  }
}
