import { useState } from 'react';
import { Button } from './button';
import { 
  ImagePlus, Search, GitMerge, Pencil, Check, X, 
  Loader2, Wand2, RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InlineActionProps {
  onAction: () => Promise<void> | void;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

// Generic inline action button with loading state
export const InlineAction = ({ 
  onAction, 
  label, 
  icon, 
  variant = 'ghost',
  size = 'sm',
  className 
}: InlineActionProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await onAction();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={cn("h-7 text-xs gap-1", className)}
    >
      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </Button>
  );
};

// Fix Image action
export const FixImageAction = ({ 
  itemName, 
  onFix 
}: { 
  itemName: string; 
  onFix: () => Promise<void> | void;
}) => (
  <InlineAction
    icon={<ImagePlus className="w-3 h-3" />}
    label="Fix Image"
    onAction={onFix}
    className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
  />
);

// Find Match action
export const FindMatchAction = ({ 
  itemName, 
  onSearch 
}: { 
  itemName: string; 
  onSearch: () => Promise<void> | void;
}) => (
  <InlineAction
    icon={<Search className="w-3 h-3" />}
    label="Find Match"
    onAction={onSearch}
    className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
  />
);

// Merge Duplicate action
export const MergeDuplicateAction = ({ 
  onMerge 
}: { 
  onMerge: () => Promise<void> | void;
}) => (
  <InlineAction
    icon={<GitMerge className="w-3 h-3" />}
    label="Merge"
    onAction={onMerge}
    className="text-purple-500 hover:text-purple-600 hover:bg-purple-500/10"
  />
);

// Auto-fix action with magic wand
export const AutoFixAction = ({ 
  onAutoFix,
  label = "Auto-Fix"
}: { 
  onAutoFix: () => Promise<void> | void;
  label?: string;
}) => (
  <InlineAction
    icon={<Wand2 className="w-3 h-3" />}
    label={label}
    onAction={onAutoFix}
    variant="outline"
    className="text-primary hover:text-primary hover:bg-primary/10"
  />
);

// Inline edit component with confirm/cancel
interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}

export const InlineEdit = ({ 
  value: initialValue, 
  onSave, 
  placeholder = "Enter value...",
  className 
}: InlineEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(value);
      setIsEditing(false);
      toast.success('Saved successfully');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          "group flex items-center gap-1 text-left hover:text-primary transition-colors",
          className
        )}
      >
        <span>{value || placeholder}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="px-2 py-1 text-sm bg-secondary rounded border border-border focus:border-primary outline-none"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        disabled={isLoading}
        className="h-7 w-7"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3 text-gain" />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCancel}
        className="h-7 w-7"
      >
        <X className="w-3 h-3 text-loss" />
      </Button>
    </div>
  );
};

// Refresh data action
export const RefreshAction = ({ 
  onRefresh,
  label = "Refresh"
}: { 
  onRefresh: () => Promise<void> | void;
  label?: string;
}) => (
  <InlineAction
    icon={<RefreshCw className="w-3 h-3" />}
    label={label}
    onAction={onRefresh}
  />
);
