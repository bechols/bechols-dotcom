import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { wantToReadQueryOptions } from "@/lib/book-queries";
import {
  initOcr,
  isOcrReady,
  captureFrame,
  recognizeFrame,
  terminateOcr,
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

type ScanState = "idle" | "scanning";

/** Normalized de-dupe key for a scan match */
function dedupeKey(match: ScanMatch): string {
  const title = (match.matched?.title ?? match.extracted.title).toLowerCase().trim();
  return match.confidence !== "none" ? `matched:${title}` : `extracted:${title}`;
}

function BookshelfScanner() {
  const { data: wantToReadBooks } = useSuspenseQuery(wantToReadQueryOptions());
  const [isHydrated, setIsHydrated] = useState(false);
  const [ocrReady, setOcrReady] = useState(isOcrReady());
  const [ocrLoadStatus, setOcrLoadStatus] = useState("");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matches, setMatches] = useState<Map<string, ScanMatch>>(new Map());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef(false);

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
    // Load OCR engine eagerly on page mount
    void initOcr((msg) => setOcrLoadStatus(msg)).then(
      () => setOcrReady(true),
      () => setOcrLoadStatus("Failed to load OCR engine."),
    );
  }, []);

  // Cleanup camera and worker on unmount
  useEffect(() => {
    return () => {
      scanLoopRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      void terminateOcr();
    };
  }, []);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
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

  const runScanLoop = useCallback(async () => {
    while (scanLoopRef.current) {
      if (!videoRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      setIsAnalyzing(true);
      try {
        const { url: frameUrl, cleanup } = await captureFrame(videoRef.current);
        const ocrResults = await recognizeFrame(frameUrl);
        cleanup();

        const extracted = parseExtractedBooks(ocrResults);
        const newMatches = matchBooksAgainstWantToRead(
          extracted,
          wantToReadBooks ?? [],
        );

        // Merge into map, keeping higher-scoring match per key
        setMatches((prev) => {
          const next = new Map(prev);
          for (const match of newMatches) {
            const key = dedupeKey(match);
            const existing = next.get(key);
            if (!existing || match.score > existing.score) {
              next.set(key, match);
            }
          }
          return next;
        });
      } catch {
        // Silently continue — transient frame capture errors are expected
      }
      setIsAnalyzing(false);

      // Wait 3 seconds before next frame
      await new Promise((r) => setTimeout(r, 3000));
    }
  }, [wantToReadBooks]);

  const handleStartScanning = useCallback(async () => {
    try {
      await startCamera();
      setScanState("scanning");
      setStatusMessage("");
      scanLoopRef.current = true;
      void runScanLoop();
    } catch {
      setStatusMessage(
        "Camera access denied. Please allow camera access and try again.",
      );
    }
  }, [startCamera, runScanLoop]);

  const handleStopScanning = useCallback(() => {
    scanLoopRef.current = false;
    setIsAnalyzing(false);
    stopCamera();
    setScanState("idle");
  }, [stopCamera]);

  const handleClearResults = useCallback(() => {
    setMatches(new Map());
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <p className="text-gray-500">Loading scanner...</p>
      </div>
    );
  }

  const allMatches = Array.from(matches.values());
  const matchedBooks = allMatches.filter((m) => m.confidence !== "none");
  const unmatchedBooks = allMatches.filter((m) => m.confidence === "none");

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Info box — always visible in idle with no results */}
      {scanState === "idle" && matches.size === 0 && (
        <div className="rounded-lg border bg-gray-50 p-4">
          <h2 className="font-semibold mb-2">Bookshelf Scanner</h2>
          <p className="text-sm text-gray-600 mb-3">
            Point your camera at a bookshelf to find books from your
            want-to-read list. Continuously scans and accumulates results.
            Uses on-device OCR — no data leaves your browser.
          </p>
          <p className="text-xs text-gray-400">
            {wantToReadBooks?.length ?? 0} books in your want-to-read list
          </p>
        </div>
      )}

      {/* OCR loading indicator */}
      {!ocrReady && ocrLoadStatus && scanState === "idle" && (
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-williams-purple shrink-0" />
          <p className="text-sm text-gray-600">{ocrLoadStatus}</p>
        </div>
      )}

      {/* Controls */}
      {scanState === "idle" && (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => void handleStartScanning()}
            disabled={!ocrReady}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            {matches.size > 0 ? "Scan Again" : "Start Scanning"}
          </Button>
          {matches.size > 0 && (
            <Button
              onClick={handleClearResults}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      )}

      {statusMessage && scanState === "idle" && (
        <p className="text-sm text-gray-600">{statusMessage}</p>
      )}

      {/* Compact scanning bar with video thumbnail */}
      {scanState === "scanning" && (
        <div className="flex items-center gap-3">
          <div className="relative w-32 h-24 shrink-0 overflow-hidden rounded-md bg-black">
            <video
              ref={videoCallbackRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                isAnalyzing
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-green-400 animate-pulse"
              }`}
            />
            <span className="text-sm text-gray-600">
              {isAnalyzing ? "Analyzing..." : "Scanning..."}
            </span>
          </div>
          <Button
            onClick={handleStopScanning}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 shrink-0"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        </div>
      )}

      {/* Results — visible whenever there are matches, regardless of scan state */}
      {matches.size > 0 && (
        <div className="flex flex-col gap-4">
          {matchedBooks.length > 0 && (
            <div>
              <h2 className="font-semibold text-green-800 mb-2">
                Found on your want-to-read list ({matchedBooks.length})
              </h2>
              <div className="space-y-1">
                {matchedBooks.map((match) => (
                  <div
                    key={dedupeKey(match)}
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
                {unmatchedBooks.map((match) => (
                  <div
                    key={dedupeKey(match)}
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
        </div>
      )}
    </div>
  );
}
