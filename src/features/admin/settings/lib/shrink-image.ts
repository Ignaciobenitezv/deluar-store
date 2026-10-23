import { SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES } from "@/features/admin/products/lib/product-image-constraints";

// Browser-only. A hero photo straight from a camera can be 8–15 MB, more than
// a request may carry on Vercel; above the same safe size product photos use,
// it is redrawn at most HERO_MAX_EDGE wide/tall as JPEG (photos have no alpha).

const HERO_MAX_EDGE = 2400;
const QUALITY = 0.86;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_load_failed"));
    };
    image.src = url;
  });
}

export async function shrinkImageForUpload(file: File): Promise<File> {
  if (file.size <= SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, HERO_MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));

  if (!blob || blob.size > SAFE_PRODUCT_IMAGE_UPLOAD_REQUEST_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "hero"}.jpg`, { type: "image/jpeg" });
}
