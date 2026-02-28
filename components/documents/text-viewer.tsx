"use client";

import { useState, useEffect } from "react";

interface TextViewerProps {
  url: string;
}

export function TextViewer({ url }: TextViewerProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.text();
      })
      .then((content) => {
        if (!cancelled) setText(content);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Failed to load text preview.
      </div>
    );
  }

  if (text === null) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Loading text...
      </div>
    );
  }

  return (
    <pre className="text-xs whitespace-pre-wrap break-words bg-muted/50 rounded-lg p-4 overflow-auto max-h-[60vh]">
      {text}
    </pre>
  );
}
