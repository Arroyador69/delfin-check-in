"use client";

import { useEffect, useState } from "react";

export default function TelegramAssistantPage() {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [tenantId, setTenantId] = useState("");
  const [chatId, setChatId] = useState("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // Obtener info del tenant actual (x-tenant-id la inyecta el middleware)
    const fetchInfo = async () => {
      try {
        const res = await fetch("/api/tenants/me", { cache: "no-store" });
        const data = await res.json();
        if (data?.tenant?.id) setTenantId(data.tenant.id);
        setInfo(data);
      } catch (e) {
        // ignorar
      }
    };
    fetchInfo();
  }, []);

  const activar = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, chatId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Telegram activado correctamente");
      } else {
        setMessage(`❌ Error: ${data.error || "desconocido"}`);
      }
    } catch (e: any) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h1 className="text-3xl font-bold mb-6 text-center">
            <span className="text-4xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🤖</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Asistente IA (Telegram)</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="mr-2">ℹ️</span> ¿Qué es?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Conecta tu propiedad con la Inteligencia Artificial de Delfín Check in de Telegram para consultar reservas y registros en lenguaje natural.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="mr-2">📋</span> Guía rápida
            </h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>Abre Telegram y busca el bot: <b>@Delfin_check_inbot</b>.</li>
              <li>Escribe <code className="bg-gray-100 px-2 py-1 rounded">/start</code> y copia tu <b>chat_id</b>.</li>
              <li>Introduce abajo tu <b>tenant_id</b> y <b>chat_id</b> y pulsa Activar.</li>
              <li>Pregúntale al bot: "¿Llega alguien hoy?" o "Muéstrame los últimos registros".</li>
            </ol>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mt-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
            <span className="mr-2">⚙️</span> Activación
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <input 
              className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300" 
              placeholder="Tenant ID" 
              value={tenantId} 
              readOnly 
            />
            <input 
              className="border-2 border-gray-200 rounded-xl p-4 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300" 
              placeholder="Chat ID de Telegram" 
              value={chatId} 
              onChange={e=>setChatId(e.target.value)} 
            />
            <button 
              onClick={activar} 
              disabled={loading} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {loading ? '⏳ Activando...' : '🚀 Activar Telegram'}
            </button>
            {message && (
              <div className="text-sm mt-3 p-3 rounded-lg font-semibold bg-blue-50 border border-blue-200 text-blue-800">
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mt-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <span className="mr-2">💡</span> Sugerencias
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>"¿Llega alguien hoy?"</li>
                <li>"¿Quién se va mañana?"</li>
              </ul>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>"¿Adrián rellenó el registro de viajeros?"</li>
                <li>"Muéstrame los últimos 5 registros"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


