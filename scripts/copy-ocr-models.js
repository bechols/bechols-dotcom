// Copy PaddleOCR ONNX model files from @gutenye/ocr-models to public/models/
// Run automatically via postinstall hook.

import { cpSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(
  __dirname,
  "..",
  "node_modules",
  "@gutenye",
  "ocr-models",
  "assets",
);
const destDir = resolve(__dirname, "..", "public", "models");

const files = [
  "ch_PP-OCRv4_det_infer.onnx",
  "ch_PP-OCRv4_rec_infer.onnx",
  "ppocr_keys_v1.txt",
];

if (!existsSync(assetsDir)) {
  console.warn("OCR models not found at", assetsDir);
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

for (const file of files) {
  const src = resolve(assetsDir, file);
  const dest = resolve(destDir, file);
  if (existsSync(src)) {
    cpSync(src, dest);
    console.log(`Copied ${file}`);
  } else {
    console.warn(`Missing model file: ${file}`);
  }
}
