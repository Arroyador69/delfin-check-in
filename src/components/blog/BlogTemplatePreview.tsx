'use client';

/**
 * Vista previa del HTML ya montado con articulos/_template.html (misma web pública).
 */

type Props = {
  html: string | null;
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function BlogTemplatePreview({ html, open, onClose, title = 'Vista previa' }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/60 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-gray-100 p-2">
          {html ? (
            <iframe
              title={title}
              srcDoc={html}
              className="h-[min(85vh,900px)] w-full rounded border border-gray-200 bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <p className="p-8 text-center text-gray-500">Sin contenido para previsualizar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
