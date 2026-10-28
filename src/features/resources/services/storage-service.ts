import { createClient } from "@/lib/supabase/server";

export interface UploadResult {
  url?: string;
  error?: string;
}

/**
 * Uploads a resource photo to Supabase Storage in the 'resource-images' bucket.
 * Uses a user-namespaced path: {userId}/{timestamp}_{cleanFileName}
 */
export async function uploadResourceImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  if (!file || file.size === 0) {
    return { error: "No file provided." };
  }

  // File size validation (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { error: "Image file exceeds maximum 5MB size limit." };
  }

  // MIME type validation
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Unsupported format. Please upload JPEG, PNG, or WebP." };
  }

  const supabase = await createClient();

  // Clean filename and generate path
  const ext = file.name.split(".").pop() || "jpg";
  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = `${userId}/${cleanName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("resource-images")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        error: `Storage upload notice: ${uploadError.message}. (Ensure the 'resource-images' bucket exists in Supabase Storage).`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from("resource-images")
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return { error: message };
  }
}
