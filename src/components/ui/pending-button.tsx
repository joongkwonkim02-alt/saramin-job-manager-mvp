"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PendingButtonProps {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
}

export function PendingButton({
  children,
  pendingLabel = "처리 중...",
  className,
  variant,
  size,
  disabled,
}: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending || disabled}
      className={cn(className)}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
