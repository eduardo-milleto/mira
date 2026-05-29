import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
};

// confirmacao de acao destrutiva (deletar) — padrao do sistema
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = "Excluir",
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} title={title}>
      <p className="text-sm text-muted">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onPress={() => onOpenChange(false)} isDisabled={isPending}>
          Cancelar
        </Button>
        <Button variant="danger" onPress={onConfirm} isPending={isPending} isDisabled={isPending}>
          {isPending ? "Excluindo..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
