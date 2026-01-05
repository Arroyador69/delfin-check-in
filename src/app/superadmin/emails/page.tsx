'use client'

import { useEffect, useState } from 'react'

interface Email {
  id: string
  tenantId?: string
  emailType: string
  recipientEmail: string
  subject: string
  status: string
  openedAt?: string
  clickedAt?: string
  openedCount: number
  clickedCount: number
  conversionType?: string
  conversionValue?: number
  createdAt: string
}

export default function SuperAdminEmails() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    html: '',
    text: '',
    emailType: 'custom' as 'onboarding' | 'legal_notice' | 'upsell' | 'incident' | 'custom',
    tenantId: ''
  })

  useEffect(() => {
    fetchEmails()
  }, [])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      // TODO: Crear endpoint para obtener emails
      // Por ahora usamos un placeholder
      setEmails([])
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/superadmin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Email enviado correctamente')
        setShowSendModal(false)
        setFormData({
          to: '',
          subject: '',
          html: '',
          text: '',
          emailType: 'custom',
          tenantId: ''
        })
        fetchEmails()
      } else {
        alert('Error al enviar email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Error al enviar email')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📬 Email Tracking</h1>
          <p className="text-gray-700 mt-2">Gestiona y envía emails desde el superadmin</p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Enviar Email
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-gray-600">El tracking de emails se mostrará aquí una vez que se envíen emails desde el sistema.</p>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Enviar Email</h2>
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Para (email o emails separados por coma)</label>
                <input
                  type="text"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="usuario@ejemplo.com o usuario1@ejemplo.com, usuario2@ejemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asunto</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Email</label>
                <select
                  value={formData.emailType}
                  onChange={(e) => setFormData({ ...formData, emailType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="custom">Personalizado</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="legal_notice">Aviso Legal</option>
                  <option value="upsell">Upsell</option>
                  <option value="incident">Incidencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">HTML</label>
                <textarea
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={10}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Texto Plano (opcional)</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tenant ID (opcional)</label>
                <input
                  type="text"
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="UUID del tenant"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

