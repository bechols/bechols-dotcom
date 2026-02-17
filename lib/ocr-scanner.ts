// PaddleOCR (PP-OCRv4) via @gutenye/ocr-browser for bookshelf scanning.
// Dynamic import keeps onnxruntime-web out of the initial bundle.

// eslint-disable-next-line no-unused-vars
type ProgressCallback = (status: string) => void;

export interface OcrResult {
  text: string;
  confidence: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ocr: any = null;

export function isOcrReady(): boolean {
  return ocr !== null;
}

export async function initOcr(onProgress?: ProgressCallback): Promise<void> {
  if (ocr) return;

  onProgress?.("Loading OCR models...");
  const { default: Ocr } = await import("@gutenye/ocr-browser");

  ocr = await Ocr.create({
    models: {
      detectionPath: "/models/ch_PP-OCRv4_det_infer.onnx",
      recognitionPath: "/models/ch_PP-OCRv4_rec_infer.onnx",
      dictionaryPath: "/models/ppocr_keys_v1.txt",
    },
  });

  onProgress?.("OCR engine ready");
}

/** Capture a frame from a video element as an object URL for OCR. */
export function captureFrame(video: HTMLVideoElement): {
  url: string;
  cleanup: () => void;
} {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1280 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert canvas to blob URL for @gutenye/ocr-browser (expects a URL string)
  const dataUrl = canvas.toDataURL("image/png");
  return { url: dataUrl, cleanup: () => {} };
}

/** Run OCR on a captured frame, returning structured results with confidence. */
export async function recognizeFrame(imageUrl: string): Promise<OcrResult[]> {
  if (!ocr) {
    throw new Error("OCR not initialized. Call initOcr() first.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const lines: Array<{ text: string; mean: number }> = await ocr.detect(
    imageUrl,
  );

  return lines.map((line) => ({
    text: line.text.trim(),
    confidence: line.mean,
  }));
}

export function terminateOcr(): void {
  // @gutenye/ocr-browser doesn't expose a destroy method, but we can
  // release the reference so the GC can reclaim the WASM memory.
  ocr = null;
}
