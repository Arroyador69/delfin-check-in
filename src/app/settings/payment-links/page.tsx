'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, ExternalLink, Calendar, Euro, Users, Home, Bed, X, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { paymentLinkIsActiveForUi } from '@/lib/payment-links-ui';

interface PaymentLink {
  id: number;
  link_code: string;
  link_name: string | null;
  guest_locale?: string | null;
  resource_type: 'room' | 'property';
  resource_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  base_price_per_night: number | null;
  cleaning_fee: number;
  expected_guests: number;
  expires_at: string | null;
  is_active: boolean;
  usage_count: number;
  max_uses: number | null;
  payment_completed: boolean;
  payment_completed_at: string | null;
  reservation_id: number | null;
  internal_notes: string | null;
  created_at: string;
  link_url?: string;
}

interface RoomSlot {
  room_id: string;
  room_name: string;
  property_id: number | null;
  property_name: string | null;
  is_placeholder: boolean;
}

interface Property {
  id: number;
  property_name: string;
}

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [slots, setSlots] = useState<RoomSlot[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    link_name: '',
    resource_type: 'room' as 'room' | 'property',
    resource_id: '',
    check_in_date: '',
    check_out_date: '',
    total_price: '',
    base_price_per_night: '',
    cleaning_fee: '0',
    expected_guests: '2',
    expires_at: '',
    max_uses: '',
    internal_notes: '',
  });

  useEffect(() => {
    loadLinks();
    loadResources();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment-links', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        const baseUrl = process.env.NEXT_PUBLIC_BOOK_URL || 'https://book.delfincheckin.com';
        const linksWithUrls = (data.links as PaymentLink[]).map((link: PaymentLink) => ({
          ...link,
          link_url: `${baseUrl}/pay/${link.link_code}`,
        }));
        setLinks(linksWithUrls);
      }
    } catch (error) {
      console.error('Error cargando enlaces:', error);
      setMessage({ type: 'error', text: 'Error cargando enlaces de pago' });
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    try {
      // Cargar slots de habitaciones
      const slotsRes = await fetch('/api/tenant/property-slots', { credentials: 'include' });
      const slotsData = await slotsRes.json();
      if (slotsRes.ok && slotsData.success) {
        setSlots(slotsData.slots || []);
      }

      // Cargar propiedades
      const propsRes = await fetch('/api/tenant/properties', { credentials: 'include' });
      const propsData = await propsRes.json();
      if (propsRes.ok && propsData.success) {
        const raw = (propsData.properties || []) as any[];
        const realProps = raw
          .filter((p) => p && p.id != null && Number.isFinite(Number(p.id)))
          .map((p) => ({ id: Number(p.id), property_name: String(p.property_name || '') }))
          .filter((p) => p.property_name.trim().length > 0);
        setProperties(realProps);
      }
    } catch (error) {
      console.error('Error cargando recursos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_price: parseFloat(formData.total_price),
          base_price_per_night: formData.base_price_per_night ? parseFloat(formData.base_price_per_night) : null,
          cleaning_fee: parseFloat(formData.cleaning_fee),
          expected_guests: parseInt(formData.expected_guests),
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          expires_at: formData.expires_at || null
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Enlace de pago creado correctamente' });
        setShowForm(false);
        resetForm();
        loadLinks();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error creando enlace' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error creando enlace' });
    }
  };

  const handleDelete = async (linkCode: string) => {
    if (!confirm('¿Eliminar este enlace de pago? No podrás recuperarlo.')) {
      return;
    }

    try {
      const response = await fetch(`/api/payment-links/${linkCode}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Enlace eliminado correctamente' });
        setLinks((prev) => prev.filter((l) => l.link_code !== linkCode));
        loadLinks();
      } else {
        const msg =
          data.error ||
          (response.status === 401
            ? 'No autorizado: vuelve a iniciar sesión e inténtalo de nuevo.'
            : 'Error desactivando enlace');
        setMessage({ type: 'error', text: msg });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desactivando enlace';
      setMessage({ type: 'error', text: msg });
    }
  };

  const copyToClipboard = async (text: string, linkCode: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkCode);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      link_name: '',
      resource_type: 'room',
      resource_id: '',
      check_in_date: '',
      check_out_date: '',
      total_price: '',
      base_price_per_night: '',
      cleaning_fee: '0',
      expected_guests: '2',
      expires_at: '',
      max_uses: '',
      internal_notes: '',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <LinkIcon className="w-8 h-8 mr-3 text-blue-600" />
            Enlaces de Pago
          </h1>
          <p className="text-gray-600 mt-2">
            Crea enlaces personalizados para que tus clientes puedan realizar pagos directamente
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Enlace
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Crear Nuevo Enlace de Pago</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del enlace (opcional)
                </label>
                <input
                  type="text"
                  value={formData.link_name}
                  onChange={(e) => setFormData({ ...formData, link_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Reserva Navidad 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de recurso *
                </label>
                <select
                  value={formData.resource_type}
                  onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as 'room' | 'property', resource_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="room">Slot de Habitación</option>
                  <option value="property" disabled={properties.length === 0}>Propiedad</option>
                </select>
                {properties.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No tienes propiedades configuradas para crear enlaces por propiedad.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.resource_type === 'room' ? 'Habitación *' : 'Propiedad *'}
                </label>
                <select
                  value={formData.resource_id}
                  onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecciona...</option>
                  {formData.resource_type === 'room' ? (
                    slots.map((slot) => (
                      <option key={slot.room_id} value={slot.room_id}>
                        {slot.room_name} {slot.property_name ? `(${slot.property_name})` : ''}
                      </option>
                    ))
                  ) : (
                    properties.map((prop) => (
                      <option key={prop.id} value={String(prop.id)}>
                        {prop.property_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de entrada *
                </label>
                <input
                  type="date"
                  value={formData.check_in_date}
                  onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de salida *
                </label>
                <input
                  type="date"
                  value={formData.check_out_date}
                  onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio total (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_price}
                  onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio por noche (€) (opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price_per_night}
                  onChange={(e) => setFormData({ ...formData, base_price_per_night: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarifa de limpieza (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cleaning_fee}
                  onChange={(e) => setFormData({ ...formData, cleaning_fee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Huéspedes esperados
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.expected_guests}
                  onChange={(e) => setFormData({ ...formData, expected_guests: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de expiración (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="hidden">
                {/* Los enlaces son siempre de un solo uso */}
                <input type="hidden" value="1" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas internas (opcional)
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear Enlace
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : links.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay enlaces de pago</h3>
          <p className="text-gray-600 mb-6">Crea tu primer enlace de pago para empezar</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crear Enlace
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre / Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recurso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado / Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usos / Fecha pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {links.map((link) => (
                  <tr key={link.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {link.link_name || link.link_code}
                      </div>
                      <div className="text-xs text-gray-500">{link.link_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        {link.resource_type === 'room' ? (
                          <Bed className="w-4 h-4 mr-2 text-blue-600" />
                        ) : (
                          <Home className="w-4 h-4 mr-2 text-green-600" />
                        )}
                        {link.resource_type === 'room' ? 'Habitación' : 'Propiedad'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatDate(link.check_in_date)}</div>
                      <div className="text-xs text-gray-500">hasta {formatDate(link.check_out_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(link.total_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            paymentLinkIsActiveForUi(link.is_active)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {paymentLinkIsActiveForUi(link.is_active) ? 'Activo' : 'Inactivo'}
                        </span>
                        {link.payment_completed && (
                          <div className="flex items-center text-xs text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pagado
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {link.usage_count} {link.max_uses ? `/ ${link.max_uses}` : ''}
                      </div>
                      {link.payment_completed_at && (
                        <div className="text-xs text-gray-500">
                          {new Date(link.payment_completed_at).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyToClipboard(link.link_url || '', link.link_code)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Copiar enlace"
                        >
                          {copiedLink === link.link_code ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                        <a
                          href={link.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900"
                          title="Abrir enlace"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                        <button
                          onClick={() => handleDelete(link.link_code)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar enlace"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

