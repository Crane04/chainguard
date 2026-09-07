import exifr from "exifr";

export interface ExtractedMetadata {
  raw: Record<string, unknown> | null;
  make: string | null;
  cameraModel: string | null;
  software: string | null;
  dateTimeOriginal: Date | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  c2paPresent: boolean;
  flags: string[];
}

/**
 * Pulls whatever EXIF/XMP metadata a file actually carries — camera make/model,
 * capture timestamp, GPS, editing software — and flags a few suspicious absences.
 * A parse failure or empty result isn't an error here, it's itself a signal
 * (e.g. the file was screenshotted or already stripped by another app).
 */
export async function extractMetadata(buffer: Buffer): Promise<ExtractedMetadata> {
  let raw: Record<string, unknown> | null = null;

  try {
    raw = (await exifr.parse(buffer, { gps: true, tiff: true, exif: true, xmp: true })) ?? null;
  } catch {
    raw = null;
  }

  const make = (raw?.Make as string | undefined) ?? null;
  const cameraModel = (raw?.Model as string | undefined) ?? null;
  const software = (raw?.Software as string | undefined) ?? null;
  const dateTimeOriginal = (raw?.DateTimeOriginal as Date | undefined) ?? null;
  const gpsLatitude = (raw?.latitude as number | undefined) ?? null;
  const gpsLongitude = (raw?.longitude as number | undefined) ?? null;

  const flags: string[] = [];

  if (!raw || Object.keys(raw).length === 0) {
    flags.push("NO_EXIF_DATA");
  } else {
    if (!make && !cameraModel) {
      flags.push("NO_CAPTURE_DEVICE_INFO");
    }
    if (software) {
      flags.push("EDITED_WITH_SOFTWARE");
    }
    if (gpsLatitude === null || gpsLongitude === null) {
      flags.push("NO_GPS_DATA");
    }
  }

  return {
    raw,
    make,
    cameraModel,
    software,
    dateTimeOriginal,
    gpsLatitude,
    gpsLongitude,
    c2paPresent: false,
    flags
  };
}
