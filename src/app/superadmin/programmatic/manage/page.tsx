'use client'

import Link from 'next/link'

export default function ManageTemplatesPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Plantillas</h1>
      <p className="text-gray-600 mb-6">
        La generación de artículos es automática por código (10 temas definidos). Usa el botón <strong>Probar</strong> en Páginas Programáticas para crear un artículo y ver el progreso en vivo.
      </p>
      <Link
        href="/superadmin/programmatic"
        className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
      >
        ← Volver a Páginas Programáticas
      </Link>
    </div>
  )
}
