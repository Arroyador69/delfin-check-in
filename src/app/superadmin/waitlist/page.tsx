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
  const [surveySending, setSurveySending] = useState(false);
  const [campaigns, setCampaigns] = useState<Array<{ campaign_key: string; sent_count: number; opened_count: number; clicked_count: number; completed_count: number }>>([]);
  const [campaignDetail, setCampaignDetail] = useState<Array<{ email: string; sent_at: string; opened: boolean; clicked: boolean; completed: boolean }>>([]);
  const [selectedCampaignKey, setSelectedCampaignKey] = useState<string | null>(null);
  const [surveyResponses, setSurveyResponses] = useState<Array<{ id: string; email: string; responded_at: string; answers: Record<string, unknown> }>>([]);
  const [responsesCampaignKey, setResponsesCampaignKey] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlist();
    fetchSurveyCampaigns();
  }, []);

  const fetchSurveyCampaigns = async () => {
    try {
      const res = await fetch('/api/superadmin/waitlist/survey/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns) setCampaigns(data.campaigns);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCampaignDetail = async (key: string) => {
    try {
      const res = await fetch(`/api/superadmin/waitlist/survey/campaigns?campaign_key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (data.success && data.detail) {
        setCampaignDetail(data.detail);
        setSelectedCampaignKey(key);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSurveyResponses = async (key?: string) => {
    try {
      const url = key ? `/api/superadmin/waitlist/survey/responses?campaign_key=${encodeURIComponent(key)}` : '/api/superadmin/waitlist/survey/responses';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.responses) {
        setSurveyResponses(data.responses);
        setResponsesCampaignKey(data.campaign_key || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendSurveyToAll = async () => {
    if (!confirm(`¿Enviar la encuesta a los ${pendingEntries.length} pendientes de la waitlist? No se enviará hasta que confirmes.`)) return;
    setSurveySending(true);
    try {
      const res = await fetch('/api/superadmin/waitlist/send-survey', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchWaitlist();
        fetchSurveyCampaigns();
        if (data.campaign_key) fetchCampaignDetail(data.campaign_key);
      } else {
        alert(`❌ ${data.error || 'Error al enviar'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error al enviar encuesta');
    } finally {
      setSurveySending(false);
    }
  };

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

      {/* Encuesta waitlist */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-indigo-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2">📋 Encuesta waitlist</h2>
        <p className="text-gray-600 text-sm mb-4">
          Envía la encuesta a todos los pendientes. Antes puedes ver cómo se ve la encuesta en la landing (estilo Delfín).
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <a
            href="https://delfincheckin.com/encuesta"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            👁️ Ver encuesta (preview)
          </a>
          <button
            onClick={handleSendSurveyToAll}
            disabled={surveySending || pendingEntries.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {surveySending ? 'Enviando...' : `Enviar encuesta a todos (${pendingEntries.length})`}
          </button>
        </div>
        {campaigns.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Campañas de encuesta</h3>
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.campaign_key} className="flex items-center gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fetchCampaignDetail(c.campaign_key)}
                    className="text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  >
                    <span className="font-medium">{c.campaign_key}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      · {c.sent_count} enviados · {c.opened_count} abrieron · {c.clicked_count} clic · {c.completed_count} rellenaron
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchSurveyResponses(c.campaign_key)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Ver respuestas
                  </button>
                </div>
              ))}
            </div>
            {selectedCampaignKey && campaignDetail.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Enviado</th>
                      <th className="text-left py-2">Abierto</th>
                      <th className="text-left py-2">Clic</th>
                      <th className="text-left py-2">Rellenado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignDetail.map((r) => (
                      <tr key={r.email} className="border-b border-gray-100">
                        <td className="py-2">{r.email}</td>
                        <td className="py-2">{new Date(r.sent_at).toLocaleString('es-ES')}</td>
                        <td className="py-2">{r.opened ? '✅' : '—'}</td>
                        <td className="py-2">{r.clicked ? '✅' : '—'}</td>
                        <td className="py-2">{r.completed ? '✅' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Respuestas de la encuesta */}
      {(surveyResponses.length > 0 || responsesCampaignKey) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Respuestas de la encuesta</h2>
          {responsesCampaignKey && (
            <p className="text-gray-600 text-sm mb-4">Campaña: {responsesCampaignKey}</p>
          )}
          <div className="space-y-4">
            {surveyResponses.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900">{r.email}</span>
                  <span className="text-xs text-gray-500">{new Date(r.responded_at).toLocaleString('es-ES')}</span>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {typeof r.answers.want_beta === 'boolean' && <><dt className="text-gray-500">Quiere beta</dt><dd>{r.answers.want_beta ? 'Sí' : 'No'}</dd></>}
                  {r.answers.properties_count && <><dt className="text-gray-500">Propiedades/hab.</dt><dd>{String(r.answers.properties_count)}</dd></>}
                  {r.answers.accommodation_type && <><dt className="text-gray-500">Tipo alojamiento</dt><dd>{String(r.answers.accommodation_type)}</dd></>}
                  {r.answers.has_direct_reservations && <><dt className="text-gray-500">Reservas directas</dt><dd>{String(r.answers.has_direct_reservations)}</dd></>}
                  {r.answers.current_software && <><dt className="text-gray-500">Software actual</dt><dd>{String(r.answers.current_software)}</dd></>}
                  {r.answers.current_monthly_pay && <><dt className="text-gray-500">Pago mensual actual</dt><dd>{String(r.answers.current_monthly_pay)}</dd></>}
                  {r.answers.plan_choice && <><dt className="text-gray-500">Plan elegido</dt><dd>{String(r.answers.plan_choice)}</dd></>}
                  {r.answers.price_perception && <><dt className="text-gray-500">Precio</dt><dd>{String(r.answers.price_perception)}</dd></>}
                  {r.answers.what_features && <><dt className="text-gray-500 col-span-2">Qué le gustaría</dt><dd className="col-span-2">{String(r.answers.what_features)}</dd></>}
                  {r.answers.comments && <><dt className="text-gray-500 col-span-2">Comentarios</dt><dd className="col-span-2">{String(r.answers.comments)}</dd></>}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

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

