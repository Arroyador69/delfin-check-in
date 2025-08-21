'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@/lib/supabase';
import { MessageSquare, Save, Plus, Trash2, Send } from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [formData, setFormData] = useState({
    trigger: '',
    channel: 'telegram' as 'email' | 'telegram' | 'whatsapp',
    template: '',
    language: 'es' as 'es' | 'en',
    is_active: true,
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('trigger');

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMessage) {
        const { error } = await supabase
          .from('messages')
          .update(formData)
          .eq('id', editingMessage.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('messages')
          .insert(formData);

        if (error) throw error;
      }

      setFormData({
        trigger: '',
        channel: 'telegram',
        template: '',
        language: 'es',
        is_active: true,
      });
      setEditingMessage(null);
      fetchMessages();
    } catch (error) {
      console.error('Error saving message:', error);
      alert('Error al guardar el mensaje');
    }
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setFormData({
      trigger: message.trigger,
      channel: message.channel,
      template: message.template,
      language: message.language,
      is_active: message.is_active,
    });
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Error al eliminar el mensaje');
    }
  };

  const handleToggleActive = async (message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_active: !message.is_active })
        .eq('id', message.id);

      if (error) throw error;
      fetchMessages();
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const getTriggerText = (trigger: string) => {
    switch (trigger) {
      case 'reservation_confirmed': return 'Reserva Confirmada';
      case 't_minus_7_days': return '7 días antes';
      case 't_minus_24_hours': return '24h antes';
      case 'post_checkout': return 'Post check-out';
      case 'checkin_instructions': return 'Instrucciones Check-in';
      default: return trigger;
    }
  };

  const getChannelText = (channel: string) => {
    switch (channel) {
      case 'telegram': return 'Telegram';
      case 'email': return 'Email';
      case 'whatsapp': return 'WhatsApp';
      default: return channel;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mensajes Automáticos</h1>
                <p className="text-sm text-gray-600">Configura plantillas para comunicación automática</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {editingMessage ? 'Editar Mensaje' : 'Nuevo Mensaje'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger (Cuándo enviar)
                </label>
                <select
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar trigger</option>
                  <option value="reservation_confirmed">Reserva Confirmada</option>
                  <option value="t_minus_7_days">7 días antes del check-in</option>
                  <option value="t_minus_24_hours">24h antes del check-in</option>
                  <option value="checkin_instructions">Instrucciones de Check-in</option>
                  <option value="post_checkout">Post check-out</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canal
                </label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plantilla del Mensaje
                </label>
                <textarea
                  value={formData.template}
                  onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe tu mensaje aquí. Usa {{variable}} para datos dinámicos."
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Mensaje activo
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingMessage ? 'Actualizar' : 'Crear'}
                </button>
                
                {editingMessage && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessage(null);
                      setFormData({
                        trigger: '',
                        channel: 'telegram',
                        template: '',
                        language: 'es',
                        is_active: true,
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de mensajes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tus Mensajes</h2>
            </div>
            
            <div className="p-6">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay mensajes configurados. Crea tu primer mensaje automático.
                </p>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {getTriggerText(message.trigger)}
                            </h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              message.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {message.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{getChannelText(message.channel)}</span>
                            <span>{message.language === 'es' ? 'Español' : 'English'}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {message.template.substring(0, 100)}...
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggleActive(message)}
                            className={`p-2 rounded-md ${
                              message.is_active 
                                ? 'text-yellow-600 hover:bg-yellow-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={message.is_active ? 'Desactivar' : 'Activar'}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(message)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información de ayuda */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Variables disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Datos del huésped</h4>
              <ul className="space-y-1">
                <li><code>{{guest_name}}</code> - Nombre del huésped</li>
                <li><code>{{guest_email}}</code> - Email del huésped</li>
                <li><code>{{guest_phone}}</code> - Teléfono del huésped</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Datos de la reserva</h4>
              <ul className="space-y-1">
                <li><code>{{room_number}}</code> - Número de habitación</li>
                <li><code>{{room_code}}</code> - Código de la habitación</li>
                <li><code>{{check_in_date}}</code> - Fecha de llegada</li>
                <li><code>{{check_out_date}}</code> - Fecha de salida</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
