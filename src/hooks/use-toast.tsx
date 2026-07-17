"use client";

// Thin shim over the Base UI toast manager, keeping the previous
// react-hot-toast-inspired `toast()` / `useToast()` API surface.
import * as React from "react";
import { Toast as ToastPrimitives } from "@base-ui/react/toast";

const toastManager = ToastPrimitives.createToastManager();

type ToastVariant = "default" | "destructive";

type Toast = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  variant?: ToastVariant;
  action?: React.ReactNode;
};

type ToastData = {
  variant?: ToastVariant;
  action?: React.ReactNode;
};

function toast({ title, description, duration, variant, action }: Toast) {
  const id = toastManager.add({
    title,
    description,
    timeout: duration,
    data: { variant, action } satisfies ToastData,
  });

  const update = (props: Toast) =>
    toastManager.update(id, {
      title: props.title,
      description: props.description,
      timeout: props.duration,
      data: { variant: props.variant, action: props.action } satisfies ToastData,
    });
  const dismiss = () => toastManager.close(id);

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => toastManager.close(toastId),
  };
}

export { useToast, toast, toastManager, type ToastData };
