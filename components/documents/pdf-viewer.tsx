"use client";

interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  return (
    <iframe
      src={url}
      className="w-full rounded-lg border border-border/50"
      style={{ height: "60vh" }}
      title="PDF preview"
    />
  );
}
