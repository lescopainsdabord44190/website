import { useEffect, useRef, useCallback, useState } from 'react';
import EditorJS, { OutputData } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import ImageTool from '@editorjs/image';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Table from '@editorjs/table';
import Warning from '@editorjs/warning';
import Checklist from '@editorjs/checklist';
import Paragraph from '@editorjs/paragraph';
import { supabase } from '../lib/supabase';
import { Alert } from '../lib/editorjs-alert';
import { AnimListTool } from '../lib/editorjs-anim-list';
import { CarouselTool } from '../lib/editorjs-carousel';

interface RichTextEditorProps {
  value: OutputData | null;
  onChange: (value: OutputData) => void;
}

let editorIdCounter = 0;
const editorInstances = new Map<string, boolean>();

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const [editorId] = useState(() => `editorjs-${++editorIdCounter}`);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const isInitialized = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleChange = useCallback(async () => {
    if (editorRef.current) {
      try {
        const outputData = await editorRef.current.save();
        onChangeRef.current(outputData);
      } catch (e) {
        console.error('Error saving editor data:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current || editorInstances.has(editorId)) return;
    
    editorInstances.set(editorId, true);
    let isMounted = true;
    
    const initEditor = async () => {
      // Attendre que le DOM soit prêt
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (!isMounted) return;
      
      const holderElement = document.getElementById(editorId);
      if (!holderElement) {
        editorInstances.delete(editorId);
        return;
      }
      
      // Vérifier si l'éditeur n'est pas déjà initialisé dans ce holder
      if (holderElement.children.length > 0) {
        isInitialized.current = true;
        return;
      }

      const editor = new EditorJS({
        holder: editorId,
        data: valueRef.current || undefined,
        placeholder: 'Commencez à écrire votre contenu...',
        tools: {
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
          carousel: {
            class: CarouselTool,
          },
        },
        onChange: handleChange,
      });

      try {
        await editor.isReady;
        editorRef.current = editor;
        isInitialized.current = true;
      } catch (e) {
        console.error('Error initializing editor:', e);
      }
    };

    initEditor();

    return () => {
      isMounted = false;
      isInitialized.current = false;
      editorInstances.delete(editorId);
      
      if (editorRef.current) {
        const currentEditor = editorRef.current;
        currentEditor.isReady
          .then(() => {
            if (currentEditor.destroy) {
              currentEditor.destroy();
            }
            editorRef.current = null;
          })
          .catch((e) => {
            console.error('Error in cleanup:', e);
            editorRef.current = null;
          });
      }
    };
  }, [editorId, handleChange]);

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white min-h-[400px]">
      <div id={editorId} />
    </div>
  );
}
