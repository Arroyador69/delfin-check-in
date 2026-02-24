'use client'

import Link from 'next/link'

export default function ManageTemplatesPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Plantillas</h1>
      <p className="text-gray-600 mb-6">
        La generación de artículos es automática por código (10 temas definidos).
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/superadmin/programmatic/crear-articulo"
          className="inline-flex items-center px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          Probar: crear 1 artículo
        </Link>
        <Link
          href="/superadmin/programmatic"
          className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
        >
          ← Páginas Programáticas
        </Link>
      </div>
    </div>
  )
}
