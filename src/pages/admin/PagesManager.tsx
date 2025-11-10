import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Plus, Edit, Trash2, FileText, Eye, GripVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { buildFullPath, type Page as PageType, triggerPagesRefetch } from '../../hooks/usePages';
import { DeletePageDialog } from '../../components/DeletePageDialog';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Page extends PageType {
  level?: number;
}

export function PagesManager() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('order_index', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const getAllDescendants = useCallback((pageId: string): string[] => {
    const descendants: string[] = [];
    const directChildren = pages.filter((p) => p.parent_id === pageId);

    directChildren.forEach((child) => {
      descendants.push(child.id);
      descendants.push(...getAllDescendants(child.id));
    });

    return descendants;
  }, [pages]);

  const togglePageStatus = useCallback(async (pageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update({ is_active: !currentStatus })
        .eq('id', pageId);

      if (error) throw error;
      await fetchPages();
      triggerPagesRefetch();
    } catch (error) {
      console.error('Error toggling page status:', error);
    }
  }, [fetchPages]);

  const openDeleteDialog = (page: Page) => {
    setPageToDelete(page);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false);
      setPageToDelete(null);
    }
  };

  const deletePageOnly = async () => {
    if (!pageToDelete) return;

    setIsDeleting(true);
    try {
      const { error: updateError } = await supabase
        .from('pages')
        .update({ parent_id: null })
        .eq('parent_id', pageToDelete.id);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageToDelete.id);

      if (deleteError) throw deleteError;

      await fetchPages();
      triggerPagesRefetch();
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting page:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const deletePageWithDescendants = async () => {
    if (!pageToDelete) return;

    setIsDeleting(true);
    try {
      const descendantIds = getAllDescendants(pageToDelete.id);
      const allIdsToDelete = [pageToDelete.id, ...descendantIds];

      const { error } = await supabase
        .from('pages')
        .delete()
        .in('id', allIdsToDelete);

      if (error) throw error;

      await fetchPages();
      triggerPagesRefetch();
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting pages:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveRect(null);
    if (!over) return;

    const activeData = active.data.current as SortablePageData | undefined;
    const overData = over.data.current as SortablePageData | DropZoneData | undefined;

    if (!activeData || activeData.type !== 'page') {
      return;
    }

    const activePage = activeData.page;

    if (overData?.type === 'dropzone') {
      const targetParentId = overData.parentId ?? null;
      const newIndexRaw = overData.index;
      const currentParentId = activePage.parent_id;
      const previousPages = pages;

      if (targetParentId === currentParentId) {
        const siblings = pages
          .filter((page) => page.parent_id === currentParentId)
          .sort((a, b) => a.order_index - b.order_index);

        const oldIndex = siblings.findIndex((page) => page.id === activePage.id);
        if (oldIndex === -1) {
          return;
        }

        const withoutActive = siblings.filter((page) => page.id !== activePage.id);
        const maxIndex = withoutActive.length;
        let insertIndex = Math.max(0, Math.min(newIndexRaw, maxIndex));

        if (oldIndex < newIndexRaw) {
          insertIndex = Math.max(0, Math.min(newIndexRaw - 1, maxIndex));
        }

        if (oldIndex === insertIndex) {
          return;
        }

        const reordered = [
          ...withoutActive.slice(0, insertIndex),
          activePage,
          ...withoutActive.slice(insertIndex),
        ];

        const orderMap = new Map(reordered.map((item, idx) => [item.id, idx] as const));

        setPages((prev) =>
          prev.map((page) =>
            orderMap.has(page.id)
              ? { ...page, order_index: orderMap.get(page.id)! }
              : page
          )
        );

        setIsReordering(true);
        const updates = reordered.map((item, idx) => ({ id: item.id, order_index: idx }));
        const { error } = await supabase.rpc('reorder_pages', { _updates: updates });
        setIsReordering(false);

        if (error) {
          console.error('Error reordering pages:', error);
          setPages(previousPages);
        } else {
          triggerPagesRefetch();
        }
        return;
      } else {
        const oldParentId = activePage.parent_id;
        const targetSiblings = pages
          .filter((page) => page.parent_id === targetParentId && page.id !== activePage.id)
          .sort((a, b) => a.order_index - b.order_index);
        const maxTargetIndex = targetSiblings.length;
        const clampedIndex = Math.max(0, Math.min(newIndexRaw, maxTargetIndex));

        const newTargetOrder = [
          ...targetSiblings.slice(0, clampedIndex),
          { ...activePage, parent_id: targetParentId },
          ...targetSiblings.slice(clampedIndex),
        ];
        const targetOrderMap = new Map(newTargetOrder.map((item, idx) => [item.id, idx] as const));

        const oldSiblings = pages
          .filter((page) => page.parent_id === oldParentId && page.id !== activePage.id)
          .sort((a, b) => a.order_index - b.order_index);
        const oldOrderMap = new Map(oldSiblings.map((item, idx) => [item.id, idx] as const));

        setPages((prev) =>
          prev.map((page) => {
            if (page.id === activePage.id) {
              return { ...page, parent_id: targetParentId, order_index: clampedIndex };
            }
            if (page.parent_id === oldParentId && oldOrderMap.has(page.id)) {
              return { ...page, order_index: oldOrderMap.get(page.id)! };
            }
            if (page.parent_id === targetParentId && targetOrderMap.has(page.id)) {
              return { ...page, order_index: targetOrderMap.get(page.id)! };
            }
            return page;
          })
        );

        setIsReordering(true);
        const { error } = await supabase.rpc('move_page', {
          _page_id: activePage.id,
          _new_parent_id: targetParentId,
          _new_order_index: clampedIndex,
        });
        setIsReordering(false);

        if (error) {
          console.error('Error moving page:', error);
          setPages(previousPages);
        } else {
          triggerPagesRefetch();
        }
        return;
      }
    }

    const overPageData = overData as SortablePageData | undefined;
    if (!overPageData || overPageData.type !== 'page') {
      return;
    }

    const overPage = overPageData.page;

    if (activePage.parent_id !== overPage.parent_id || activePage.id === overPage.id) {
      return;
    }

    const siblings = pages
      .filter((page) => page.parent_id === activePage.parent_id)
      .sort((a, b) => a.order_index - b.order_index);

    const oldIndex = siblings.findIndex((page) => page.id === activePage.id);
    const newIndex = siblings.findIndex((page) => page.id === overPage.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const previousPages = pages;
    const reordered = arrayMove(siblings, oldIndex, newIndex);
    const orderMap = new Map(reordered.map((item, idx) => [item.id, idx] as const));

    setPages((prev) =>
      prev.map((page) =>
        orderMap.has(page.id)
          ? { ...page, order_index: orderMap.get(page.id)! }
          : page
      )
    );

    setIsReordering(true);
    const updates = reordered.map((item, idx) => ({ id: item.id, order_index: idx }));
    const { error } = await supabase.rpc('reorder_pages', { _updates: updates });
    setIsReordering(false);

    if (error) {
      console.error('Error reordering pages:', error);
      setPages(previousPages);
    } else {
      triggerPagesRefetch();
    }
  }, [pages, triggerPagesRefetch]);

  const renderChildren = useCallback((parentId: string | null, level: number): ReactNode => {
    const siblings = pages
      .filter((page) => page.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index);

    return (
      <SortableContext
        items={siblings.map((page) => page.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          <PageDropZone parentId={parentId} index={0} isEmpty={siblings.length === 0} activeRect={activeRect} />
          {siblings.map((page, idx) => {
            const childNodes = renderChildren(page.id, level + 1);
            const fullPath = buildFullPath(page.id, pages);
            const previousSiblingId = idx > 0 ? siblings[idx - 1].id : null;

            return (
              <div key={page.id} className="space-y-1">
                <PageTreeItem
                  page={page}
                  level={level}
                  isReordering={isReordering}
                  onToggleStatus={() => togglePageStatus(page.id, page.is_active)}
                  onEdit={() => navigate(`/admin/pages/${page.id}/edit`)}
                  onDelete={() => openDeleteDialog(page)}
                  fullPath={fullPath}
                />
                {childNodes && <div className="pl-6 space-y-2">{childNodes}</div>}
                <PageDropZone parentId={parentId} index={idx + 1} activeRect={activeRect} previousSiblingId={previousSiblingId} />
              </div>
            );
          })}
        </div>
      </SortableContext>
    );
  }, [pages, isReordering, navigate, togglePageStatus, openDeleteDialog, activeRect]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des pages</h2>
        <button
          onClick={() => navigate('/admin/pages/new')}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouvelle page
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto"></div>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Aucune page créée pour le moment</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            const pageData = event.active.data.current as SortablePageData | undefined;
            if (pageData?.type === 'page') {
              const element = document.querySelector(`[data-page-item="${pageData.page.id}"]`);
              if (element instanceof HTMLElement) {
                setActiveRect({ width: element.offsetWidth, height: element.offsetHeight });
              }
            }
          }}
          onDragEnd={(event) => {
            setActiveRect(null);
            handleDragEnd(event);
          }}
          onDragCancel={() => {
            setActiveRect(null);
          }}
        >
          <div className="space-y-3">
            {renderChildren(null, 0)}
          </div>
        </DndContext>
      )}

      <DeletePageDialog
        isOpen={deleteDialogOpen}
        onClose={closeDeleteDialog}
        onDeleteOnly={deletePageOnly}
        onDeleteWithDescendants={deletePageWithDescendants}
        pageTitle={pageToDelete?.title || ''}
        hasDescendants={pageToDelete ? getAllDescendants(pageToDelete.id).length > 0 : false}
        descendantsCount={pageToDelete ? getAllDescendants(pageToDelete.id).length : 0}
        isLoading={isDeleting}
      />
    </div>
  );
}

