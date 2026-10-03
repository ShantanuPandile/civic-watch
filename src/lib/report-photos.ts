import potholePhoto from "@/assets/report-pothole.jpg";
import streetlightPhoto from "@/assets/report-streetlight.jpg";
import garbagePhoto from "@/assets/report-garbage.jpg";
import waterloggedPhoto from "@/assets/report-waterlogged.jpg";

// Illustrative photos belong only to the matching sample reports. Citizen uploads take precedence.
const samplePhotos: Record<string, string> = {
  "CIV-1001": potholePhoto,
  "CIV-1002": streetlightPhoto,
  "CIV-1003": garbagePhoto,
  "CIV-1005": waterloggedPhoto,
};

export function reportPhoto(trackingId: string, uploadedPhoto: string | null) {
  return uploadedPhoto || samplePhotos[trackingId] || null;
}

export function isSamplePhoto(trackingId: string, uploadedPhoto: string | null) {
  return !uploadedPhoto && trackingId in samplePhotos;
}