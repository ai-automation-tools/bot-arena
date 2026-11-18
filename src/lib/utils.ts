import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** True in the static GitHub Pages demo (`npm run build:pages`), which has no server-backed routes. */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1"

/** Where /unlock may send someone back to: a path on this site, else "/". `//host` and `/\host` resolve off-site. */
export function sameSitePath(next: string | undefined): string {
  if (!next) return "/"
  try {
    const url = new URL(next, "http://x")
    return url.origin === "http://x" ? url.pathname + url.search + url.hash : "/"
  } catch {
    return "/"
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
