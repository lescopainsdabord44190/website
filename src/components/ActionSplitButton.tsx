import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SplitButtonAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

interface ActionSplitButtonProps {
  primaryLabel: string;
  primaryIcon: ReactNode;
  onPrimaryClick: () => void;
  menuActions: SplitButtonAction[];
  disabled?: boolean;
}

export function ActionSplitButton({
  primaryLabel,
  primaryIcon,
  onPrimaryClick,
  menuActions,
  disabled = false,
}: ActionSplitButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const toggleMenu = () => {
    if (disabled) return;
    setOpen((value) => !value);
  };

  const handlePrimaryClick = () => {
    if (disabled) return;
    setOpen(false);
    onPrimaryClick();
  };

  const handleMenuAction = (action: SplitButtonAction) => {
    if (action.disabled) return;
    setOpen(false);
    action.onClick();
  };

  return (
    <div ref={containerRef} className="relative flex rounded-lg shadow-sm">
      <button
        type="button"
        onClick={handlePrimaryClick}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-l-lg"
      >
        {primaryIcon}
        <span className="text-sm font-medium">{primaryLabel}</span>
      </button>
      <button
        type="button"
        onClick={toggleMenu}
        disabled={disabled}
        className="px-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors rounded-r-lg border-l border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 z-40">
          {menuActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleMenuAction(action)}
              disabled={action.disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${action.className ?? ''} ${
                action.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {action.icon}
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

