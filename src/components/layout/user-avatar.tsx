import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  user: SessionUser | null;
  size?: "sm" | "md";
}

export function UserAvatar({ user, className, size = "md", ...props }: UserAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-yellow-100 font-semibold text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
        size === "sm" ? "size-8 text-sm" : "size-9 text-sm",
        className
      )}
      {...props}
    >
      {user?.name?.charAt(0) ?? "A"}
    </div>
  );
}
