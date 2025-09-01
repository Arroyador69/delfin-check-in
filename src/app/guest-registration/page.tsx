"use client";

import { useMemo, useState } from "react";
import { Save, Users, FileText, Globe } from "lucide-react";

type TipoPago = "EFECT" | "TARJT" | "PLATF" | "TRANS" | "MOVIL" | "TREG" | "DESTI" | "OTRO";
type TipoDocumento = "NIF" | "NIE" | "PAS" | "OTRO";
type Sexo = "H" | "M" | "O";
type Parentesco = "AB"|"BA"|"BN"|"CD"|"CY"|"HJ"|"HR"|"NI"|"PM"|"SB"|"SG"|"TI"|"YN"|"TU"|"OT";

interface DireccionForm {
  direccion: string;
  direccionComplementaria?: string;
  codigoPostal: string;
  pais: string; // ISO3
  codigoMunicipio?: string; // INE si ESP
  nombreMunicipio?: string; // si no ESP
}

interface PersonaForm {
  rol: "VI";
  nombre: string;
  apellido1: string;
  apellido2?: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
  soporteDocumento?: string;
  fechaNacimiento: string; // YYYY-MM-DD
  nacionalidad?: string; // ISO3
  sexo?: Sexo;
  contacto: { telefono?: string; telefono2?: string; correo?: string };
  parentesco?: Parentesco;
  direccion: DireccionForm;
}

interface PagoForm {
  tipoPago: TipoPago;
  fechaPago?: string; // YYYY-MM-DD
  medioPago?: string;
  titular?: string;
  caducidadTarjeta?: string; // MM/YYYY
}

interface ContratoForm {
  referencia: string;
  fechaContrato: string; // YYYY-MM-DD
  fechaEntrada: string; // YYYY-MM-DDThh:mm:ss
  fechaSalida: string; // YYYY-MM-DDThh:mm:ss
  numPersonas: number;
  numHabitaciones?: number;
  internet?: boolean;
  pago: PagoForm;
}

