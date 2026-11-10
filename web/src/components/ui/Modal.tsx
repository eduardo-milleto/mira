import type { ReactNode } from "react";
import {
  Dialog,
  Heading,
  Modal as AriaModal,
  ModalOverlay,
} from "react-aria-components";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

type ModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
};

// modal base do sistema: overlay escurecido + card com o estilo padrao (rounded-2xl, blur).
// no mobile vira bottom sheet (encostado embaixo, largura total) e o corpo rola quando o
// formulario passa da altura da tela
export function Modal({ isOpen, onOpenChange, title, children, className }: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <AriaModal
        className={cn(
          "flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface/95 shadow-card backdrop-blur outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl",
          className,
        )}
      >
        <Dialog className="flex min-h-0 flex-1 flex-col outline-none">
          {({ close }) => (
            <>
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
                <Heading slot="title" className="text-lg font-medium text-heading">
                  {title}
                </Heading>
                <button
                  type="button"
                  onClick={close}
                  className="text-faint transition hover:text-heading"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
                {children}
              </div>
            </>
          )}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
