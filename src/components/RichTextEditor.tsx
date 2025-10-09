import { useState, useRef } from 'react';
import { Bold, Italic, Heading2, List, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RichTextEditorProps {
  value: any[];
  onChange: (value: any[]) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addBlock = (type: 'paragraph' | 'heading' | 'image') => {
    const newBlock = {
      type,
      content: type === 'image' ? '' : '',
      ...(type === 'heading' && { level: 2 }),
      ...(type === 'image' && { url: '', alt: '', caption: '' }),
    };
    onChange([...value, newBlock]);
    setSelectedBlock(value.length);
  };

  const updateBlock = (index: number, updates: any) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], ...updates };
    onChange(newValue);
  };

  const deleteBlock = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
    setSelectedBlock(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newValue = [...value];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newValue.length) return;
    [newValue[index], newValue[targetIndex]] = [newValue[targetIndex], newValue[index]];
    onChange(newValue);
    setSelectedBlock(targetIndex);
  };

  const handleImageUpload = async (file: File, blockIndex?: number) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('page-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('page-images')
        .getPublicUrl(filePath);

      if (blockIndex !== undefined) {
        updateBlock(blockIndex, { url: publicUrl });
      } else {
        addBlock('image');
        updateBlock(value.length, { url: publicUrl });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
        <button
          type="button"
          onClick={() => addBlock('paragraph')}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Paragraphe
        </button>
        <button
          type="button"
          onClick={() => addBlock('heading')}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Heading2 className="w-4 h-4" />
          Titre
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
          disabled={uploading}
        >
          <ImageIcon className="w-4 h-4" />
          {uploading ? 'Upload...' : 'Image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />
      </div>

      <div className="space-y-4" onPaste={handlePaste}>
        {value.map((block, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 transition-all ${
              selectedBlock === index ? 'border-[#328fce] bg-blue-50' : 'border-gray-200 bg-white'
            }`}
            onClick={() => setSelectedBlock(index)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600 capitalize">{block.type}</span>
              <div className="flex gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 'up')}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ↑
                  </button>
                )}
                {index < value.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 'down')}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ↓
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteBlock(index)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {block.type === 'paragraph' && (
              <textarea
                value={block.content || ''}
                onChange={(e) => updateBlock(index, { content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none resize-none"
                rows={4}
                placeholder="Saisissez votre texte..."
              />
            )}

            {block.type === 'heading' && (
              <div className="space-y-2">
                <select
                  value={block.level || 2}
                  onChange={(e) => updateBlock(index, { level: parseInt(e.target.value) })}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                  <option value={4}>H4</option>
                </select>
                <input
                  type="text"
                  value={block.content || ''}
                  onChange={(e) => updateBlock(index, { content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none font-bold"
                  placeholder="Titre..."
                />
              </div>
            )}

            {block.type === 'image' && (
              <div className="space-y-2">
                {block.url ? (
                  <img src={block.url} alt={block.alt || ''} className="max-w-full h-auto rounded" />
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, index);
                        };
                        input.click();
                      }}
                      className="text-[#328fce] hover:text-[#84c19e]"
                    >
                      Cliquez pour choisir une image
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  value={block.alt || ''}
                  onChange={(e) => updateBlock(index, { alt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none text-sm"
                  placeholder="Texte alternatif..."
                />
                <input
                  type="text"
                  value={block.caption || ''}
                  onChange={(e) => updateBlock(index, { caption: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#328fce] focus:border-transparent outline-none text-sm"
                  placeholder="Légende (optionnelle)..."
                />
              </div>
            )}
          </div>
        ))}

        {value.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Ajoutez un bloc pour commencer à créer votre contenu
          </div>
        )}
      </div>
    </div>
  );
}
