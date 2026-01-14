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
  is_test?: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export default function ManageTemplatesPage() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [formData, setFormData] = useState<Partial<ContentTemplate>>({
    name: '',
    type: 'local',
    prompt_base: '',
    variables_schema: {},
    target_length: 800,
    active: true
  })
  const [variablesSchemaText, setVariablesSchemaText] = useState<string>('{}')
  const [deletingTestPages, setDeletingTestPages] = useState(false)
  const [showTestPagesManager, setShowTestPagesManager] = useState(false)
  const [testPages, setTestPages] = useState<Array<{
    id: string
    slug: string
    title: string
    status: string
    created_at: string
  }>>([])
  const [selectedTestPages, setSelectedTestPages] = useState<Set<string>>(new Set())
  const [loadingTestPages, setLoadingTestPages] = useState(false)

  useEffect(() => {
    fetchTemplates()
    if (showTestPagesManager) {
      fetchTestPages()
    }
  }, [showTestPagesManager])

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
          active: true
        })
        setVariablesSchemaText('{}')
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
      active: template.active
    })
    setVariablesSchemaText(JSON.stringify(template.variables_schema || {}, null, 2))
  }

  const fetchTestPages = async () => {
    try {
      setLoadingTestPages(true)
      const response = await fetch('/api/superadmin/programmatic/test-pages')
      if (response.ok) {
        const data = await response.json()
        setTestPages(data.pages || [])
      }
    } catch (error) {
      console.error('Error obteniendo páginas de prueba:', error)
    } finally {
      setLoadingTestPages(false)
    }
  }

  const handleDeleteAllTestPages = async () => {
    // Primera confirmación
    if (!confirm('⚠️ PRIMERA CONFIRMACIÓN:\n\n¿Estás seguro de que quieres eliminar TODAS las páginas de prueba?\n\nEsta acción NO se puede deshacer.')) {
      return
    }

    // Segunda confirmación (doble verificación)
    if (!confirm('⚠️ SEGUNDA CONFIRMACIÓN:\n\n¿REALMENTE estás seguro?\n\nSe eliminarán TODAS las páginas de prueba de forma permanente.\n\nEscribe "ELIMINAR TODO" para confirmar.')) {
      return
    }

    const finalConfirm = prompt('Escribe "ELIMINAR TODO" para confirmar la eliminación:')
    if (finalConfirm !== 'ELIMINAR TODO') {
      alert('❌ Confirmación cancelada. No se eliminó nada.')
      return
    }

    try {
      setDeletingTestPages(true)
      const response = await fetch('/api/superadmin/programmatic/delete-test-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}\n\nEliminadas: ${data.deleted} páginas${data.deletedPages ? '\n\n' + data.deletedPages.slice(0, 10).join('\n') + (data.deletedPages.length > 10 ? `\n... y ${data.deletedPages.length - 10} más` : '') : ''}`)
        if (showTestPagesManager) {
          await fetchTestPages()
        }
      } else {
        const error = await response.json()
        alert(`❌ Error: ${error.error || 'Error eliminando páginas de prueba'}`)
      }
    } catch (error) {
      console.error('Error eliminando páginas de prueba:', error)
      alert('❌ Error eliminando páginas de prueba')
    } finally {
      setDeletingTestPages(false)
    }
  }

  const handleToggleTestPage = (pageId: string) => {
    const newSelection = new Set(selectedTestPages)
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId)
    } else {
      newSelection.add(pageId)
    }
    setSelectedTestPages(newSelection)
  }

  const handleSelectAllTestPages = () => {
    if (selectedTestPages.size === testPages.length) {
      setSelectedTestPages(new Set())
    } else {
      setSelectedTestPages(new Set(testPages.map(p => p.id)))
    }
  }

  const handleDeleteSelectedTestPages = async () => {
    if (selectedTestPages.size === 0) {
      alert('⚠️ No has seleccionado ninguna página para eliminar')
      return
    }

    // Primera confirmación
    if (!confirm(`⚠️ ¿Estás seguro de que quieres eliminar ${selectedTestPages.size} página(s) de prueba seleccionada(s)?\n\nEsta acción NO se puede deshacer.`)) {
      return
    }

    try {
      setDeletingTestPages(true)
      const response = await fetch('/api/superadmin/programmatic/delete-selected-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: Array.from(selectedTestPages) })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}\n\nEliminadas: ${data.deleted} página(s)${data.deletedPages ? '\n\n' + data.deletedPages.join('\n') : ''}`)
        setSelectedTestPages(new Set())
        await fetchTestPages()
      } else {
        const error = await response.json()
        alert(`❌ Error: ${error.error || 'Error eliminando páginas seleccionadas'}`)
      }
    } catch (error) {
      console.error('Error eliminando páginas seleccionadas:', error)
      alert('❌ Error eliminando páginas seleccionadas')
    } finally {
      setDeletingTestPages(false)
    }
  }

  const createTestPage = async (templateId: string) => {
    try {
      setGeneratingId(templateId)
      setProgress(10)

      // Progreso simulado mientras esperamos la respuesta
      const interval = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 5 : p))
      }, 400)

      // Obtener variables de ejemplo según el tipo de plantilla
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      let testVariables: Record<string, any> = {}
      
      // Generar variables de ejemplo según el tipo
      if (template.type === 'local') {
        testVariables = {
          ciudad: 'Málaga',
          region: 'Andalucía',
          dolor_principal: 'Cumplimiento normativo RD 933',
          features_clave: ['RD 933 en lote', 'Cola offline', 'Microsite', 'Stripe split', 'Facturación', 'Calculadora de costes'],
          sin_garantia: false,
          precio: 14.99
        }
      } else if (template.type === 'problem-solution') {
        testVariables = {
          problema: 'Gestionar partes de viajeros sin complicaciones',
          beneficios: ['Automatización', 'Cumplimiento normativo', 'Ahorro de tiempo']
        }
      } else if (template.type === 'feature') {
        testVariables = {
          feature: 'Microsite de reservas',
          por_que_importa: 'Permite reservas directas sin comisiones de plataformas'
        }
      } else if (template.type === 'comparison') {
        testVariables = {
          alternativa: 'Sistema tradicional'
        }
      } else if (template.type === 'pillar') {
        testVariables = {
          tema: 'RD 933 y cumplimiento normativo'
        }
      }

      const response = await fetch('/api/superadmin/programmatic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          variables: testVariables,
          is_test: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        setProgress(100)
        clearInterval(interval)
        // Si está publicado, abrir URL pública; si no, abrir preview interna
        const publicUrl = data?.slug ? `https://delfincheckin.com/${data.slug}/` : ''
        const previewUrl = `/superadmin/programmatic/preview/${data.page_id}`
        window.open(data.status === 'published' ? publicUrl : previewUrl, '_blank')
      } else {
        clearInterval(interval)
        const error = await response.json()
        
        // Mensajes de error más específicos
        let errorMessage = error.error || 'Error desconocido'
        
        if (error.code === 'DUPLICATE_SLUG') {
          errorMessage = `El slug "${error.duplicateSlug || 'desconocido'}" ya existe.\n\n` +
            `El sistema intentará generar un slug único automáticamente. ` +
            `Si el problema persiste, intenta con diferentes variables o espera un momento.`
        } else if (response.status === 409) {
          errorMessage = `Conflicto: ${errorMessage}\n\n` +
            `Esto suele ocurrir cuando se intenta crear una página con un slug que ya existe. ` +
            `El sistema debería generar automáticamente un slug único.`
        }
        
        alert(`❌ Error creando página de prueba:\n\n${errorMessage}`)
      }
    } catch (error) {
      console.error('Error creando página de prueba:', error)
      alert(`❌ Error creando página de prueba:\n\n${error instanceof Error ? error.message : 'Error desconocido'}\n\nPor favor, verifica la consola para más detalles.`)
    }
    finally {
      // Pequeño retraso para que se vea el 100%
      setTimeout(() => {
        setGeneratingId(null)
        setProgress(0)
      }, 600)
    }
  }

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la plantilla "${templateName}"?\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch(`/api/superadmin/programmatic/templates?id=${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTemplates()
        alert('✅ Plantilla eliminada correctamente')
      } else {
        const error = await response.json()
        alert(`❌ Error eliminando plantilla:\n${error.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error eliminando plantilla:', error)
      alert('❌ Error eliminando plantilla')
    }
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
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowTestPagesManager(!showTestPagesManager)
              if (!showTestPagesManager) {
                fetchTestPages()
              }
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            {showTestPagesManager ? '❌ Cerrar Gestor' : '📄 Gestionar Páginas de Prueba'}
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {showCreateForm ? 'Cancelar' : '+ Nueva Plantilla'}
          </button>
        </div>
      </div>

      {/* Formulario de creación */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Crear Nueva Plantilla</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Nombre</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Compra Local - Málaga"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Tipo</label>
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
              <label className="block text-sm font-medium mb-1 text-gray-700">Prompt Base</label>
              <textarea
                value={formData.prompt_base || ''}
                onChange={(e) => setFormData({ ...formData, prompt_base: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={10}
                placeholder="Escribe el prompt base aquí..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Variables Schema (JSON)</label>
              <textarea
                value={variablesSchemaText}
                onChange={(e) => {
                  const newValue = e.target.value
                  setVariablesSchemaText(newValue)
                  // Intentar parsear el JSON y actualizar formData solo si es válido
                  try {
                    const parsed = JSON.parse(newValue)
                    setFormData({ ...formData, variables_schema: parsed })
                  } catch {
                    // Si no es válido, simplemente no actualizamos variables_schema
                    // pero permitimos que el usuario siga editando
                  }
                }}
                onBlur={() => {
                  // Al perder el foco, intentar parsear una vez más
                  try {
                    const parsed = JSON.parse(variablesSchemaText)
                    setFormData({ ...formData, variables_schema: parsed })
                  } catch {
                    // Si no es válido, resetear al último valor válido
                    setVariablesSchemaText(JSON.stringify(formData.variables_schema || {}, null, 2))
                  }
                }}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={6}
                placeholder='{"ciudad": "string", "region": "string"}'
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Longitud Objetivo</label>
                <input
                  type="number"
                  value={formData.target_length || 800}
                  onChange={(e) => setFormData({ ...formData, target_length: parseInt(e.target.value) })}
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
              <th className="text-center p-4 text-gray-800 font-semibold">Estado</th>
              <th className="text-center p-4 text-gray-800 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-gray-500">
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
                        className="w-full border rounded px-2 py-1 text-gray-900"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">{template.name}</div>
                    )}
                  </td>
                  <td className="p-4">
                    {editing === template.id ? (
                      <select
                        value={formData.type || 'local'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-gray-900"
                      >
                        <option value="local">Local</option>
                        <option value="problem-solution">Problema→Solución</option>
                        <option value="feature">Feature</option>
                        <option value="comparison">Comparativa</option>
                        <option value="pillar">Pilar</option>
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-800 font-medium">
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
                        className="w-24 border rounded px-2 py-1 text-gray-900"
                      />
                    ) : (
                      <span className="text-gray-900 font-medium">{template.target_length}</span>
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
                              active: true
                            })
                            setVariablesSchemaText('{}')
                          }}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3 justify-center items-center">
                        <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => createTestPage(template.id)}
                            disabled={generatingId === template.id}
                            className={`px-3 py-1 rounded text-sm text-white ${generatingId === template.id ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                          title="Crear una página de prueba con esta plantilla"
                        >
                            {generatingId === template.id ? 'Generando…' : '🧪 Probar'}
                        </button>
                          {generatingId === template.id && (
                            <div className="w-28 h-1 bg-gray-200 rounded overflow-hidden">
                              <div className="h-full bg-purple-600 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(template)}
                          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(template.id, template.name)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          title="Eliminar esta plantilla"
                        >
                          🗑️ Eliminar
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
              <label className="block text-sm font-medium mb-1 text-gray-700">Prompt Base</label>
              <textarea
                value={formData.prompt_base || ''}
                onChange={(e) => setFormData({ ...formData, prompt_base: e.target.value })}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={15}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Variables Schema (JSON)</label>
              <textarea
                value={variablesSchemaText}
                onChange={(e) => {
                  const newValue = e.target.value
                  setVariablesSchemaText(newValue)
                  // Intentar parsear el JSON y actualizar formData solo si es válido
                  try {
                    const parsed = JSON.parse(newValue)
                    setFormData({ ...formData, variables_schema: parsed })
                  } catch {
                    // Si no es válido, simplemente no actualizamos variables_schema
                    // pero permitimos que el usuario siga editando
                  }
                }}
                onBlur={() => {
                  // Al perder el foco, intentar parsear una vez más
                  try {
                    const parsed = JSON.parse(variablesSchemaText)
                    setFormData({ ...formData, variables_schema: parsed })
                  } catch {
                    // Si no es válido, resetear al último valor válido
                    setVariablesSchemaText(JSON.stringify(formData.variables_schema || {}, null, 2))
                  }
                }}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={8}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