export default function GuestRegistrationPage() {
  const [codigoEstablecimiento, setCodigoEstablecimiento] = useState("");
  const [contrato, setContrato] = useState<ContratoForm>({
    referencia: "",
    fechaContrato: "",
    fechaEntrada: "",
    fechaSalida: "",
    numPersonas: 1,
    pago: { tipoPago: "EFECT" }
  });
  const [personas, setPersonas] = useState<PersonaForm[]>([{
    rol: "VI",
    nombre: "",
    apellido1: "",
    fechaNacimiento: "",
    contacto: {},
    direccion: { direccion: "", codigoPostal: "", pais: "ESP", codigoMunicipio: "" }
  }]);
  const [downloading, setDownloading] = useState(false);

  const numMenores = useMemo(() => personas.filter(p => {
    if (!p.fechaNacimiento) return 0;
    const age = Math.floor((Date.now() - new Date(p.fechaNacimiento + "T00:00:00Z").getTime()) / (365.25*24*3600*1000));
    return age < 18;
  }).length, [personas]);

  const addPersona = () => {
    setPersonas(prev => [...prev, { rol: "VI", nombre: "", apellido1: "", fechaNacimiento: "", contacto: {}, direccion: { direccion: "", codigoPostal: "", pais: "ESP", codigoMunicipio: "" } }]);
  };
  const removePersona = (idx: number) => {
    setPersonas(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePersonaChange = (idx: number, patch: Partial<PersonaForm>) => {
    setPersonas(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  };

  const handlePersonaDireccionChange = (idx: number, patch: Partial<DireccionForm>) => {
    setPersonas(prev => prev.map((p, i) => i === idx ? { ...p, direccion: { ...p.direccion, ...patch } } : p));
  };

  const syncNumPersonas = () => setContrato(c => ({ ...c, numPersonas: personas.length }));

  const generarYDescargarXML = async () => {
    setDownloading(true);
    try {
      const payload = {
        codigoEstablecimiento: codigoEstablecimiento.trim(),
        comunicaciones: [{ contrato: { ...contrato, numPersonas: personas.length }, personas }]
      };
      const res = await fetch("/api/ministerio/partes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ? JSON.stringify(err.error) : "Error al generar XML");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `partes_viajeros_${new Date().toISOString().slice(0,10)}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "No se pudo generar el XML");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Registro de partes de viajeros</h1>
                <p className="text-sm text-gray-600">Compatible con Alta masiva del Ministerio</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><FileText className="h-5 w-5 mr-2" />Contrato</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Código establecimiento *</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={codigoEstablecimiento} onChange={e=>setCodigoEstablecimiento(e.target.value)} required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Referencia *</label>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={contrato.referencia} onChange={e=>setContrato(c=>({ ...c, referencia: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha contrato (AAAA-MM-DD) *</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={contrato.fechaContrato} onChange={e=>setContrato(c=>({ ...c, fechaContrato: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entrada (AAAA-MM-DDThh:mm:ss) *</label>
              <input placeholder="2025-09-03T15:00:00" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={contrato.fechaEntrada} onChange={e=>setContrato(c=>({ ...c, fechaEntrada: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Salida (AAAA-MM-DDThh:mm:ss) *</label>
              <input placeholder="2025-09-05T11:00:00" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={contrato.fechaSalida} onChange={e=>setContrato(c=>({ ...c, fechaSalida: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nº habitaciones</label>
              <input type="number" min={1} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={contrato.numHabitaciones ?? ""} onChange={e=>setContrato(c=>({ ...c, numHabitaciones: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Internet</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={String(contrato.internet ?? "")} onChange={e=>setContrato(c=>({ ...c, internet: e.target.value === '' ? undefined : e.target.value === 'true' }))}>
                <option value="">Sin especificar</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pago - tipo *</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={contrato.pago.tipoPago} onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, tipoPago: e.target.value as TipoPago } }))}>
                {["EFECT","TARJT","PLATF","TRANS","MOVIL","TREG","DESTI","OTRO"].map(k=> <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pago - fecha (AAAA-MM-DD)</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={contrato.pago.fechaPago ?? ""} onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, fechaPago: e.target.value || undefined } }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pago - medio/titular/caducidad</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input placeholder="Medio" className="px-3 py-2 border border-gray-300 rounded-md" value={contrato.pago.medioPago ?? ""} onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, medioPago: e.target.value || undefined } }))} />
                <input placeholder="Titular" className="px-3 py-2 border border-gray-300 rounded-md" value={contrato.pago.titular ?? ""} onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, titular: e.target.value || undefined } }))} />
                <input placeholder="MM/AAAA" className="px-3 py-2 border border-gray-300 rounded-md" value={contrato.pago.caducidadTarjeta ?? ""} onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, caducidadTarjeta: e.target.value || undefined } }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Globe className="h-5 w-5 mr-2" />Viajeros</h2>
          <div className="space-y-8">
            {personas.map((p, idx) => (
              <div key={idx} className="border rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Viajero #{idx+1}</h3>
                  {personas.length > 1 && (
                    <button type="button" onClick={() => { removePersona(idx); syncNumPersonas(); }} className="text-red-600 text-sm">Eliminar</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input placeholder="Nombre *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.nombre} onChange={e=>handlePersonaChange(idx,{ nombre: e.target.value })} />
                  <input placeholder="Primer apellido *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.apellido1} onChange={e=>handlePersonaChange(idx,{ apellido1: e.target.value })} />
                  <input placeholder="Segundo apellido (NIF)" className="px-3 py-2 border border-gray-300 rounded-md" value={p.apellido2 ?? ""} onChange={e=>handlePersonaChange(idx,{ apellido2: e.target.value || undefined })} />
                  <input type="date" placeholder="Nacimiento (AAAA-MM-DD) *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.fechaNacimiento} onChange={e=>handlePersonaChange(idx,{ fechaNacimiento: e.target.value })} />
                  <select className="px-3 py-2 border border-gray-300 rounded-md" value={p.tipoDocumento ?? ""} onChange={e=>handlePersonaChange(idx,{ tipoDocumento: (e.target.value || undefined) as TipoDocumento | undefined })}>
                    <option value="">Sin documento (menor)</option>
                    <option value="NIF">NIF</option>
                    <option value="NIE">NIE</option>
                    <option value="PAS">PAS</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                  <input placeholder="Número documento" className="px-3 py-2 border border-gray-300 rounded-md" value={p.numeroDocumento ?? ""} onChange={e=>handlePersonaChange(idx,{ numeroDocumento: e.target.value || undefined })} />
                  <input placeholder="Soporte doc. (NIF/NIE)" className="px-3 py-2 border border-gray-300 rounded-md" value={p.soporteDocumento ?? ""} onChange={e=>handlePersonaChange(idx,{ soporteDocumento: e.target.value || undefined })} />
                  <input placeholder="Nacionalidad (ISO3)" className="px-3 py-2 border border-gray-300 rounded-md" value={p.nacionalidad ?? ""} onChange={e=>handlePersonaChange(idx,{ nacionalidad: e.target.value || undefined })} />
                  <select className="px-3 py-2 border border-gray-300 rounded-md" value={p.sexo ?? ""} onChange={e=>handlePersonaChange(idx,{ sexo: (e.target.value || undefined) as Sexo | undefined })}>
                    <option value="">Sexo</option>
                    <option value="H">H</option>
                    <option value="M">M</option>
                    <option value="O">O</option>
                  </select>
                  <input placeholder="Teléfono" className="px-3 py-2 border border-gray-300 rounded-md" value={p.contacto.telefono ?? ""} onChange={e=>handlePersonaChange(idx,{ contacto: { ...p.contacto, telefono: e.target.value || undefined } })} />
                  <input placeholder="Teléfono 2" className="px-3 py-2 border border-gray-300 rounded-md" value={p.contacto.telefono2 ?? ""} onChange={e=>handlePersonaChange(idx,{ contacto: { ...p.contacto, telefono2: e.target.value || undefined } })} />
                  <input placeholder="Correo" type="email" className="px-3 py-2 border border-gray-300 rounded-md" value={p.contacto.correo ?? ""} onChange={e=>handlePersonaChange(idx,{ contacto: { ...p.contacto, correo: e.target.value || undefined } })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <input placeholder="Dirección *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.direccion.direccion} onChange={e=>handlePersonaDireccionChange(idx,{ direccion: e.target.value })} />
                  <input placeholder="C. Postal *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.direccion.codigoPostal} onChange={e=>handlePersonaDireccionChange(idx,{ codigoPostal: e.target.value })} />
                  <input placeholder="País (ISO3) *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.direccion.pais} onChange={e=>handlePersonaDireccionChange(idx,{ pais: e.target.value })} />
                  {p.direccion.pais === "ESP" ? (
                    <input placeholder="Código municipio INE (5) *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.direccion.codigoMunicipio ?? ""} onChange={e=>handlePersonaDireccionChange(idx,{ codigoMunicipio: e.target.value || undefined })} />
                  ) : (
                    <input placeholder="Nombre municipio *" className="px-3 py-2 border border-gray-300 rounded-md" value={p.direccion.nombreMunicipio ?? ""} onChange={e=>handlePersonaDireccionChange(idx,{ nombreMunicipio: e.target.value || undefined })} />
                  )}
                </div>
                {numMenores > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parentesco con menor (si aplica)</label>
                    <select className="px-3 py-2 border border-gray-300 rounded-md" value={p.parentesco ?? ""} onChange={e=>handlePersonaChange(idx,{ parentesco: (e.target.value || undefined) as Parentesco | undefined })}>
                      <option value="">Sin especificar</option>
                      {["PM","CY","AB","BA","BN","CD","HJ","HR","NI","SB","SG","TI","YN","TU","OT"].map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
            <div className="flex justify-between">
              <button type="button" onClick={() => { addPersona(); syncNumPersonas(); }} className="px-4 py-2 bg-gray-100 rounded-md">Añadir viajero</button>
              <div className="text-sm text-gray-600">Total personas: {personas.length}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button onClick={() => { syncNumPersonas(); generarYDescargarXML(); }} className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" disabled={downloading}>
            {downloading ? "Generando XML…" : (<><Save className="h-4 w-4 mr-2" /> Generar XML</>)}
          </button>
        </div>
      </div>
    </div>
  );
}


