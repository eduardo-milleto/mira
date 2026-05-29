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

// modal base do sistema: overlay escurecido + card com o estilo padrao (rounded-2xl, blur)
export function Modal({ isOpen, onOpenChange, title, children, className }: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <AriaModal
        className={cn(
          "w-full max-w-md rounded-2xl border border-border bg-surface/95 shadow-card backdrop-blur outline-none",
          className,
        )}
      >
        <Dialog className="outline-none">
          {({ close }) => (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
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
              <div className="px-6 py-5">{children}</div>
            </>
          )}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
