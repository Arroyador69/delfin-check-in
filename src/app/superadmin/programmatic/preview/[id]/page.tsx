'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { marked } from 'marked'

interface ProgrammaticPage {
  id: string
  template_id: string | null
  type: string
  slug: string
  canonical_url: string
  title: string
  meta_description: string | null
  content_html: string
  content_jsonld: Record<string, any> | null
  variables_used: Record<string, any>
  seo_score: number
  local_signals_count: number
  word_count: number
  status: string
  publish_at: string | null
  is_test: boolean
  created_at: string
  template_name: string | null
}

export default function PreviewPage() {
  const params = useParams()
  const pageId = params.id as string
  const [page, setPage] = useState<ProgrammaticPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPage()
  }, [pageId])

  const fetchPage = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/superadmin/programmatic/pages/${pageId}`)
      
      if (response.ok) {
        const data = await response.json()
        setPage(data.page)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error cargando página')
      }
    } catch (err) {
      setError('Error al cargar la página')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando página...</div>
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error || 'Página no encontrada'}</p>
        </div>
        <Link
          href="/superadmin/programmatic/manage"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Volver a Plantillas
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con información */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/superadmin/programmatic/manage"
                className="text-blue-600 hover:underline text-sm"
              >
                ← Volver a Plantillas
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                📄 Vista Previa: {page.title}
              </h1>
              <div className="flex gap-4 mt-2 text-sm text-gray-600">
                <span>Plantilla: {page.template_name || 'N/A'}</span>
                <span>•</span>
                <span>Slug: {page.slug}</span>
                <span>•</span>
                <span>Palabras: {page.word_count}</span>
                <span>•</span>
                <span>Score SEO: {page.seo_score}/100</span>
                {page.is_test && (
                  <>
                    <span>•</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                      PÁGINA DE PRUEBA
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={page.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                🔗 Ver en producción
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          {/* Meta información */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Meta Información</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Título:</span>
                <span className="ml-2 text-gray-900">{page.title}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Meta Descripción:</span>
                <span className="ml-2 text-gray-900">{page.meta_description || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Canonical URL:</span>
                <span className="ml-2 text-gray-900">{page.canonical_url}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Estado:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                  page.status === 'published' ? 'bg-green-100 text-green-700' :
                  page.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                  page.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {page.status}
                </span>
              </div>
            </div>
          </div>

      {/* Contenido renderizado exacto (HTML del servidor) */}
      <div className="w-full min-h-[600px] border rounded-lg overflow-hidden bg-white">
        <iframe
          title="preview"
          src={`/api/superadmin/programmatic/render/${page.id}`}
          style={{ width: '100%', height: '80vh', border: '0' }}
        />
      </div>

          {/* JSON-LD */}
          {page.content_jsonld && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">JSON-LD Schema</h2>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(page.content_jsonld, null, 2)}
              </pre>
            </div>
          )}

          {/* Variables usadas */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Variables Usadas</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(page.variables_used, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

