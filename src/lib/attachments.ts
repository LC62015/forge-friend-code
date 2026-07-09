// Helpers for attaching images and extracting a preview frame from a video
// entirely in the browser. Returns data URLs so nothing has to be uploaded
// to storage before sending to the model.

export type Attachment =
  | { kind: "image"; name: string; mediaType: string; dataUrl: string }
  | {
      kind: "video";
      name: string;
      mediaType: string;
      dataUrl: string; // preview frame as image/jpeg data URL
      durationSec: number;
    };

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function fileToImageAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is larger than 20 MB.`);
  }
  const dataUrl = await readAsDataURL(file);
  return {
    kind: "image",
    name: file.name,
    mediaType: file.type || "image/png",
    dataUrl,
  };
}

export async function fileToVideoAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is larger than 20 MB.`);
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const { frameDataUrl, durationSec } = await extractFirstFrame(objectUrl);
    return {
      kind: "video",
      name: file.name,
      mediaType: file.type || "video/mp4",
      dataUrl: frameDataUrl,
      durationSec,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function extractFirstFrame(
  src: string,
): Promise<{ frameDataUrl: string; durationSec: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = src;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      // seek slightly in so we don't get a black first frame
      const seekTo = Math.min(0.1, Math.max(0, (video.duration || 1) * 0.05));
      video.currentTime = seekTo;
    };

    video.onseeked = () => {
      try {
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        const scale = Math.min(1, 1024 / Math.max(w, h));
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D not available");
        ctx.drawImage(video, 0, 0, cw, ch);
        const frameDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({
          frameDataUrl,
          durationSec: Math.round((video.duration || 0) * 10) / 10,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Frame extraction failed"));
      } finally {
        cleanup();
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error(`Could not read ${src}`));
    };
  });
}
