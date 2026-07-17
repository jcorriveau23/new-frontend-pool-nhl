"use client";

import { Toast as ToastPrimitives } from "@base-ui/react/toast";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { toastManager, type ToastData } from "@/hooks/use-toast";

function ToastList() {
  const { toasts } = ToastPrimitives.useToastManager();

  return (
    <>
      {toasts.map((t) => {
        const data = (t.data ?? {}) as ToastData;
        return (
          <Toast key={t.id} toast={t} variant={data.variant}>
            <div className="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && (
                <ToastDescription>{t.description}</ToastDescription>
              )}
            </div>
            {data.action}
            <ToastClose />
          </Toast>
        );
      })}
    </>
  );
}

export function Toaster() {
  return (
    <ToastProvider toastManager={toastManager} limit={1}>
      <ToastViewport>
        <ToastList />
      </ToastViewport>
    </ToastProvider>
  );
}
