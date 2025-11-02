'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ContentTemplate {
  id: string
  name: string
  type: string
  prompt_base: string
  variables_schema: any
  target_length: number
  cta_url: string
  pricing_eur: number
  active: boolean
  created_at: string
  updated_at: string
}

export default function ManageTemplatesPage() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<Partial<ContentTemplate>>({
    name: '',
    type: 'local',
    prompt_base: '',
    variables_schema: {},
    target_length: 800,
    cta_url: 'https://delfincheckin.com/checkout',
    pricing_eur: 29.99,
    active: true
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/superadmin/programmatic/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error obteniendo plantillas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/superadmin/programmatic/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchTemplates()
        setShowCreateForm(false)
        setFormData({
          name: '',
          type: 'local',
          prompt_base: '',
          variables_schema: {},
          target_length: 800,
          cta_url: 'https://delfincheckin.com/checkout',
          pricing_eur: 29.99,
          active: true
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Error creando plantilla')
      }
    } catch (error) {
      console.error('Error creando plantilla:', error)
      alert('Error creando plantilla')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      const template = templates.find(t => t.id === id)
      if (!template) return

      const response = await fetch('/api/superadmin/programmatic/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...formData
        })
      })

      if (response.ok) {
        await fetchTemplates()
        setEditing(null)
        setFormData({
          name: '',
          type: 'local',
          prompt_base: '',
          variables_schema: {},
          target_length: 800,
          cta_url: 'https://delfincheckin.com/checkout',
          pricing_eur: 29.99,
          active: true
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Error actualizando plantilla')
      }
    } catch (error) {
      console.error('Error actualizando plantilla:', error)
      alert('Error actualizando plantilla')
    }
  }

  const startEdit = (template: ContentTemplate) => {
    setEditing(template.id)
    setFormData({
      name: template.name,
      type: template.type,
      prompt_base: template.prompt_base,
      variables_schema: template.variables_schema,
      target_length: template.target_length,
      cta_url: template.cta_url,
      pricing_eur: template.pricing_eur,
      active: template.active
    })
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const template = templates.find(t => t.id === id)
      if (!template) return

      const response = await fetch('/api/superadmin/programmatic/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          active: !currentActive
        })
      })

      if (response.ok) {
        await fetchTemplates()
      } else {
        const error = await response.json()
        alert(error.error || 'Error actualizando plantilla')
      }
    } catch (error) {
      console.error('Error actualizando plantilla:', error)
      alert('Error actualizando plantilla')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando plantillas...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/superadmin/programmatic"
            className="text-blue-600 hover:underline"
          >
            ← Volver a Métricas
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">📋 Gestionar Plantillas</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          {showCreateForm ? 'Cancelar' : '+ Nueva Plantilla'}
        </button>
      </div>

      {/* Formulario de creación */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Crear Nueva Plantilla</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Compra Local - Málaga"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.type || 'local'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="local">Local / Ciudad</option>
                <option value="problem-solution">Problema → Solución</option>
                <option value="feature">Feature-focus</option>
                <option value="comparison">Comparativa</option>
                <option value="pillar">Pilar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prompt Base</label>
              <textarea
                value={formData.prompt_base || ''}
                onChange={(e) => setFormData({ ...formData, prompt_base: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={10}
                placeholder="Escribe el prompt base aquí..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Variables Schema (JSON)</label>
              <textarea
                value={JSON.stringify(formData.variables_schema || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setFormData({ ...formData, variables_schema: parsed })
                  } catch {}
                }}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={6}
                placeholder='{"ciudad": "string", "region": "string"}'
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Longitud Objetivo</label>
                <input
                  type="number"
                  value={formData.target_length || 800}
                  onChange={(e) => setFormData({ ...formData, target_length: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CTA URL</label>
                <input
                  type="text"
                  value={formData.cta_url || ''}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Precio (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricing_eur || 29.99}
                  onChange={(e) => setFormData({ ...formData, pricing_eur: parseFloat(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Crear Plantilla
            </button>
          </div>
        </div>
      )}

      {/* Lista de plantillas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 text-gray-800 font-semibold">Nombre</th>
              <th className="text-left p-4 text-gray-800 font-semibold">Tipo</th>
              <th className="text-left p-4 text-gray-800 font-semibold">Longitud</th>
              <th className="text-left p-4 text-gray-800 font-semibold">Precio</th>
              <th className="text-center p-4 text-gray-800 font-semibold">Estado</th>
              <th className="text-center p-4 text-gray-800 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-8 text-gray-500">
                  No hay plantillas. Crea una nueva para empezar.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="border-b">
                  <td className="p-4">
                    {editing === template.id ? (
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                      />
                    ) : (
                      <div className="font-medium">{template.name}</div>
                    )}
                  </td>
                  <td className="p-4">
                    {editing === template.id ? (
                      <select
                        value={formData.type || 'local'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                      >
                        <option value="local">Local</option>
                        <option value="problem-solution">Problema→Solución</option>
                        <option value="feature">Feature</option>
                        <option value="comparison">Comparativa</option>
                        <option value="pillar">Pilar</option>
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {template.type}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {editing === template.id ? (
                      <input
                        type="number"
                        value={formData.target_length || 800}
                        onChange={(e) => setFormData({ ...formData, target_length: parseInt(e.target.value) })}
                        className="w-24 border rounded px-2 py-1"
                      />
                    ) : (
                      template.target_length
                    )}
                  </td>
                  <td className="p-4">
                    {editing === template.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pricing_eur || 29.99}
                        onChange={(e) => setFormData({ ...formData, pricing_eur: parseFloat(e.target.value) })}
                        className="w-24 border rounded px-2 py-1"
                      />
                    ) : (
                      `€${template.pricing_eur}`
                    )}
                  </td>
                  <td className="text-center p-4">
                    <button
                      onClick={() => toggleActive(template.id, template.active)}
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        template.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {template.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="text-center p-4">
                    {editing === template.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleUpdate(template.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setEditing(null)
                            setFormData({
                              name: '',
                              type: 'local',
                              prompt_base: '',
                              variables_schema: {},
                              target_length: 800,
                              cta_url: 'https://delfincheckin.com/checkout',
                              pricing_eur: 29.99,
                              active: true
                            })
                          }}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => startEdit(template)}
                          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vista detallada para edición de prompt */}
      {editing && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Editar Prompt y Variables</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Prompt Base</label>
              <textarea
                value={formData.prompt_base || ''}
                onChange={(e) => setFormData({ ...formData, prompt_base: e.target.value })}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={15}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Variables Schema (JSON)</label>
              <textarea
                value={JSON.stringify(formData.variables_schema || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setFormData({ ...formData, variables_schema: parsed })
                  } catch {}
                }}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CTA URL</label>
              <input
                type="text"
                value={formData.cta_url || ''}
                onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


