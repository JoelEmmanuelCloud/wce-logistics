"use client";

type LoaderInput = { src: string; width: number; quality?: number };

const UNSPLASH_HOST = "images.unsplash.com";

export default function imageLoader({ src, width, quality }: LoaderInput): string {
  const url = new URL(src, "https://local.invalid");
  if (url.hostname === UNSPLASH_HOST) {
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    return url.toString();
  }
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
