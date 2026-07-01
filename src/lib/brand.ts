import { APP_LOGO_PATH } from "@/lib/constants";

export function getBrandLogoUrl(origin?: string) {
  if (origin) {
    return `${origin}${APP_LOGO_PATH}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${APP_LOGO_PATH}`;
  }

  return APP_LOGO_PATH;
}
