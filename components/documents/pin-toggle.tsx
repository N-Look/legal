"use client";

import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinToggleProps {
  pinned: boolean;
  onToggle: () => void;
}

export function PinToggle({ pinned, onToggle }: PinToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={`h-8 w-8 rounded-full ${pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      title={pinned ? "Unpin from matter" : "Pin to matter"}
    >
      <Pin className={`w-4 h-4 ${pinned ? "fill-current" : ""}`} />
    </Button>
  );
}
