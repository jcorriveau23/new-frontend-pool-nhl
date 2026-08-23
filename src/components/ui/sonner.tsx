"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--error-bg": "var(--toast-error-bg)",
          "--error-border": "var(--toast-error-border)",
          "--error-text": "var(--toast-error-text)",
          "--success-bg": "var(--toast-success-bg)",
          "--success-border": "var(--toast-success-border)",
          "--success-text": "var(--toast-success-text)",
          "--warning-bg": "var(--toast-warning-bg)",
          "--warning-border": "var(--toast-warning-border)",
          "--warning-text": "var(--toast-warning-text)",
          "--info-bg": "var(--toast-info-bg)",
          "--info-border": "var(--toast-info-border)",
          "--info-text": "var(--toast-info-text)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
