"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface PdfViewerHandle {
  scrollToText: (text: string) => void;
  clearHighlights: () => void;
}

interface PdfViewerProps {
  url: string;
  highlightText?: string | null;
}

/**
 * Normalises whitespace so that the fuzzy search can match across
 * line-breaks / double-spaces that PDF text extraction often produces.
 */
function normalise(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(
  function PdfViewer({ url, highlightText }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [rendered, setRendered] = useState(false);

    // Store references to text layer data for each page
    const textLayerDataRef = useRef<
      {
        pageDiv: HTMLDivElement;
        textDivs: HTMLElement[];
        textContent: string[];
      }[]
    >([]);

    // ── Clear existing highlights ──────────────────────────────────────────
    const clearHighlights = useCallback(() => {
      if (!containerRef.current) return;
      containerRef.current
        .querySelectorAll(".pdf-quote-highlight")
        .forEach((el) => {
          const parent = el.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent || ""), el);
            parent.normalize();
          }
        });
    }, []);

    // ── Search text layers and scroll + highlight ──────────────────────────
    const scrollToText = useCallback(
      (text: string) => {
        clearHighlights();

        const needle = normalise(text);
        if (!needle) return;

        const data = textLayerDataRef.current;
        if (!data.length) return;

        // Try to find the needle across the concatenated text of each page
        for (const page of data) {
          // Build a map: for each character position in the normalised
          // page string, track which textDiv (span) and offset within it.
          const spans = page.textDivs;
          const items = page.textContent;

          // Build normalised full-page text + char→span mapping
          let fullText = "";
          const charMap: { spanIdx: number; charIdx: number }[] = [];

          for (let si = 0; si < spans.length; si++) {
            const raw = items[si] || spans[si].textContent || "";
            for (let ci = 0; ci < raw.length; ci++) {
              const ch = raw[ci];
              // Collapse whitespace the same way normalise() does
              if (/\s/.test(ch)) {
                if (fullText.length > 0 && fullText[fullText.length - 1] !== " ") {
                  fullText += " ";
                  charMap.push({ spanIdx: si, charIdx: ci });
                }
              } else {
                fullText += ch.toLowerCase();
                charMap.push({ spanIdx: si, charIdx: ci });
              }
            }
            // Add a space between spans to mirror natural word separation
            if (fullText.length > 0 && fullText[fullText.length - 1] !== " ") {
              fullText += " ";
              charMap.push({ spanIdx: si, charIdx: (items[si] || "").length });
            }
          }

          const matchIdx = fullText.indexOf(needle);
          if (matchIdx === -1) continue;

          // We found the text on this page – highlight the matching spans
          const matchEnd = matchIdx + needle.length;
          const startMap = charMap[matchIdx];
          const endMap = charMap[Math.min(matchEnd, charMap.length - 1)];

          if (!startMap || !endMap) continue;

          // Collect affected span indices
          const affectedSpans = new Set<number>();
          for (let i = matchIdx; i < matchEnd && i < charMap.length; i++) {
            affectedSpans.add(charMap[i].spanIdx);
          }

          let firstHighlight: HTMLElement | null = null;

          for (const si of affectedSpans) {
            const span = spans[si];
            if (!span) continue;

            // Wrap entire span content in a highlight <mark>
            const mark = document.createElement("mark");
            mark.className = "pdf-quote-highlight";
            mark.style.backgroundColor = "rgba(250, 204, 21, 0.45)";
            mark.style.borderRadius = "2px";
            mark.style.color = "inherit";
            mark.style.padding = "1px 0";
            mark.textContent = span.textContent;
            span.textContent = "";
            span.appendChild(mark);

            if (!firstHighlight) firstHighlight = mark;
          }

          // Scroll the first highlighted element into view
          if (firstHighlight) {
            firstHighlight.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
          return; // Stop after first match
        }
      },
      [clearHighlights]
    );

    // ── Expose the imperative handle ────────────────────────────────────────
    useImperativeHandle(ref, () => ({ scrollToText, clearHighlights }), [
      scrollToText,
      clearHighlights,
    ]);

    // ── React to highlightText prop changes ─────────────────────────────────
    useEffect(() => {
      if (!highlightText) {
        clearHighlights();
        return;
      }
      if (!rendered) return; // Wait until text layers are ready
      const t = setTimeout(() => scrollToText(highlightText), 50);
      return () => clearTimeout(t);
    }, [highlightText, rendered, scrollToText, clearHighlights]);

    // ── Render PDF pages + text layers ──────────────────────────────────────
    useEffect(() => {
      let cancelled = false;

      async function render() {
        try {
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

          const pdf = await pdfjs.getDocument(url).promise;
          if (cancelled || !containerRef.current) return;

          containerRef.current.innerHTML = "";
          textLayerDataRef.current = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            if (cancelled || !containerRef.current) return;

            const containerWidth = containerRef.current.clientWidth;
            const unscaledViewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / unscaledViewport.width;
            const viewport = page.getViewport({ scale });

            // Page wrapper (positions text layer over canvas)
            const pageDiv = document.createElement("div");
            pageDiv.dataset.page = String(i);
            pageDiv.style.position = "relative";
            pageDiv.style.width = `${viewport.width}px`;
            pageDiv.style.height = `${viewport.height}px`;
            pageDiv.style.marginBottom = "12px";
            pageDiv.className = "rounded-lg shadow-sm overflow-hidden";

            // Canvas
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.display = "block";
            pageDiv.appendChild(canvas);

            // Text layer container
            const textLayerDiv = document.createElement("div");
            textLayerDiv.className = "textLayer";
            textLayerDiv.style.position = "absolute";
            textLayerDiv.style.top = "0";
            textLayerDiv.style.left = "0";
            textLayerDiv.style.width = "100%";
            textLayerDiv.style.height = "100%";
            textLayerDiv.style.overflow = "hidden";
            textLayerDiv.style.opacity = "0.3";
            textLayerDiv.style.lineHeight = "1";
            pageDiv.appendChild(textLayerDiv);

            containerRef.current.appendChild(pageDiv);

            // Render canvas
            const ctx = canvas.getContext("2d")!;
            await page.render({
              canvasContext: ctx,
              viewport,
              canvas,
            } as Parameters<typeof page.render>[0]).promise;

            // Render text layer
            const textContent = await page.getTextContent();
            const textLayer = new pdfjs.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
            });
            await textLayer.render();

            // Store text layer data for searching
            textLayerDataRef.current.push({
              pageDiv,
              textDivs: textLayer.textDivs,
              textContent: textLayer.textContentItemsStr,
            });
          }

          if (!cancelled) {
            setLoading(false);
            setRendered(true);
          }
        } catch {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        }
      }

      setRendered(false);
      render();
      return () => {
        cancelled = true;
      };
    }, [url]);

    if (error) {
      return (
        <div className="text-sm text-muted-foreground text-center py-8">
          Failed to load PDF preview.
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Rendering pages...</span>
          </div>
        )}
        <div ref={containerRef} />
      </div>
    );
  }
);
