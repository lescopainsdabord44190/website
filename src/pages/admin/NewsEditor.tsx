import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { OutputData } from '@editorjs/editorjs';
import { RichTextEditor } from '../../components/RichTextEditor';
import {
  useNewsArticles,
  NewsStatus,
  UpsertNewsArticleInput,
} from '../../hooks/useNewsArticles';
import { useNewsCategories } from '../../hooks/useNewsCategories';
import { useNewsTags } from '../../hooks/useNewsTags';
import { slugify } from '../../lib/slugify';
import { Loader2, Save, Upload, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuthorOption {
  id: string;
  label: string;
}

const DEFAULT_CONTENT: OutputData = { time: Date.now(), blocks: [] };
const CATEGORY_COLORS = ['#328fce', '#84c19e', '#ff6243', '#ffbf40', '#ff9fa8', '#8b5cf6', '#0ea5e9'];

function toLocalInputDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function NewsEditor() {
  const navigate = useNavigate();
  const { id: articleId } = useParams();
  const isEdit = Boolean(articleId);

  const {
    fetchArticleById,
    createArticle,
    updateArticle,
    uploadNewsImage,
  } = useNewsArticles();
  const { categories, createCategory, fetchCategories } = useNewsCategories();
  const { tags, createTag, fetchTags } = useNewsTags();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<NewsStatus>('draft');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string>('');
  const [content, setContent] = useState<OutputData>(DEFAULT_CONTENT);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newTagName, setNewTagName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchAuthors();
  }, []);

  useEffect(() => {
    if (!articleId) return;
    loadArticle(articleId);
  }, [articleId]);

  const fetchAuthors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (error) throw error;

      const options: AuthorOption[] =
        data?.map((profile) => ({
          id: profile.id,
          label: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Utilisateur',
        })) ?? [];

      setAuthors(options);
    } catch (err) {
      console.error('Error fetching authors:', err);
    }
  };

  const loadArticle = async (id: string) => {
    setLoading(true);
    try {
      const { success, data } = await fetchArticleById(id);
      if (!success || !data) {
        navigate('/admin/news');
        return;
      }

      setTitle(data.title);
      setSlug(data.slug);
      setSummary(data.summary ?? '');
      setStatus(data.status);
      setCategoryId(data.category_id);
      setImageUrl(data.image_url);
      setAuthorId(data.author_id);
      setPublishedAt(toLocalInputDate(data.published_at));
      setContent(data.content ?? DEFAULT_CONTENT);
      setSelectedTagIds(data.tags.map((t) => t.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  );

  const handleSave = async () => {
    setSaving(true);
    const payload: UpsertNewsArticleInput = {
      title,
      slug,
      summary,
      content,
      status,
      category_id: categoryId,
      image_url: imageUrl,
      author_id: authorId,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      tag_ids: selectedTagIds,
    };

    const action = isEdit
      ? updateArticle(articleId as string, payload)
      : createArticle(payload);

    const { success, error } = await action;
    setSaving(false);

    if (!success) {
      console.error(error);
      alert('Impossible de sauvegarder l’article');
      return;
    }

    navigate('/admin/news');
  };

  const handleUploadImage = async (file: File) => {
    const { success, url, error } = await uploadNewsImage(file);
    if (!success || !url) {
      console.error(error);
      alert('Échec de l’upload de l’image');
      return;
    }
    setImageUrl(url);
  };

  const addNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { success, data } = await createCategory({
      name: newCategoryName.trim(),
      color: newCategoryColor,
    });
    if (success && data) {
      setCategoryId(data.id);
      setNewCategoryName('');
    }
  };

  const addNewTag = async () => {
    if (!newTagName.trim()) return;
    const { success, data } = await createTag(newTagName.trim());
    if (success && data) {
      setSelectedTagIds((prev) => Array.from(new Set([...prev, data.id])));
      setNewTagName('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement de l’article…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isEdit ? 'Modifier un article' : 'Nouvel article'}
          </h2>
          <p className="text-gray-600">Actualités / blog</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#328fce] text-white rounded-full hover:bg-[#84c19e] transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Sauvegarde…' : 'Enregistrer'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Titre</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-xl"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l’article"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border rounded-xl"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="auto-généré"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Contenu</label>
              <div className="mt-2 border rounded-2xl">
                <RichTextEditor value={content} onChange={setContent} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <select
                className="mt-1 w-full px-3 py-2 border rounded-xl"
                value={status}
                onChange={(e) => setStatus(e.target.value as NewsStatus)}
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Résumé (meta description)</label>
              <textarea
                className="mt-1 w-full px-3 py-2 border rounded-xl"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brève description pour l’aperçu et le SEO"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Catégorie</label>
              <div className="mt-1 flex gap-2">
                <select
                  className="w-full px-3 py-2 border rounded-xl"
                  value={categoryId ?? ''}
                  onChange={(e) => setCategoryId(e.target.value || null)}
                >
                  <option value="">Aucune</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 bg-gray-50 border rounded-xl p-3 space-y-3">
                <p className="text-sm font-medium text-gray-700">Créer une catégorie</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded-xl"
                    placeholder="Nom"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button
                    onClick={addNewCategory}
                    className="px-3 py-2 bg-white border rounded-xl hover:bg-gray-100"
                    type="button"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-9 h-9 rounded-full border ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-[#328fce]' : ''}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Choisir la couleur ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Image (card / og:image)</label>
              {imageUrl && (
                <img src={imageUrl} alt="Illustration" className="w-full rounded-xl border" />
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  Télécharger une image
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 border rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Supprimer l’image
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Auteur</label>
              <select
                className="w-full px-3 py-2 border rounded-xl"
                value={authorId ?? ''}
                onChange={(e) => setAuthorId(e.target.value || null)}
              >
                <option value="">Aucun</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() =>
                        setSelectedTagIds((prev) =>
                          selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        )
                      }
                      className={`px-3 py-1 rounded-full border text-sm ${
                        selected ? 'bg-[#328fce] text-white border-[#328fce]' : 'bg-white'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              {selectedTags.length > 0 && (
                <p className="text-xs text-gray-500">
                  Tags sélectionnés : {selectedTags.map((t) => t.name).join(', ')}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border rounded-xl"
                  placeholder="Nouveau tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addNewTag}
                  className="inline-flex items-center gap-1 px-3 py-2 border rounded-xl hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Date de publication</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border rounded-xl"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
