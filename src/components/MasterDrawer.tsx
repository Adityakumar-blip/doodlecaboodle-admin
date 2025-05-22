import React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MasterDrawerProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  position?: "left" | "right" | "bottom" | "top";
  className?: string;
  closeOnClickOutside?: boolean;
  hideCloseButton?: boolean;
}

export function MasterDrawer({
  children,
  trigger,
  title,
  description,
  isOpen,
  onOpenChange,
  footer,
  size = "md",
  position = "right",
  className,
  closeOnClickOutside = true,
  hideCloseButton = false,
}: MasterDrawerProps) {
  // Handle size classes
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    full: "max-w-full",
  };

  // Handle position classes
  const positionClasses = {
    top: "inset-x-0 top-0 bottom-auto border-b rounded-t-lg rounded-b-none",
    bottom: "inset-x-0 bottom-0 top-auto border-t rounded-b-none",
    left: "inset-y-0 left-0 right-auto h-full border-r rounded-r-lg rounded-l-none",
    right:
      "inset-y-0 right-0 left-auto h-full border-l rounded-l-lg rounded-r-none",
  };

  // Get classes based on size and position
  const drawerClasses = cn(
    sizeClasses[size],
    positionClasses[position],
    className
  );

  const renderContent = () => (
    <>
      <DrawerHeader>
        <div className="flex items-start justify-between">
          <div>
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </div>

          {!hideCloseButton && (
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          )}
        </div>
      </DrawerHeader>

      <div className="px-4 py-2 overflow-y-auto">{children}</div>

      {footer && <DrawerFooter>{footer}</DrawerFooter>}
    </>
  );

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent className={drawerClasses}>{renderContent()}</DrawerContent>
    </Drawer>
  );
}

// Extension of MasterDrawer specifically for forms with save/cancel actions
export interface MasterFormDrawerProps
  extends Omit<MasterDrawerProps, "footer"> {
  onSave?: () => void;
  onCancel?: () => void;
  saveButtonText?: string;
  cancelButtonText?: string;
  isSaving?: boolean;
  saveDisabled?: boolean;
}

export function MasterFormDrawer({
  onSave,
  onCancel,
  saveButtonText = "Save",
  cancelButtonText = "Cancel",
  isSaving = false,
  saveDisabled = false,
  ...drawerProps
}: MasterFormDrawerProps) {
  const footer = (
    <>
      <Button
        onClick={onSave}
        disabled={isSaving || saveDisabled}
        className="bg-artist-purple hover:bg-artist-purple/90"
      >
        {isSaving ? "Saving..." : saveButtonText}
      </Button>
      <DrawerClose asChild>
        <Button variant="outline" onClick={onCancel}>
          {cancelButtonText}
        </Button>
      </DrawerClose>
    </>
  );

  return <MasterDrawer {...drawerProps} footer={footer} />;
}
