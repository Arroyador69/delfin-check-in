'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PreviewArticlePage() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [article, setArticle] = useState<{ title: string; content: string; slug: string; is_published?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('Slug no válido');
      setLoading(false);
      return;
    }
    fetch(`/api/blog/articles?slug=${encodeURIComponent(slug)}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Artículo no encontrado');
        return r.json();
      })
      .then((data) => {
        if (data.success && data.article) setArticle(data.article);
        else setError('Artículo no encontrado');
      })
      .catch((e) => setError(e.message || 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Cargando artículo...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <p className="text-red-600 font-semibold">{error || 'Artículo no encontrado'}</p>
          <Link href="/superadmin/blog-manager" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Volver a Gestión de Artículos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/blog-manager" className="text-blue-600 hover:underline text-sm font-medium">
            ← Gestión de Artículos
          </Link>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-600">
            {article.is_published ? '✅ Publicado' : '📝 Borrador'} — Vista previa
          </span>
        </div>
        <span className="text-sm text-gray-500">
          <a
            href={`https://delfincheckin.com/articulos/${article.slug}.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700"
          >
            Ver en delfincheckin.com →
          </a>
          <span className="block text-xs text-gray-400 mt-0.5">(Si sale 404: el HTML debe estar en el repo de la landing)</span>
        </span>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{article.title}</h1>
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content || '<p>Sin contenido.</p>' }}
        />
      </article>
    </div>
  );
}
