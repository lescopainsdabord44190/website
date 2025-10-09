import { OutputData } from '@editorjs/editorjs';

interface OldBlock {
  type: string;
  content?: string;
  level?: number;
  url?: string;
  caption?: string;
  alt?: string;
}

export function migrateOldContentToEditorJS(oldContent: unknown): OutputData | null {
  if (!oldContent) return null;
  
  if (typeof oldContent === 'object' && oldContent !== null && 'blocks' in oldContent && Array.isArray((oldContent as OutputData).blocks)) {
    return oldContent as OutputData;
  }

  if (!Array.isArray(oldContent)) return null;

  const blocks = (oldContent as OldBlock[]).map((block: OldBlock) => {
    if (block.type === 'paragraph') {
      return {
        type: 'paragraph',
        data: {
          text: block.content || '',
        },
      };
    }

    if (block.type === 'heading') {
      return {
        type: 'header',
        data: {
          text: block.content || '',
          level: block.level || 2,
        },
      };
    }

    if (block.type === 'image') {
      return {
        type: 'image',
        data: {
          file: {
            url: block.url || '',
          },
          caption: block.caption || '',
          withBorder: false,
          stretched: false,
          withBackground: false,
        },
      };
    }

    return null;
  }).filter(Boolean);

  return {
    time: Date.now(),
    blocks,
    version: '2.28.2',
  };
}

export function isEditorJSFormat(content: unknown): boolean {
  return content !== null && typeof content === 'object' && 'blocks' in content && Array.isArray((content as OutputData).blocks);
}

