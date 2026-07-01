"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResponsiveFormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
}

function FormPanelHeader({
  title,
  description,
}: Pick<ResponsiveFormPanelProps, "title" | "description">) {
  return (
    <>
      <SheetTitle className="text-left">{title}</SheetTitle>
      {description ? (
        <SheetDescription className="text-left">{description}</SheetDescription>
      ) : null}
    </>
  );
}

function FormPanelDialogHeader({
  title,
  description,
}: Pick<ResponsiveFormPanelProps, "title" | "description">) {
  return (
    <>
      <DialogTitle className="text-left">{title}</DialogTitle>
      {description ? (
        <DialogDescription className="text-left">{description}</DialogDescription>
      ) : null}
    </>
  );
}

export function ResponsiveFormPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveFormPanelProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            "flex h-[min(92vh,900px)] flex-col gap-0 rounded-t-xl border-t p-0",
            className
          )}
        >
          <div className="shrink-0 border-b border-border px-4 py-4 pr-12">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <SheetHeader className="space-y-1.5 p-0">
              <FormPanelHeader title={title} description={description} />
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

          <div className="shrink-0 border-t border-border bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          className
        )}
      >
        <div className="shrink-0 border-b border-border px-6 py-5 pr-14">
          <DialogHeader className="space-y-1.5 p-0">
            <FormPanelDialogHeader title={title} description={description} />
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        <div className="shrink-0 border-t border-border bg-card px-6 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
