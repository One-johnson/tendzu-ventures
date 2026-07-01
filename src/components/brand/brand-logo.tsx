import Image from "next/image";
import { APP_LOGO_PATH, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function BrandLogo({
  className,
  width = 160,
  height = 64,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={APP_LOGO_PATH}
      alt={APP_NAME}
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto max-w-full object-contain", className)}
    />
  );
}
