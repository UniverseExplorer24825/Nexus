import { createClient } from "@/lib/supabase/server";

export interface ConditionPhotoUploadResult {
  url?: string;
  error?: string;
}

/**
 * Uploads an inspection or incident photo to the 'condition-photos' storage bucket.
 * Uses a booking-partitioned path: {bookingId}/{stage}_{timestamp}_{random}.${ext}
 */
export async function uploadConditionPhoto(
  file: File,
  bookingId: string,
  stage: string = "condition"
): Promise<ConditionPhotoUploadResult> {
  if (!file || file.size === 0) {
    return { error: "No photo provided." };
  }

  // Maximum size: 5MB
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { error: "Photo file exceeds maximum 5MB size limit." };
  }

  // Allowed image MIME types
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Unsupported photo format. Allowed formats: JPEG, PNG, WebP." };
  }

  const supabase = await createClient();

  // Generate unique, collision-resistant path
  const ext = file.name.split(".").pop() || "jpg";
  const cleanName = `${stage}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = `${bookingId}/${cleanName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("condition-photos")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.warn("[ConditionStorage] Upload notice:", uploadError.message);
      return { error: `Photo upload notice: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from("condition-photos")
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Condition photo upload failed.";
    return { error: message };
  }
}
