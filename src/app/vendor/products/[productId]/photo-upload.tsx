"use client";

import { useActionState } from "react";
import { uploadProductPhotoAction } from "@/app/vendor/products/actions";
import { FormMessage } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";

export function ProductPhotoUpload({ productId }: { productId: string }) {
  const [state, action] = useActionState(uploadProductPhotoAction.bind(null, productId), initialFormState);
  return (
    <form action={action} className="grid gap-3">
      <label htmlFor="product-photo" className="sr-only">
        Upload a photo
      </label>
      <input
        id="product-photo"
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className="block w-full text-[14px] text-navy file:mr-4 file:rounded-xl file:border-0 file:bg-navy/[0.07] file:px-4 file:py-2 file:text-[14px] file:font-semibold file:text-navy hover:file:bg-navy/[0.12]"
      />
      <p className="text-[12px] text-navy/70">JPG, PNG or WebP, up to 10 MB.</p>
      <SubmitButton variant="secondary" pendingLabel="Uploading">
        Add photo
      </SubmitButton>
      {state.status !== "idle" && <FormMessage state={state} />}
    </form>
  );
}
