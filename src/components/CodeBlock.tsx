import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps): ReactNode {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), 1200);
      });
    }
  }, [code]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <pre className="group border-border bg-muted/30 relative overflow-x-auto rounded-md border">
      {language && (
        <span className="mono-tag text-muted-foreground/45 absolute top-1.5 left-1.5 z-10">
          {language}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        title="Copy code"
        className="focus-visible:ring-ember/40 absolute top-1.5 right-1.5 z-10 opacity-40 transition-opacity group-hover:opacity-80 focus-visible:opacity-80 focus-visible:ring-1 focus-visible:outline-none"
      >
        {copied ? <Check className="text-ember h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <code className="block px-3 py-2.5 font-mono text-[12.5px] leading-relaxed whitespace-pre">
        {code}
      </code>
    </pre>
  );
}
