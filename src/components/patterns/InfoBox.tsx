import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const infoBoxVariants = cva("flex items-start gap-3 p-3 rounded-lg", {
  variants: {
    variant: {
      default: "bg-muted",
      success: "bg-success/10",
      info: "bg-info/10",
      warning: "bg-warning/10",
      destructive: "bg-destructive/10",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const colorMap = {
  default: "text-muted-foreground",
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  destructive: "text-destructive",
} as const;

export interface InfoBoxProps extends VariantProps<typeof infoBoxVariants> {
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function InfoBox({
  icon,
  title,
  children,
  variant = "default",
  className,
}: InfoBoxProps) {
  // VariantProps makes variant nullable in the type system, even though it has a default value
  // Using nullish coalescing to satisfy TypeScript's type checker
  const safeVariant = variant ?? "default";

  if (!icon && !title) {
    return (
      <div className={cn(infoBoxVariants({ variant }), className)}>
        <div className="text-sm">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn(infoBoxVariants({ variant }), className)}>
      {icon && (
        <div
          className={cn(
            "flex-shrink-0 mt-0.5 [&>svg]:h-5 [&>svg]:w-5",
            colorMap[safeVariant]
          )}
        >
          {icon}
        </div>
      )}
      <div>
        {title && (
          <span
            className={cn(
              "text-sm font-semibold",
              colorMap[safeVariant]
            )}
          >
            {title}
          </span>
        )}
        <div className={cn("text-sm", title && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}
