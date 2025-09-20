'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Save, Trash2, Send, Settings, Eye, EyeOff } from 'lucide-react';

// Tipo para plantillas de mensajes
interface MessageTemplate {
  id: number;
  name: string;
  trigger_type: string;
  channel: string;
  language: string;
  template_content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tipo para mensajes enviados
interface SentMessage {
  id: number;
  template_id: number;
  reservation_id?: number;
  guest_phone: string;
  guest_name?: string;
  message_content: string;
  whatsapp_message_id?: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  created_at: string;
  template_name?: string;
  trigger_type?: string;
}

// Tipo para configuración de WhatsApp
interface WhatsAppConfig {
  id: number;
  phone_number: string;
  access_token?: string;
  webhook_verify_token?: string;
  is_active: boolean;
}

export default function MessagesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'sent' | 'config'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: '',
    channel: 'whatsapp',
    language: 'es',
    template_content: '',
    variables: [] as string[],
    is_active: true,
  });
  const [configData, setConfigData] = useState({
    phone_number: '+34617555255',
    access_token: '',
    webhook_verify_token: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Obtener plantillas
      const templatesResponse = await fetch('/api/messages/templates');
      const templatesData = await templatesResponse.json();
      if (templatesData.success) {
        setTemplates(templatesData.data);
      }

      // Obtener mensajes enviados
      const sentResponse = await fetch('/api/messages/sent');
      const sentData = await sentResponse.json();
      if (sentData.success) {
        setSentMessages(sentData.data);
      }

      // Obtener configuración de WhatsApp
      const configResponse = await fetch('/api/whatsapp/config');
      const configData = await configResponse.json();
      if (configData.success) {
        setWhatsappConfig(configData.data);
        setConfigData({
          phone_number: configData.data?.phone_number || '+34617555255',
          access_token: configData.data?.access_token || '',
          webhook_verify_token: configData.data?.webhook_verify_token || '',
          is_active: configData.data?.is_active !== false,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingTemplate ? '/api/messages/templates' : '/api/messages/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingTemplate && { id: editingTemplate.id }),
          ...formData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setFormData({
          name: '',
          trigger_type: '',
          channel: 'whatsapp',
          language: 'es',
          template_content: '',
          variables: [],
          is_active: true,
        });
        setEditingTemplate(null);
        fetchData();
        alert(editingTemplate ? 'Plantilla actualizada' : 'Plantilla creada');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar la plantilla');
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      trigger_type: template.trigger_type,
      channel: template.channel,
      language: template.language,
      template_content: template.template_content,
      variables: template.variables,
      is_active: template.is_active,
    });
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return;

    try {
      const response = await fetch(`/api/messages/templates?id=${templateId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchData();
        alert('Plantilla eliminada');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar la plantilla');
    }
  };

  const handleToggleActive = async (template: MessageTemplate) => {
    try {
      const response = await fetch('/api/messages/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          name: template.name,
          trigger_type: template.trigger_type,
          channel: template.channel,
          language: template.language,
          template_content: template.template_content,
          variables: template.variables,
          is_active: !template.is_active
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchData();
        alert('Configuración actualizada exitosamente');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Error al actualizar configuración');
    }
  };

  const getTriggerText = (trigger: string) => {
    switch (trigger) {
      case 'reservation_confirmed': return 'Reserva Confirmada';
      case 't_minus_7_days': return '7 días antes';
      case 't_minus_24_hours': return '24h antes';
      case 'post_checkout': return 'Post check-out';
      case 'checkin_instructions': return 'Instrucciones Check-in';
      case 'send_form': return 'Envío Formulario';
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'sent': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'read': return 'Leído';
      case 'failed': return 'Fallido';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-purple-100 text-purple-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
          {/* Layout responsivo: stack en móvil, side-by-side en desktop */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-3 gap-3">
            <div className="flex items-center">
              <MessageSquare className="h-6 w-6 text-blue-600 mr-2 flex-shrink-0" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Mensajes Automáticos</h1>
                <p className="text-xs text-gray-600 hidden sm:block">Configura plantillas para comunicación automática por WhatsApp</p>
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Plantillas
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mensajes Enviados
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Configuración
            </button>
          </nav>
        </div>

        {/* Botones de acción - Ahora más accesibles */}
        <div className="py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="text-sm font-medium text-gray-700">
              🔧 Acciones de configuración:
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/database/setup-whatsapp');
                    const result = await response.json();
                    if (result.success) {
                      alert('✅ Base de datos de WhatsApp inicializada correctamente\n\nDetalles:\n' + result.steps.join('\n'));
                      fetchData(); // Recargar datos
                    } else {
                      alert(`❌ Error: ${result.error}\n\nDetalles:\n${result.steps ? result.steps.join('\n') : result.details}`);
                    }
                  } catch (error) {
                    alert('❌ Error al inicializar la base de datos: ' + error);
                  }
                }}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Inicializar BD</span>
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/whatsapp/init-config', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                      alert('✅ Configuración de WhatsApp inicializada\n\nTu número +34 617 555 255 está configurado\n\nAhora puedes configurar tu token de acceso');
                      fetchData(); // Recargar datos
                      setActiveTab('config'); // Ir a la pestaña de configuración
                    } else {
                      alert(`❌ Error: ${result.error}`);
                    }
                  } catch (error) {
                    alert('❌ Error al inicializar configuración: ' + error);
                  }
                }}
                className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Inicializar WhatsApp</span>
              </button>
              
              <button
                onClick={() => setActiveTab('config')}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Configurar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Formulario */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-md font-semibold text-gray-900 mb-3">
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nombre de la Plantilla
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ej: Confirmación de Reserva"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Trigger (Cuándo enviar)
                  </label>
                  <select
                    value={formData.trigger_type}
                    onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="">Seleccionar trigger</option>
                    <option value="reservation_confirmed">Reserva Confirmada</option>
                    <option value="t_minus_7_days">7 días antes del check-in</option>
                    <option value="t_minus_24_hours">24h antes del check-in</option>
                    <option value="checkin_instructions">Instrucciones de Check-in</option>
                    <option value="send_form">Envío de Formulario</option>
                    <option value="post_checkout">Post check-out</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Idioma
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Plantilla del Mensaje
                  </label>
                  <textarea
                    value={formData.template_content}
                    onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                    rows={5}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Escribe tu mensaje aquí. Usa variables como: {{guest_name}}, {{room_number}}, {{room_code}}, {{check_in}}, {{check_out}}"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-xs text-gray-900">
                    Plantilla activa
                  </label>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {editingTemplate ? 'Actualizar' : 'Crear'}
                  </button>
                  
                  {editingTemplate && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(null);
                        setFormData({
                          name: '',
                          trigger_type: '',
                          channel: 'whatsapp',
                          language: 'es',
                          template_content: '',
                          variables: [],
                          is_active: true,
                        });
                      }}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Lista de plantillas */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-2 border-b border-gray-200">
                <h2 className="text-md font-semibold text-gray-900">Tus Plantillas</h2>
              </div>
              
              <div className="p-3">
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No hay plantillas configuradas. Crea tu primera plantilla automática.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {template.name}
                              </h3>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {template.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{getTriggerText(template.trigger_type)}</span>
                              <span>{template.language === 'es' ? 'Español' : 'English'}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              {template.template_content.length > 100 ? 
                                `${template.template_content.substring(0, 100)}...` : 
                                template.template_content
                              }
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleToggleActive(template)}
                              className={`p-2 rounded-md ${
                                template.is_active 
                                  ? 'text-yellow-600 hover:bg-yellow-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={template.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {template.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleEdit(template)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
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
        )}

        {activeTab === 'sent' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Mensajes Enviados</h2>
            </div>
            
            <div className="p-6">
              {sentMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay mensajes enviados aún.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Huésped
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plantilla
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Enviado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mensaje
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sentMessages.map((message) => (
                        <tr key={message.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {message.guest_name || 'Sin nombre'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {message.guest_phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {message.template_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status)}`}>
                              {getStatusText(message.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(message.created_at).toLocaleString('es-ES')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {message.message_content}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* Información de ayuda más compacta */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Variables disponibles para tus mensajes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
                <div>
                  <h4 className="font-medium text-blue-800 mb-1 text-xs">Datos del huésped</h4>
                  <ul className="space-y-0.5">
                    <li><strong>{'{{guest_name}}'}</strong> - Nombre del huésped</li>
                    <li><strong>{'{{guest_email}}'}</strong> - Email del huésped</li>
                    <li><strong>{'{{guest_phone}}'}</strong> - Teléfono del huésped</li>
                    <li><strong>{'{{guest_count}}'}</strong> - Número de huéspedes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1 text-xs">Datos de la reserva</h4>
                  <ul className="space-y-0.5">
                    <li><strong>{'{{room_number}}'}</strong> - Número de habitación (1-6)</li>
                    <li><strong>{'{{room_code}}'}</strong> - Código (8101-8106)</li>
                    <li><strong>{'{{check_in}}'}</strong> - Fecha de llegada</li>
                    <li><strong>{'{{check_out}}'}</strong> - Fecha de salida</li>
                  </ul>
                </div>
              </div>
              <div className="mt-2 p-2 bg-blue-100 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1 text-xs">Ejemplo:</h4>
                <p className="text-blue-700 text-xs">
                  ¡Hola <strong>{'{{guest_name}}'}</strong>! Tu habitación es la <strong>{'{{room_number}}'}</strong> (código: <strong>{'{{room_code}}'}</strong>). 
                  Llegada: <strong>{'{{check_in}}'}</strong>.
                </p>
              </div>
            </div>

            {/* Configuración de WhatsApp */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-4">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 p-1.5 rounded-lg mr-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-md font-bold text-gray-900">Configuración de WhatsApp Business</h2>
                  <p className="text-xs text-gray-600">Tu número +34 617 555 255 está configurado. Completa los siguientes pasos:</p>
                </div>
              </div>

              {/* Pasos de configuración */}
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">📋 Pasos para configurar WhatsApp Business API:</h3>
                <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Regístrate en <strong>Meta for Developers</strong> (developers.facebook.com)</li>
                  <li>Crea una aplicación y obtén tu <strong>Access Token</strong></li>
                  <li>Configura un webhook y obtén el <strong>Verify Token</strong></li>
                  <li>Pega los tokens en los campos de abajo</li>
                  <li>Activa WhatsApp marcando la casilla</li>
                </ol>
              </div>
              
              {whatsappConfig && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Número de Teléfono
                      </label>
                      <input
                        type="text"
                        value={configData.phone_number}
                        onChange={(e) => setConfigData({ ...configData, phone_number: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="+34617555255"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <div className="flex items-center pt-1.5">
                        <input
                          type="checkbox"
                          checked={configData.is_active}
                          onChange={(e) => setConfigData({ ...configData, is_active: e.target.checked })}
                          className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-xs text-gray-900">
                          WhatsApp activo
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Access Token (WhatsApp Business API)
                    </label>
                    <input
                      type="password"
                      value={configData.access_token}
                      onChange={(e) => setConfigData({ ...configData, access_token: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Token de acceso de WhatsApp Business API"
                    />
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sin este token, los mensajes se registrarán pero no se enviarán realmente
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Webhook Verify Token
                    </label>
                    <input
                      type="text"
                      value={configData.webhook_verify_token}
                      onChange={(e) => setConfigData({ ...configData, webhook_verify_token: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Token de verificación del webhook"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={handleConfigSubmit}
                      className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                    >
                      <Save className="h-3 w-3 mr-1.5" />
                      Guardar Configuración de WhatsApp
                    </button>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Una vez guardado, podrás enviar mensajes automáticos a tus huéspedes
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información de ayuda compacta para otras pestañas */}
        {activeTab !== 'config' && (
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <details className="cursor-pointer">
              <summary className="text-sm font-semibold text-blue-900 mb-2 hover:text-blue-700">
                📝 Variables disponibles para tus mensajes (click para ver)
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700">
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">Datos del huésped</h5>
                  <ul className="space-y-0.5">
                    <li><strong>{'{{guest_name}}'}</strong> - Nombre del huésped</li>
                    <li><strong>{'{{guest_email}}'}</strong> - Email del huésped</li>
                    <li><strong>{'{{guest_phone}}'}</strong> - Teléfono del huésped</li>
                    <li><strong>{'{{guest_count}}'}</strong> - Número de huéspedes</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">Datos de la reserva</h5>
                  <ul className="space-y-0.5">
                    <li><strong>{'{{room_number}}'}</strong> - Número de habitación (1-6)</li>
                    <li><strong>{'{{room_code}}'}</strong> - Código de acceso (8101-8106)</li>
                    <li><strong>{'{{room_location}}'}</strong> - Ubicación específica de la habitación</li>
                    <li><strong>{'{{bathroom_info}}'}</strong> - Información sobre el baño (privado/compartido)</li>
                    <li><strong>{'{{check_in}}'}</strong> - Fecha de llegada</li>
                    <li><strong>{'{{check_out}}'}</strong> - Fecha de salida</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-100 rounded text-xs">
                <strong className="text-blue-800">Ejemplo:</strong>
                <span className="text-blue-700 ml-1">
                  ¡Hola <strong>{'{{guest_name}}'}</strong>! Tu habitación es la <strong>{'{{room_number}}'}</strong>. 
                  Código: <strong>{'{{room_code}}'}</strong>
                </span>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}