import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface BulkActionToolbarProps {
  selectedCount: number;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  onClear: () => void;
  approveLabel?: string;
  rejectLabel?: string;
  deleteLabel?: string;
}

export function BulkActionToolbar({
  selectedCount,
  onApprove,
  onReject,
  onDelete,
  onClear,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  deleteLabel = 'Delete',
}: BulkActionToolbarProps) {
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'delete' | null>(null);

  if (selectedCount === 0) return null;

  const handleConfirm = () => {
    if (confirmAction === 'approve' && onApprove) {
      onApprove();
    } else if (confirmAction === 'reject' && onReject) {
      onReject();
    } else if (confirmAction === 'delete' && onDelete) {
      onDelete();
    }
    setConfirmAction(null);
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary-foreground/20 rounded-full w-8 h-8 flex items-center justify-center font-semibold">
              {selectedCount}
            </div>
            <span className="font-medium">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
          </div>

          <div className="h-6 w-px bg-primary-foreground/20" />

          <div className="flex gap-2">
            {onApprove && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmAction('approve')}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {approveLabel}
              </Button>
            )}

            {onReject && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmAction('reject')}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                {rejectLabel}
              </Button>
            )}

            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmAction('delete')}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deleteLabel}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="gap-2 hover:bg-primary-foreground/10"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' && `${approveLabel} ${selectedCount} items?`}
              {confirmAction === 'reject' && `${rejectLabel} ${selectedCount} items?`}
              {confirmAction === 'delete' && `${deleteLabel} ${selectedCount} items?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve' &&
                `This will ${approveLabel.toLowerCase()} ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}. This action cannot be undone.`}
              {confirmAction === 'reject' &&
                `This will ${rejectLabel.toLowerCase()} ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}. This action cannot be undone.`}
              {confirmAction === 'delete' &&
                `This will permanently ${deleteLabel.toLowerCase()} ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmAction === 'approve' && approveLabel}
              {confirmAction === 'reject' && rejectLabel}
              {confirmAction === 'delete' && deleteLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
