import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InputWithIconProps extends React.ComponentProps<typeof Input> {
  icon: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ icon, endAdornment, className, ...props }, ref) => {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </div>
        <Input
          ref={ref}
          className={cn("pl-10", endAdornment ? "pr-10" : undefined, className)}
          {...props}
        />
        {endAdornment ? (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">{endAdornment}</div>
        ) : null}
      </div>
    );
  }
);
InputWithIcon.displayName = "InputWithIcon";

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
  icon?: React.ReactNode;
}

export function PasswordInput({
  icon = <Lock className="h-4 w-4" />,
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <InputWithIcon
      icon={icon}
      type={visible ? "text" : "password"}
      className={className}
      endAdornment={
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
}
