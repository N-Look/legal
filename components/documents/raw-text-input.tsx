"use client";

import { Textarea } from "@/components/ui/textarea";

interface RawTextInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function RawTextInput({ value, onChange }: RawTextInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        placeholder="Paste your legal text here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[200px] resize-y rounded-2xl text-sm leading-relaxed"
      />
      <p className="text-xs text-muted-foreground text-right">
        {value.length > 0 ? `${value.length.toLocaleString()} characters` : "No text entered"}
      </p>
    </div>
  );
}
