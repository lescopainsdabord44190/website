import { OutputData } from '@editorjs/editorjs';
import { SafeHtml } from './SafeHtml';
import { AlertTriangle, Check } from 'lucide-react';

interface EditorBlock {
  type: string;
  data: {
    text?: string;
    level?: number;
    items?: Array<{ content: string; items: any[]; meta: any }> | { text: string; checked: boolean }[];
    style?: string;
    file?: { url: string };
    caption?: string;
    content?: string[][];
    title?: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
  };
}

interface EditorJSRendererProps {
  content: OutputData | null;
  className?: string;
  enableToc?: boolean;
}

export function EditorJSRenderer({ content, className = '', enableToc = false }: EditorJSRendererProps) {
  if (!content || !content.blocks || content.blocks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {content.blocks.map((blockData, index: number) => {
        const block = blockData as EditorBlock;

        if (block.type === 'paragraph' && block.data.text) {
          return (
            <SafeHtml
              key={index}
              as="p"
              className="mb-4 text-gray-700 leading-relaxed"
              html={block.data.text}
            />
          );
        }

        if (block.type === 'header' && block.data.text) {
          const HeadingTag = `h${block.data.level || 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          const isInToc = enableToc && block.data.level && block.data.level <= 3;
          const headerId = isInToc ? `heading-${index}` : undefined;
          
          return (
            <SafeHtml
              key={index}
              as={HeadingTag}
              id={headerId}
              className={`font-bold text-gray-800 mb-4 ${isInToc ? 'scroll-mt-24' : ''}`}
              html={block.data.text}
            />
          );
        }

        if (block.type === 'list' && block.data.items) {
          const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
          return (
            <ListTag
              key={index}
              className={`mb-4 ${
                block.data.style === 'ordered' ? 'list-decimal' : 'list-disc'
              } list-inside space-y-2`}
            >
              {(block.data.items as any[]).map((item: any, itemIndex: number) => {
                const content = typeof item === 'string' ? item : item.content || '';
                return (
                  <SafeHtml
                    key={itemIndex}
                    as="li"
                    className="text-gray-700"
                    html={content}
                  />
                );
              })}
            </ListTag>
          );
        }

        if (block.type === 'image' && block.data.file) {
          return (
            <div key={index} className="my-6">
              <img
                src={block.data.file.url}
                alt={block.data.caption || ''}
                className="rounded-lg shadow-md w-full h-auto"
              />
              {block.data.caption && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  {block.data.caption}
                </p>
              )}
            </div>
          );
        }

        if (block.type === 'quote') {
          const quoteText = block.data.text || '';
          return (
            <blockquote
              key={index}
              className="border-l-4 border-[#328fce] pl-4 py-2 my-6 italic bg-gray-50 rounded-r-lg"
            >
              <SafeHtml as="p" className="text-gray-700 mb-2" html={quoteText} />
              {block.data.caption && (
                <cite className="text-sm text-gray-600 not-italic">
                  — {block.data.caption}
                </cite>
              )}
            </blockquote>
          );
        }

        if (block.type === 'delimiter') {
          return (
            <div key={index} className="my-8 flex justify-center">
              <hr className="border-gray-200 border-t my-4 w-full" />
            </div>
          );
        }

        if (block.type === 'table' && block.data.content) {
          return (
            <div key={index} className="my-6 overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <tbody>
                  {block.data.content.map((row: string[], rowIndex: number) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100' : ''}>
                      {row.map((cell: string, cellIndex: number) => {
                        const CellTag = rowIndex === 0 ? 'th' : 'td';
                        return (
                          <CellTag
                            key={cellIndex}
                            className="border border-gray-300 px-4 py-2 text-left"
                          >
                            {cell}
                          </CellTag>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'warning') {
          return (
            <div
              key={index}
              className="my-6 border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  {block.data.title && (
                    <h4 className="font-bold text-yellow-900 mb-1">{block.data.title}</h4>
                  )}
                  <p className="text-yellow-800">{block.data.message}</p>
                </div>
              </div>
            </div>
          );
        }

        if (block.type === 'alert') {
          const alertType = (block.data as any).type || 'info';
          const alertStyles = {
            info: {
              container: 'border-blue-500 bg-blue-50',
              title: 'text-blue-900',
              message: 'text-blue-800',
            },
            success: {
              container: 'border-green-500 bg-green-50',
              title: 'text-green-900',
              message: 'text-green-800',
            },
            warning: {
              container: 'border-yellow-500 bg-yellow-50',
              title: 'text-yellow-900',
              message: 'text-yellow-800',
            },
            danger: {
              container: 'border-red-500 bg-red-50',
              title: 'text-red-900',
              message: 'text-red-800',
            },
          };
          const style = alertStyles[alertType as keyof typeof alertStyles] || alertStyles.info;

          return (
            <div key={index} className={`my-6 border-l-4 ${style.container} p-4 rounded-r-lg`}>
              <div>
                {block.data.title && (
                  <h4 className={`font-bold ${style.title} mb-1`}>{block.data.title}</h4>
                )}
                <p className={style.message}>{block.data.message}</p>
              </div>
            </div>
          );
        }

        if (block.type === 'checklist' && block.data.items) {
          return (
            <ul key={index} className="mb-4 space-y-2">
              {(block.data.items as { text: string; checked: boolean }[]).map(
                (item, itemIndex: number) => (
                  <li key={itemIndex} className="flex items-start gap-2">
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}
                    >
                      {item.checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span
                      className={`text-gray-700 ${
                        item.checked ? 'line-through text-gray-500' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                  </li>
                )
              )}
            </ul>
          );
        }

        return null;
      })}
    </div>
  );
}

