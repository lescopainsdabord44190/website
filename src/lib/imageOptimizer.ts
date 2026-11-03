export interface OptimizeImageOptions {
  /** Largeur maximale en pixels (défaut : 1600px — couvre un affichage Retina 2x sur la colonne Hero de 720px) */
  maxWidth?: number;
  /** Hauteur maximale en pixels (défaut : 1200px) */
  maxHeight?: number;
  /** Qualité de compression entre 0 et 1 (défaut : 0.82) */
  quality?: number;
  /** Format de sortie privilégié (défaut : image/webp avec fallback image/jpeg) */
  mimeType?: 'image/webp' | 'image/jpeg';
}

export interface OptimizedImageResult {
  file: File;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  compressedSize: number;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Redimensionne et compresse une image côté client avant upload vers Supabase Storage.
 * Par défaut : max 1600×1200 px, format WebP à 82% de qualité (~120–250 Ko pour une photo Hero).
 */
export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1200,
    quality = 0.82,
    mimeType = 'image/webp',
  } = options;

  const img = await loadImageElement(file);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;

  // Calcul des nouvelles dimensions en conservant le ratio (sans agrandir une image plus petite)
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossible d’initialiser le contexte Canvas 2D');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Encodage WebP (avec fallback JPEG si WebP non supporté par le navigateur)
  let blob = await canvasToBlob(canvas, mimeType, quality);
  let finalMime = mimeType;

  if (!blob || blob.type !== mimeType) {
    finalMime = 'image/jpeg';
    blob = await canvasToBlob(canvas, finalMime, quality);
  }

  if (!blob) {
    throw new Error('Échec de la compression de l’image');
  }

  const ext = finalMime === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const optimizedFile = new File([blob], `${baseName}.${ext}`, {
    type: finalMime,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    width: targetWidth,
    height: targetHeight,
    originalWidth,
    originalHeight,
    originalSize: file.size,
    compressedSize: optimizedFile.size,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} Ko`;
  const mb = kb / 1024;
  return `${mb.toFixed(2).replace('.', ',')} Mo`;
}
