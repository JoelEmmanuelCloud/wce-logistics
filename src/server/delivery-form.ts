import "server-only";
import { refresh } from "next/cache";
import { after } from "next/server";
import type { DeliveryUpdateKind } from "@/lib/delivery";
import { errorState, successState, validationErrorState, type FormState } from "@/lib/form-state";
import { DELIVERY_ACTIONS } from "@/lib/labels";
import { deliveryUpdateSchema } from "@/lib/validation/delivery";
import { DeliveryError, recordDeliveryUpdate, type DeliveryActor } from "@/server/delivery";
import { notifyDelivery, type DeliveryNotice } from "@/server/notifications";
import { deleteStoredObject, storeUpload, UploadRejectedError, type StoredFile } from "@/server/storage";

type Parsed =
  | { ok: true; input: { kind: DeliveryUpdateKind; note: string | null; recipientName: string | null }; photo: StoredFile | null }
  | { ok: false; state: FormState };

export async function readDeliveryUpdate(bookingId: string, formData: FormData): Promise<Parsed> {
  const parsed = deliveryUpdateSchema.safeParse({
    kind: formData.get("kind") ?? "",
    note: formData.get("note") ?? "",
    recipientName: formData.get("recipientName") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, state: validationErrorState(parsed.error, formData) };
  }
  const file = formData.get("photo");
  let photo: StoredFile | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      photo = await storeUpload(file, `deliveries/${bookingId}`, "image");
    } catch (error) {
      if (error instanceof UploadRejectedError) {
        return { ok: false, state: errorState(error.message, { photo: [error.message] }) };
      }
      throw error;
    }
  }
  return { ok: true, input: { ...parsed.data, kind: parsed.data.kind as DeliveryUpdateKind }, photo };
}

const NOTIFIED: Partial<Record<DeliveryUpdateKind, DeliveryNotice>> = {
  goods_collected: "goods_collected",
  departed: "departed",
  delivery_attempted: "delivery_attempted",
  delivered: "delivered",
  incident_reported: "incident_reported",
};

export async function applyDeliveryUpdate(actor: DeliveryActor, bookingId: string, formData: FormData): Promise<FormState> {
  const parsed = await readDeliveryUpdate(bookingId, formData);
  if (!parsed.ok) {
    return parsed.state;
  }
  try {
    const { booking } = await recordDeliveryUpdate(actor, bookingId, parsed.input, parsed.photo);
    const notice = NOTIFIED[parsed.input.kind];
    if (notice) {
      after(() => notifyDelivery(notice, booking, { note: parsed.input.note, reportedByDriver: actor.role === "driver" }));
    }
  } catch (error) {
    if (parsed.photo) {
      await deleteStoredObject(parsed.photo.storageKey).catch((cleanupError) => console.error(cleanupError));
    }
    if (error instanceof DeliveryError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState(`${DELIVERY_ACTIONS[parsed.input.kind].label} recorded.`);
}
