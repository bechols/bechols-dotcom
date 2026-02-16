// VLM model loading and inference for bookshelf scanning.
// Uses dynamic imports so @huggingface/transformers is only loaded when scan tab is visited.

// eslint-disable-next-line no-unused-vars
type ProgressCallback = (message: string) => void;
// eslint-disable-next-line no-unused-vars
type StreamCallback = (text: string) => void;

// Module-level singletons — survive re-renders, reusable across scans
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let model: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenizer: any = null;
let inferenceInProgress = false;

const MODEL_ID = "onnx-community/FastVLM-0.5B-ONNX";

export function isModelLoaded(): boolean {
  return processor !== null && model !== null && tokenizer !== null;
}

export async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const gpu = (navigator as any).gpu as { requestAdapter: () => Promise<unknown> } | undefined;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function loadModel(
  onProgress?: ProgressCallback,
): Promise<void> {
  if (isModelLoaded()) return;

  onProgress?.("Loading transformers library...");

  const {
    AutoProcessor,
    AutoModelForImageTextToText,
    AutoTokenizer,
  } = await import("@huggingface/transformers");

  onProgress?.("Downloading model (this may take a minute on first load)...");

  const [loadedProcessor, loadedModel, loadedTokenizer] = await Promise.all([
    AutoProcessor.from_pretrained(MODEL_ID),
    AutoModelForImageTextToText.from_pretrained(MODEL_ID, {
      device: "webgpu",
      dtype: {
        embed_tokens: "fp16",
        vision_encoder: "q4",
        decoder_model_merged: "q4",
      },
    }),
    AutoTokenizer.from_pretrained(MODEL_ID),
  ]);

  processor = loadedProcessor;
  model = loadedModel;
  tokenizer = loadedTokenizer;

  onProgress?.("Model loaded!");
}

const SYSTEM_PROMPT =
  "You are a bookshelf scanner. Look at the image of book spines and list every book you can read. " +
  "Output each book on its own line in the format: Title by Author. " +
  "If you cannot read the author, just output the title. " +
  "Do not add numbering, bullets, or any other formatting.";

export async function scanBookshelf(
  video: HTMLVideoElement,
  onStream?: StreamCallback,
): Promise<string> {
  if (!isModelLoaded()) {
    throw new Error("Model not loaded. Call loadModel() first.");
  }
  if (inferenceInProgress) {
    throw new Error("Inference already in progress.");
  }

  inferenceInProgress = true;

  try {
    const { RawImage } = await import("@huggingface/transformers");

    // Capture frame from video element
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const image = new RawImage(
      new Uint8ClampedArray(imageData.data),
      canvas.width,
      canvas.height,
      4,
    );

    // Build conversation messages
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [{ type: "image", image }],
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const chatText = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const inputs = await processor(image, chatText.input_ids);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const outputs = await model.generate({
      ...inputs,
      max_new_tokens: 512,
      do_sample: false,
      callback_function: onStream
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (output: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const d = String(tokenizer.decode(output[0], { skip_special_tokens: true }));
            onStream(d);
          }
        : undefined,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const decoded = String(tokenizer.decode(outputs[0], { skip_special_tokens: true }));

    // Extract just the assistant response (after the last system/user content)
    const parts = decoded.split("assistant");
    return (parts[parts.length - 1] ?? decoded).trim();
  } finally {
    inferenceInProgress = false;
  }
}
