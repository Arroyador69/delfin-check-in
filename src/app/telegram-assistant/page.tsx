"use client";

import { useEffect, useState } from "react";

export default function TelegramAssistantPage() {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [tenantId, setTenantId] = useState("");
  const [chatId, setChatId] = useState("");
  const [tokenLimit, setTokenLimit] = useState<number>(100000);
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
        body: JSON.stringify({ tenantId, chatId, tokenLimit }),
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
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Asistente IA (Telegram)</h1>

      <div className="bg-white border rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">¿Qué es?</h2>
        <p className="text-gray-700">
          Conecta tu propiedad con el bot de Telegram para consultar reservas y
          registros en lenguaje natural con IA (GPT-4o-mini).
        </p>
      </div>

      <div className="bg-white border rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Guía rápida</h2>
        <ol className="list-decimal pl-6 space-y-2 text-gray-700">
          <li>Abre Telegram y busca el bot: <b>@Delfin_check_inbot</b>.</li>
          <li>Escribe <code>/start</code> y copia tu <b>chat_id</b>.</li>
          <li>Introduce abajo tu <b>tenant_id</b> y <b>chat_id</b> y pulsa Activar.</li>
          <li>Pregúntale al bot: "¿Llega alguien hoy?" o "Muéstrame los últimos registros".</li>
        </ol>
      </div>

      <div className="bg-white border rounded p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Activación</h2>
        <div className="grid grid-cols-1 gap-3">
          <input className="border rounded p-2 bg-gray-100" placeholder="Tenant ID" value={tenantId} readOnly />
          <input className="border rounded p-2" placeholder="Chat ID de Telegram" value={chatId} onChange={e=>setChatId(e.target.value)} />
          <div>
            <label className="block text-sm text-gray-600 mb-1">Límite mensual de tokens</label>
            <input type="number" className="border rounded p-2 w-full" value={tokenLimit} onChange={e=>setTokenLimit(Number(e.target.value||0))} />
          </div>
          <button onClick={activar} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Activando...' : 'Activar Telegram'}
          </button>
          {message && <div className="text-sm mt-2">{message}</div>}
        </div>
      </div>

      <div className="bg-white border rounded p-4">
        <h2 className="text-lg font-semibold mb-3">Sugerencias</h2>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>"¿Llega alguien hoy?"</li>
          <li>"¿Quién se va mañana?"</li>
          <li>"¿Adrián rellenó el registro de viajeros?"</li>
          <li>"Muéstrame los últimos 5 registros"</li>
        </ul>
      </div>
    </div>
  );
}


