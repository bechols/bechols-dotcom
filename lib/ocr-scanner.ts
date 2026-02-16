// Tesseract.js OCR for bookshelf scanning.
// Dynamic import keeps tesseract.js out of the initial bundle.

// eslint-disable-next-line no-unused-vars
type ProgressCallback = (status: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: any = null;

export function isWorkerReady(): boolean {
  return worker !== null;
}

export async function initWorker(onProgress?: ProgressCallback): Promise<void> {
  if (worker) return;

  onProgress?.("Loading OCR engine...");
  const { createWorker } = await import("tesseract.js");

  worker = await createWorker("eng", undefined, {
    logger: (m: { status: string }) => {
      if (m.status === "recognizing text") return; // skip per-frame progress
      onProgress?.(m.status);
    },
  });

  onProgress?.("OCR engine ready");
}

/** Capture a frame from a video element as a PNG Blob, downscaled to max 1280px wide. */
export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/png");
  });
}

/** Run OCR on a previously captured frame blob. */
export async function recognizeFrame(blob: Blob): Promise<string> {
  if (!worker) {
    throw new Error("Worker not initialized. Call initWorker() first.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const result = await worker.recognize(blob);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return String(result.data.text).trim();
}

export async function terminateWorker(): Promise<void> {
  if (worker) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await worker.terminate();
    worker = null;
  }
}
