import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** True in the static GitHub Pages demo (`npm run build:pages`), which has no server-backed routes. */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
