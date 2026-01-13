'use client';

import { useState, useEffect } from 'react';

interface WaitlistEntry {
  id: string;
  email: string;
  name?: string;
  source?: string;
  notes?: string;
  created_at: string;
  activated_at?: string;
  tenant_id?: string;
}

export default function SuperAdminWaitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    activated: 0
  });
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: '',
    html: '',
    text: ''
  });
  const [activating, setActivating] = useState<Set<string>>(new Set());
  const [cleaning, setCleaning] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/superadmin/waitlist');
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries || []);
        setStats(data.stats || { total: 0, pending: 0, activated: 0 });
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailSelection = (email: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(email)) {
      newSelection.delete(email);
    } else {
      newSelection.add(email);
    }
    setSelectedEmails(newSelection);
  };

  const selectAllPending = () => {
    const pendingEmails = entries
      .filter(e => !e.activated_at)
      .map(e => e.email);
    setSelectedEmails(new Set(pendingEmails));
  };

  const clearSelection = () => {
    setSelectedEmails(new Set());
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedEmails.size === 0) {
      alert('Selecciona al menos un email');
      return;
    }

    try {
      const response = await fetch('/api/superadmin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: Array.from(selectedEmails),
          subject: emailForm.subject,
          html: emailForm.html,
          text: emailForm.text,
          emailType: 'custom'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowEmailModal(false);
        setEmailForm({ subject: '', html: '', text: '' });
        setSelectedEmails(new Set());
      } else {
        alert(`❌ Error: ${data.error || 'Error al enviar emails'}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error al enviar emails');
    }
  };

  const handleActivateUser = async (entryId: string, email: string) => {
    if (!confirm(`¿Activar usuario ${email}? Se creará el tenant y se enviará el email de onboarding.`)) {
      return;
    }

    setActivating(prev => new Set(prev).add(entryId));

    try {
      const response = await fetch('/api/superadmin/waitlist/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Usuario activado correctamente!\n\nTenant ID: ${data.tenant_id}\nEmail enviado: ${data.email_sent ? 'Sí' : 'No'}`);
        // Recargar lista
        fetchWaitlist();
      } else {
        if (data.alreadyActivated) {
          alert(`⚠️ Este usuario ya está activado.\n\nTenant ID: ${data.tenant_id || 'N/A'}`);
          fetchWaitlist();
        } else {
          alert(`❌ Error: ${data.error || 'Error al activar usuario'}\n\n${data.details || ''}`);
        }
      }
    } catch (error) {
      console.error('Error activating user:', error);
      alert('Error al activar usuario');
    } finally {
      setActivating(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleCleanUser = async (email: string) => {
    if (!confirm(`⚠️ ¿Eliminar completamente el usuario ${email}?\n\nEsto eliminará:\n- Entrada en waitlist\n- Tenant (si existe)\n- Usuarios del tenant\n- Referencias en referidos/afiliados\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    setCleaning(prev => new Set(prev).add(email));

    try {
      const response = await fetch('/api/superadmin/waitlist/clean-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (data.success) {
        const results = data.results || {};
        const details = [
          results.deleted_from_waitlist && '✅ Eliminado de waitlist',
          results.deleted_from_tenants && '✅ Eliminado de tenants',
          results.deleted_from_tenant_users && '✅ Eliminado de tenant_users',
          results.deleted_from_referrals && '✅ Eliminado de referrals',
          results.deleted_from_affiliate_customers && '✅ Eliminado de affiliate_customers',
        ].filter(Boolean).join('\n');

        alert(`✅ Usuario eliminado completamente\n\n${details}\n\n${results.tenant_id_deleted ? `Tenant ID eliminado: ${results.tenant_id_deleted}` : ''}`);
        // Recargar lista
        fetchWaitlist();
      } else {
        alert(`❌ Error: ${data.error || 'Error al limpiar usuario'}\n\n${data.details || ''}`);
      }
    } catch (error) {
      console.error('Error cleaning user:', error);
      alert('Error al limpiar usuario');
    } finally {
      setCleaning(prev => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const pendingEntries = entries.filter(e => !e.activated_at);
  const activatedEntries = entries.filter(e => e.activated_at);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📋 Waitlist</h1>
          <p className="text-gray-700 mt-2">Gestiona la lista de espera de usuarios interesados</p>
        </div>
        {selectedEmails.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📧 Enviar Email ({selectedEmails.size})
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total registros</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-sm text-yellow-600">Pendientes</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{stats.activated}</div>
          <div className="text-sm text-green-600">Activados</div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={selectAllPending}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            Seleccionar todos pendientes
          </button>
          <button
            onClick={clearSelection}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Limpiar selección
          </button>
        </div>
      </div>

      {/* Lista de pendientes */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Pendientes ({pendingEntries.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {pendingEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay registros pendientes
            </div>
          ) : (
            pendingEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 hover:bg-gray-50 ${
                  selectedEmails.has(entry.email) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(entry.email)}
                        onChange={() => toggleEmailSelection(entry.email)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{entry.email}</div>
                        {entry.name && (
                          <div className="text-sm text-gray-600">Nombre: {entry.name}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Registrado: {new Date(entry.created_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {entry.source && (
                          <div className="text-xs text-gray-500">Fuente: {entry.source}</div>
                        )}
                        {entry.notes && (
                          <div className="text-xs text-gray-500 mt-1">Notas: {entry.notes}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivateUser(entry.id, entry.email);
                      }}
                      disabled={activating.has(entry.id) || cleaning.has(entry.email)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activating.has(entry.id) || cleaning.has(entry.email)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {activating.has(entry.id) ? 'Activando...' : '🚀 Activar'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCleanUser(entry.email);
                      }}
                      disabled={activating.has(entry.id) || cleaning.has(entry.email)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                        activating.has(entry.id) || cleaning.has(entry.email)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                      title="Eliminar completamente de la base de datos (útil para testing)"
                    >
                      {cleaning.has(entry.email) ? 'Limpiando...' : '🗑️ Limpiar'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lista de activados */}
      {activatedEntries.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Activados ({activatedEntries.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {activatedEntries.map((entry) => (
              <div key={entry.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{entry.email}</div>
                    {entry.name && (
                      <div className="text-sm text-gray-600">Nombre: {entry.name}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Registrado: {new Date(entry.created_at).toLocaleDateString('es-ES')}
                      {entry.activated_at && (
                        <> · Activado: {new Date(entry.activated_at).toLocaleDateString('es-ES')}</>
                      )}
                    </div>
                    {entry.tenant_id && (
                      <div className="text-xs text-blue-600 mt-1">Tenant ID: {entry.tenant_id}</div>
                    )}
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCleanUser(entry.email);
                      }}
                      disabled={cleaning.has(entry.email)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                        cleaning.has(entry.email)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                      title="Eliminar completamente de la base de datos (útil para testing)"
                    >
                      {cleaning.has(entry.email) ? 'Limpiando...' : '🗑️ Limpiar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de envío de email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Enviar Email a {selectedEmails.size} destinatarios</h2>
            
            <form onSubmit={handleSendEmail}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinatarios
                </label>
                <div className="bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                  {Array.from(selectedEmails).map((email) => (
                    <div key={email} className="text-sm text-gray-700">{email}</div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto *
                </label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Asunto del email"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenido HTML *
                </label>
                <textarea
                  required
                  value={emailForm.html}
                  onChange={(e) => setEmailForm({ ...emailForm, html: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={10}
                  placeholder="<html>...</html>"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenido Texto (opcional)
                </label>
                <textarea
                  value={emailForm.text}
                  onChange={(e) => setEmailForm({ ...emailForm, text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={5}
                  placeholder="Versión texto del email"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

