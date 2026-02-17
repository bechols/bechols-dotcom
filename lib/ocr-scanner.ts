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
let initPromise: Promise<void> | null = null;

export function isOcrReady(): boolean {
  return ocr !== null;
}

export async function initOcr(onProgress?: ProgressCallback): Promise<void> {
  if (ocr) return;

  // Deduplicate concurrent init calls
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    onProgress?.("Loading OCR engine...");

    // Configure WASM runtime BEFORE importing @gutenye/ocr-browser.
    // onnxruntime-web decides which .wasm file to load at import time:
    // multi-threaded WASM uses a blob-URL web worker that can't fetch
    // same-origin assets on iOS (CORS error), so force single-threaded.
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    // Temporarily wrap fetch to track model download progress without
    // double-loading. Data flows through the ReadableStream wrapper
    // directly to onnxruntime — no extra memory copies.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const resp = await originalFetch(input, init);
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (!url.includes("/models/") || !url.endsWith(".onnx")) return resp;

      const label = url.includes("det") ? "detection" : "recognition";
      const total = Number(resp.headers.get("content-length") ?? 0);

      if (!resp.body || total <= 0) {
        onProgress?.(`Downloading ${label} model...`);
        return resp;
      }

      let loaded = 0;
      const reader = resp.body.getReader();
      const stream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          loaded += value.byteLength;
          const pct = Math.round((loaded / total) * 100);
          const mb = (loaded / 1024 / 1024).toFixed(1);
          const totalMb = (total / 1024 / 1024).toFixed(1);
          onProgress?.(
            `Downloading ${label} model... ${mb}/${totalMb} MB (${pct}%)`,
          );
          controller.enqueue(value);
        },
      });

      return new Response(stream, {
        headers: resp.headers,
        status: resp.status,
        statusText: resp.statusText,
      });
    };

    try {
      onProgress?.("Downloading OCR models (~14 MB)...");
      const { default: Ocr } = await import("@gutenye/ocr-browser");

      ocr = await Ocr.create({
        models: {
          detectionPath: "/models/ch_PP-OCRv4_det_infer.onnx",
          recognitionPath: "/models/ch_PP-OCRv4_rec_infer.onnx",
          dictionaryPath: "/models/ppocr_keys_v1.txt",
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    onProgress?.("OCR engine ready");
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

/** Capture a frame from a video element as a blob URL for OCR. */
export async function captureFrame(video: HTMLVideoElement): Promise<{
  url: string;
  cleanup: () => void;
}> {
  const canvas = document.createElement("canvas");
  // Scale to max 640px wide — enough for OCR, much less memory than 1280
  const scale = Math.min(1, 640 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Blob URL is far more memory-efficient than a base64 data URL
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8),
  );
  const url = URL.createObjectURL(blob);
  return { url, cleanup: () => URL.revokeObjectURL(url) };
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
