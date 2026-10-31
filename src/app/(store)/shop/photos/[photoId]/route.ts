import { NextResponse } from "next/server";
import { z } from "zod";
import { findPublicPhoto } from "@/server/catalog";
import { signedDownloadUrl } from "@/server/storage";

export async function GET(_request: Request, context: RouteContext<"/shop/photos/[photoId]">) {
  const id = z.uuid().safeParse((await context.params).photoId);
  const photo = id.success ? await findPublicPhoto(id.data) : null;
  if (!photo) {
    return new NextResponse("Not found", { status: 404 });
  }
  const url = await signedDownloadUrl(photo.storageKey, "product-photo");
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "public, max-age=30" } });
}