interface SortablePageData {
  type: 'page';
  page: Page;
}

interface DropZoneData {
  type: 'dropzone';
  parentId: string | null;
  index: number;
}

interface PageDropZoneProps {
  parentId: string | null;
  index: number;
  isEmpty?: boolean;
  activeRect: { width: number; height: number } | null;
  previousSiblingId?: string | null;
}

function PageDropZone({ parentId, index, isEmpty = false, activeRect }: PageDropZoneProps) {
  const { setNodeRef, isOver, active, over } = useDroppable({
    id: `dropzone-${parentId ?? 'root'}-${index}`,
    data: { type: 'dropzone', parentId, index } satisfies DropZoneData,
  });
  const isDragging = Boolean(active);

  if (!isDragging && !isEmpty) {
    return <div ref={setNodeRef} className="h-0" />;
  }

  const width = activeRect?.width ?? 320;

  let displayMode: 'hidden' | 'sibling' | 'child-empty' | 'child-hover' = 'hidden';

  if (isEmpty) {
    displayMode = 'child-empty';
  }

  if (isOver && over?.id === `dropzone-${parentId ?? 'root'}-${index}`) {
    const pointer = (over?.data.current as any)?.pointerOffset;
    const x = pointer?.x ?? 0;
    const siblingZone = width * (isEmpty ? 1 : 0.33);

    if (!isEmpty && x <= siblingZone) {
      displayMode = 'sibling';
    } else {
      displayMode = 'child-hover';
    }
  }

  if (!isOver && !isEmpty) {
    displayMode = 'hidden';
  }

  const styles: Record<typeof displayMode, string> = {
    hidden: 'h-0',
    sibling: 'h-3 bg-[#328fce]/30 border border-dashed border-[#328fce] rounded-full mx-4',
    'child-empty': 'h-10 bg-gray-50/70 border border-dashed border-gray-300 rounded-lg mx-8',
    'child-hover': 'h-12 bg-[#328fce]/12 border border-[#328fce] rounded-lg mx-8',
  };

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${styles[displayMode]}`}
    ></div>
  );
}

interface PageTreeItemProps {
  page: Page;
  level: number;
  isReordering: boolean;
  onToggleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
  fullPath: string;
}

function PageTreeItem({
  page,
  level,
  isReordering,
  onToggleStatus,
  onEdit,
  onDelete,
  fullPath,
}: PageTreeItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    data: { type: 'page', page } satisfies SortablePageData,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    boxShadow: isDragging ? '0 8px 22px rgba(50, 143, 206, 0.18)' : undefined,
    marginLeft: level > 0 ? level * 24 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      data-page-item={page.id}
      style={style}
      className="bg-white border border-gray-200 rounded-xl shadow-sm"
    >
      <div className="flex items-start gap-4 p-4">
        <button
          type="button"
          className={`mt-1 text-gray-400 hover:text-[#328fce] transition-colors ${
            isReordering ? 'cursor-not-allowed opacity-50' : 'cursor-grab'
          }`}
          disabled={isReordering}
          {...attributes}
          {...listeners}
          aria-label="Réorganiser la page"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-800 truncate">{page.title}</h3>
            <span className="text-sm text-gray-500 truncate">/{page.slug}</span>
            {!page.is_active && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                Désactivée
              </span>
            )}
            {!page.show_in_menu && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                Cachée du menu principal
              </span>
            )}
            {(page as any).show_in_footer && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Menu footer
              </span>
            )}
          </div>
          {page.meta_description && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{page.meta_description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStatus}
            disabled={isReordering}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              page.is_active ? 'bg-[#328fce]' : 'bg-gray-300'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            title={page.is_active ? 'Désactiver' : 'Activer'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                page.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <Link
            to={fullPath}
            className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            title="Voir la page"
          >
            <Eye className="w-5 h-5" />
          </Link>
          <button
            onClick={onEdit}
            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            title="Modifier"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
