import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarRowProps {
  name: string;
  imageUrl?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-20 w-20",
};

const textSizeMap = {
  sm: "text-xs",
  md: "text-base",
  lg: "text-2xl",
};

export function UserAvatarRow({
  name,
  imageUrl,
  subtitle,
  size = "md",
  className,
  onClick,
}: UserAvatarRowProps) {
  const content = (
    <>
      <Avatar className={sizeMap[size]}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className={cn("bg-primary/20 text-primary font-bold", textSizeMap[size])}>
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(
          "flex items-center gap-3 hover:opacity-80 transition-opacity text-left",
          className
        )}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>{content}</div>
  );
}
