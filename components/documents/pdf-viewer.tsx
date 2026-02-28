"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  if (loadError) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Failed to load PDF preview.
      </div>
    );
  }

  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      onLoadError={() => setLoadError(true)}
      loading={
        <div className="text-sm text-muted-foreground text-center py-8">
          Loading PDF...
        </div>
      }
    >
      {numPages &&
        Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i + 1}
            pageNumber={i + 1}
            width={328}
            className="mb-2"
          />
        ))}
    </Document>
  );
}
