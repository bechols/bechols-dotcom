import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { wantToReadQueryOptions } from "@/lib/book-queries";
import {
  initWorker,
  captureFrame,
  recognizeFrame,
  terminateWorker,
} from "@/lib/ocr-scanner";
import {
  parseExtractedBooks,
  matchBooksAgainstWantToRead,
} from "@/lib/book-matcher";
import type { ScanMatch } from "@/lib/book-matcher";

export const Route = createFileRoute("/books/scan")({
  component: BookshelfScanner,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(wantToReadQueryOptions());
  },
});

type ScanState = "idle" | "camera-active" | "scanning" | "results";

function BookshelfScanner() {
  const { data: wantToReadBooks } = useSuspenseQuery(wantToReadQueryOptions());
  const [isHydrated, setIsHydrated] = useState(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [matches, setMatches] = useState<ScanMatch[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Ref callback: attach stream to video element when it mounts
  const videoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (videoRef as any).current = el;
      if (el && streamRef.current && !el.srcObject) {
        el.srcObject = streamRef.current;
      }
    },
    [],
  );

  useEffect(() => {
    setIsHydrated(true);
    // Pre-load OCR engine on mount so it's ready when user scans
    void initWorker();
  }, []);

  // Cleanup camera and worker on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      void terminateWorker();
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanState("camera-active");
    } catch {
      setStatusMessage(
        "Camera access denied. Please allow camera access and try again.",
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleEnableCamera = useCallback(async () => {
    await startCamera();
  }, [startCamera]);

  const handleScan = useCallback(async () => {
    if (!videoRef.current) return;

    // Capture frame BEFORE changing state — the video element will stay
    // mounted but we need the frame while it's still playing
    videoRef.current.pause();
    const frameBlob = await captureFrame(videoRef.current);

    setScanState("scanning");
    setStatusMessage("Scanning...");

    try {
      // Ensure worker is ready (no-op if already loaded)
      await initWorker((msg) => setStatusMessage(msg));
      const rawText = await recognizeFrame(frameBlob);

      const extracted = parseExtractedBooks(rawText);
      const results = matchBooksAgainstWantToRead(
        extracted,
        wantToReadBooks ?? [],
      );
      setMatches(results);
      setScanState("results");
      stopCamera();
    } catch {
      setStatusMessage("Scan failed. Please try again.");
      setScanState("camera-active");
      if (videoRef.current) {
        void videoRef.current.play();
      }
    }
  }, [wantToReadBooks, stopCamera]);

  const handleScanAgain = useCallback(async () => {
    setMatches([]);
    setStatusMessage("");
    await startCamera();
  }, [startCamera]);

  if (!isHydrated) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <p className="text-gray-500">Loading scanner...</p>
      </div>
    );
  }

  const matchedBooks = matches.filter((m) => m.confidence !== "none");
  const unmatchedBooks = matches.filter((m) => m.confidence === "none");
  const showVideo = scanState === "camera-active" || scanState === "scanning";

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Idle state */}
      {scanState === "idle" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border bg-gray-50 p-4">
            <h2 className="font-semibold mb-2">Bookshelf Scanner</h2>
            <p className="text-sm text-gray-600 mb-3">
              Point your camera at a bookshelf to find books from your
              want-to-read list. Uses on-device OCR — no data leaves your
              browser.
            </p>
            <p className="text-xs text-gray-400">
              {wantToReadBooks?.length ?? 0} books in your want-to-read list
            </p>
          </div>

          <Button
            onClick={() => void handleEnableCamera()}
            className="flex items-center gap-2 self-start"
          >
            <Camera className="h-4 w-4" />
            Enable Camera
          </Button>

          {statusMessage && (
            <p className="text-sm text-gray-600">{statusMessage}</p>
          )}
        </div>
      )}

      {/* Single video element for both camera-active and scanning states */}
      {showVideo && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full overflow-hidden rounded-lg bg-black">
            <video
              ref={videoCallbackRef}
              autoPlay
              muted
              playsInline
              className="w-full"
            />
            {scanState === "scanning" && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
              </div>
            )}
          </div>

          {scanState === "camera-active" && (
            <div className="flex justify-center">
              <button
                onClick={() => void handleScan()}
                className="h-16 w-16 rounded-full border-4 border-williams-purple bg-white flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
                aria-label="Scan bookshelf"
              >
                <ScanLine className="h-7 w-7 text-williams-purple" />
              </button>
            </div>
          )}

          {scanState === "scanning" && (
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-williams-purple shrink-0" />
              <p className="text-sm text-gray-600">
                {statusMessage || "Scanning..."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results state */}
      {scanState === "results" && (
        <div className="flex flex-col gap-4">
          {matchedBooks.length > 0 && (
            <div>
              <h2 className="font-semibold text-green-800 mb-2">
                Found on your want-to-read list ({matchedBooks.length})
              </h2>
              <div className="space-y-1">
                {matchedBooks.map((match, i) => (
                  <div
                    key={i}
                    className="border border-green-200 rounded-lg px-3 py-2 bg-green-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm leading-tight">
                          {match.matched ? (
                            <a
                              href={match.matched.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-green-900"
                            >
                              {match.matched.title}
                            </a>
                          ) : (
                            match.extracted.title
                          )}
                        </h3>
                        <p className="text-xs text-green-700">
                          {match.matched?.author ?? match.extracted.author}
                        </p>
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                          match.confidence === "high"
                            ? "bg-green-200 text-green-800"
                            : "bg-yellow-200 text-yellow-800"
                        }`}
                      >
                        {match.confidence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unmatchedBooks.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-500 mb-2">
                Other text detected ({unmatchedBooks.length})
              </h2>
              <div className="space-y-1">
                {unmatchedBooks.map((match, i) => (
                  <div
                    key={i}
                    className="border rounded-lg px-3 py-2 bg-gray-50"
                  >
                    <h3 className="font-medium text-sm text-gray-600 leading-tight">
                      {match.extracted.title}
                    </h3>
                    {match.extracted.author && (
                      <p className="text-xs text-gray-400">
                        {match.extracted.author}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {matches.length === 0 && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                No text detected. Try getting closer to the shelf or improving
                lighting.
              </p>
            </div>
          )}

          <Button
            onClick={() => void handleScanAgain()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Scan Again
          </Button>
        </div>
      )}
    </div>
  );
}
