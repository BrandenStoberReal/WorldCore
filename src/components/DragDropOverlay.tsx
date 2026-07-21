import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

interface ImportFileState {
  fileName: string;
  status: FileStatus;
  error?: string;
}

const IMPORT_ENDPOINT = '/api/v1/characters/import';
const CHARACTER_LIST_QUERY_KEY = ['/api/v1/characters/all'] as const;
const REJECT_HOLD_MS = 2000;

function isPngFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith('.png') || file.type === 'image/png';
}

async function postImport(file: File): Promise<void> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(IMPORT_ENDPOINT, { method: 'POST', body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Import failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { ok: true; id: number };
  if (!data?.ok) {
    throw new Error('Import failed: malformed response');
  }
}

export function DragDropOverlay() {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [files, setFiles] = useState<ImportFileState[]>([]);

  // Counter pattern: dragenter fires per child element; only hide when it
  // returns to 0 (cursor actually left the window).
  const dragCounterRef = useRef(0);
  // Guard against stale async updates after unmount / Esc reset.
  const sessionRef = useRef(0);

  const resetOverlay = useCallback(() => {
    dragCounterRef.current = 0;
    setIsDragging(false);
    setIsProcessing(false);
    setRejected(false);
    setFiles([]);
  }, []);

  // ── Window-level drag/drop listeners ───────────────────────
  useEffect(() => {
    const hasFiles = (e: DragEvent): boolean => {
      const types = e.dataTransfer?.types;
      if (!types) return false;
      for (let i = 0; i < types.length; i++) {
        if (types[i] === 'Files') return true;
      }
      return false;
    };

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (!hasFiles(e)) return;
      dragCounterRef.current += 1;
      setRejected(false);
      setIsDragging(true);
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (!hasFiles(e)) return;
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const fileList = e.dataTransfer?.files;
      if (!fileList || fileList.length === 0) return;

      const dropped = Array.from(fileList);
      const pngs = dropped.filter(isPngFile);

      if (pngs.length === 0) {
        setRejected(true);
        window.setTimeout(() => setRejected(false), REJECT_HOLD_MS);
        return;
      }

      const sessionId = ++sessionRef.current;
      const initial: ImportFileState[] = pngs.map((f) => ({
        fileName: f.name,
        status: 'pending' as FileStatus,
      }));
      setFiles(initial);
      setIsProcessing(true);

      let anySuccess = false;
      let i = 0;
      for (const file of pngs) {
        if (sessionRef.current !== sessionId) {
          // Aborted (Esc) mid-flight — stop scheduling new uploads.
          return;
        }
        const idx = i;
        i += 1;
        setFiles((prev) =>
          prev.map((f, j) => (j === idx ? { ...f, status: 'uploading' as FileStatus } : f)),
        );
        try {
          await postImport(file);
          if (sessionRef.current !== sessionId) return;
          anySuccess = true;
          setFiles((prev) =>
            prev.map((f, j) => (j === idx ? { ...f, status: 'success' as FileStatus } : f)),
          );
        } catch (err) {
          if (sessionRef.current !== sessionId) return;
          const message = err instanceof Error ? err.message : String(err);
          setFiles((prev) =>
            prev.map((f, j) =>
              j === idx ? { ...f, status: 'error' as FileStatus, error: message } : f,
            ),
          );
        }
      }

      if (sessionRef.current !== sessionId) return;
      if (anySuccess) {
        queryClient.invalidateQueries({ queryKey: [...CHARACTER_LIST_QUERY_KEY] });
      }
      setIsProcessing(false);
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isProcessing) return; // don't interrupt in-flight uploads
      resetOverlay();
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('keydown', onKeydown);
    };
  }, [queryClient, isProcessing, resetOverlay]);

  const visible = isDragging || isProcessing || rejected;

  return (
    <div
      className={cn(
        'overlay-fade fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
        !visible && 'overlay-hidden',
      )}
      style={{
        background:
          'radial-gradient(circle at 78% 18%, color-mix(in oklch, var(--ember) 12%, transparent) 0%, transparent 50%), color-mix(in oklch, var(--background) 82%, transparent)',
      }}
    >
      <div
        className={cn(
          'relative w-full max-w-lg overflow-y-auto rounded-sm border border-dashed',
          'border-border bg-card text-card-foreground',
          'shadow-[0_24px_70px_-12px_color-mix(in_oklch,var(--ember)_45%,transparent)]',
          'px-6 py-10',
        )}
      >
        {rejected ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="text-ember h-10 w-10" />
            <h2 className="display-host text-[20px] leading-none tracking-tight">
              PNG character cards only
            </h2>
            <p className="mono-tag text-muted-foreground/60">{`{ rejected }`}</p>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Loader2 className="text-ember h-5 w-5 animate-spin" />
              <h2 className="display-host text-[20px] leading-none tracking-tight">
                Importing character cards
              </h2>
            </div>
            <ul className="flex flex-col gap-1.5">
              {files.map((f, idx) => (
                <li
                  key={`${f.fileName}-${idx}`}
                  className="border-border/60 bg-background/40 flex items-center justify-between gap-3 rounded-sm border px-3 py-2"
                >
                  <span className="text-foreground/80 truncate text-sm">{f.fileName}</span>
                  <span className="flex items-center gap-1.5">
                    {f.status === 'pending' && (
                      <span className="mono-tag text-muted-foreground/60">pending</span>
                    )}
                    {f.status === 'uploading' && (
                      <Loader2 className="text-ember h-3.5 w-3.5 animate-spin" />
                    )}
                    {f.status === 'success' && <Check className="text-ember h-3.5 w-3.5" />}
                    {f.status === 'error' && <X className="text-ember h-3.5 w-3.5" />}
                  </span>
                </li>
              ))}
            </ul>
            {files.some((f) => f.status === 'error') && (
              <p className="mono-tag text-ember/70 text-xs">some files failed — see server logs</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-accent/30 flex h-16 w-16 items-center justify-center rounded-sm">
              <Upload className="text-ember h-7 w-7" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="display-host text-[20px] leading-none tracking-tight">
                Drop PNG character cards
              </h2>
              <p className="mono-tag text-muted-foreground/60">Release to import</p>
            </div>
            <p className="mono-tag text-muted-foreground/40 text-xs">{`{ esc to dismiss }`}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DragDropOverlay;
