import { Badge, type BadgeProps } from "@/components/ui/badge";

type StatusType =
  | "creator"
  | "accepted"
  | "pending"
  | "declined"
  | "public"
  | "confirmed";

const statusConfig: Record<
  StatusType,
  { variant: BadgeProps["variant"]; label: string }
> = {
  creator: { variant: "default", label: "Host" },
  accepted: { variant: "success", label: "Accepted" },
  pending: { variant: "warning", label: "Pending" },
  declined: { variant: "destructive", label: "Declined" },
  public: { variant: "default", label: "Public" },
  confirmed: { variant: "success", label: "Confirmed" },
};

interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeProps["size"];
  className?: string;
}

export function StatusBadge({
  status,
  size = "default",
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}
