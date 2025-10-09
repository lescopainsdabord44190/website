import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface DeletePageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteOnly: () => void;
  onDeleteWithDescendants: () => void;
  pageTitle: string;
  hasDescendants: boolean;
  descendantsCount: number;
  isLoading?: boolean;
}

export function DeletePageDialog({
  isOpen,
  onClose,
  onDeleteOnly,
  onDeleteWithDescendants,
  pageTitle,
  hasDescendants,
  descendantsCount,
  isLoading = false,
}: DeletePageDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      ></div>

      <div
        ref={dialogRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Supprimer la page ?
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Vous êtes sur le point de supprimer <strong>{pageTitle}</strong>.
            </p>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {hasDescendants && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Attention :</strong> Cette page a {descendantsCount} page{descendantsCount > 1 ? 's' : ''} enfant{descendantsCount > 1 ? 's' : ''}.
            </p>
          </div>
        )}

        <div className="space-y-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>

          {hasDescendants && (
            <button
              onClick={onDeleteOnly}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isLoading ? 'Suppression...' : 'Supprimer uniquement cette page'}
            </button>
          )}

          <button
            onClick={hasDescendants ? onDeleteWithDescendants : onDeleteOnly}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isLoading 
              ? 'Suppression...' 
              : hasDescendants 
                ? 'Supprimer cette page et ses enfants' 
                : 'Supprimer cette page'
            }
          </button>
        </div>

        {hasDescendants && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            Si vous supprimez uniquement cette page, les pages enfants deviendront des pages racines.
          </p>
        )}
      </div>
    </div>
  );
}



