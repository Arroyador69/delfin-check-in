"use client";

import { useMemo, useState } from "react";
import { Save, Users, FileText, Globe, Languages } from "lucide-react";

type TipoPago = "EFECT" | "TARJT" | "PLATF" | "TRANS" | "MOVIL" | "TREG" | "DESTI" | "OTRO";
type TipoDocumento = "NIF" | "NIE" | "PAS" | "OTRO";
type Sexo = "H" | "M" | "O";
type Parentesco = "AB"|"BA"|"BN"|"CD"|"CY"|"HJ"|"HR"|"NI"|"PM"|"SB"|"SG"|"TI"|"YN"|"TU"|"OT";

type Language = "es" | "en" | "fr";

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

// Traducciones
const translations = {
  es: {
    title: "Registro de parte de viajero",
    subtitle: "Compatible con alta en el Ministerio del Interior de España",
    contract: "Contrato",
    travelers: "Viajeros",
    submit: "Enviar registro",
    submitting: "Enviando...",
    success: "Registro enviado correctamente",
    error: "Error al enviar el registro",
    // Campos del contrato
    establishmentCode: "Código establecimiento *",
    reference: "Referencia *",
    contractDate: "Fecha contrato (AAAA-MM-DD) *",
    checkIn: "Entrada (AAAA-MM-DDThh:mm:ss) *",
    checkOut: "Salida (AAAA-MM-DDThh:mm:ss) *",
    numRooms: "Nº habitaciones",
    internet: "Internet",
    paymentType: "Tipo de pago *",
    paymentDate: "Fecha de pago (AAAA-MM-DD)",
    paymentMethod: "Medio de pago",
    cardholder: "Titular",
    cardExpiry: "Caducidad (MM/AAAA)",
    // Campos de personas
    traveler: "Viajero",
    firstName: "Nombre *",
    lastName1: "Primer apellido *",
    lastName2: "Segundo apellido",
    birthDate: "Fecha nacimiento (AAAA-MM-DD) *",
    documentType: "Tipo documento",
    documentNumber: "Número documento",
    documentSupport: "Soporte documento",
    nationality: "Nacionalidad (ISO3)",
    gender: "Sexo",
    phone: "Teléfono",
    phone2: "Teléfono 2",
    email: "Correo electrónico",
    address: "Dirección *",
    postalCode: "Código postal *",
    country: "País (ISO3) *",
    municipalityCode: "Código municipio INE (5) *",
    municipalityName: "Nombre municipio *",
    relationship: "Parentesco con menor",
    addTraveler: "Añadir viajero",
    removeTraveler: "Eliminar",
    totalPeople: "Total personas",
    // Opciones
    unspecified: "Sin especificar",
    yes: "Sí",
    no: "No",
    // Tipos de pago
    cash: "Efectivo",
    card: "Tarjeta",
    platform: "Plataforma",
    transfer: "Transferencia",
    mobile: "Móvil",
    check: "Cheque",
    destination: "Destino",
    other: "Otro",
    // Tipos de documento
    nif: "NIF",
    nie: "NIE",
    passport: "Pasaporte",
    otherDoc: "Otro",
    // Géneros
    male: "Masculino",
    female: "Femenino",
    other: "Otro",
    // Sin documento
    noDocument: "Sin documento (menor)"
  },
  en: {
    title: "Traveler registration form",
    subtitle: "Compatible with Spanish Ministry of Interior registration",
    contract: "Contract",
    travelers: "Travelers",
    submit: "Submit registration",
    submitting: "Submitting...",
    success: "Registration submitted successfully",
    error: "Error submitting registration",
    // Contract fields
    establishmentCode: "Establishment code *",
    reference: "Reference *",
    contractDate: "Contract date (YYYY-MM-DD) *",
    checkIn: "Check-in (YYYY-MM-DDThh:mm:ss) *",
    checkOut: "Check-out (YYYY-MM-DDThh:mm:ss) *",
    numRooms: "Number of rooms",
    internet: "Internet",
    paymentType: "Payment type *",
    paymentDate: "Payment date (YYYY-MM-DD)",
    paymentMethod: "Payment method",
    cardholder: "Cardholder",
    cardExpiry: "Expiry (MM/YYYY)",
    // Person fields
    traveler: "Traveler",
    firstName: "First name *",
    lastName1: "First surname *",
    lastName2: "Second surname",
    birthDate: "Birth date (YYYY-MM-DD) *",
    documentType: "Document type",
    documentNumber: "Document number",
    documentSupport: "Document support",
    nationality: "Nationality (ISO3)",
    gender: "Gender",
    phone: "Phone",
    phone2: "Phone 2",
    email: "Email",
    address: "Address *",
    postalCode: "Postal code *",
    country: "Country (ISO3) *",
    municipalityCode: "Municipality code INE (5) *",
    municipalityName: "Municipality name *",
    relationship: "Relationship with minor",
    addTraveler: "Add traveler",
    removeTraveler: "Remove",
    totalPeople: "Total people",
    // Options
    unspecified: "Unspecified",
    yes: "Yes",
    no: "No",
    // Payment types
    cash: "Cash",
    card: "Card",
    platform: "Platform",
    transfer: "Transfer",
    mobile: "Mobile",
    check: "Check",
    destination: "Destination",
    other: "Other",
    // Document types
    nif: "NIF",
    nie: "NIE",
    passport: "Passport",
    otherDoc: "Other",
    // Genders
    male: "Male",
    female: "Female",
    other: "Other",
    // No document
    noDocument: "No document (minor)"
  },
  fr: {
    title: "Formulaire d'enregistrement des voyageurs",
    subtitle: "Compatible avec l'enregistrement du ministère de l'Intérieur espagnol",
    contract: "Contrat",
    travelers: "Voyageurs",
    submit: "Soumettre l'enregistrement",
    submitting: "Soumission...",
    success: "Enregistrement soumis avec succès",
    error: "Erreur lors de la soumission",
    // Champs du contrat
    establishmentCode: "Code établissement *",
    reference: "Référence *",
    contractDate: "Date contrat (AAAA-MM-JJ) *",
    checkIn: "Arrivée (AAAA-MM-JJThh:mm:ss) *",
    checkOut: "Départ (AAAA-MM-JJThh:mm:ss) *",
    numRooms: "Nombre de chambres",
    internet: "Internet",
    paymentType: "Type de paiement *",
    paymentDate: "Date de paiement (AAAA-MM-JJ)",
    paymentMethod: "Moyen de paiement",
    cardholder: "Titulaire",
    cardExpiry: "Expiration (MM/AAAA)",
    // Champs des personnes
    traveler: "Voyageur",
    firstName: "Prénom *",
    lastName1: "Premier nom de famille *",
    lastName2: "Deuxième nom de famille",
    birthDate: "Date de naissance (AAAA-MM-JJ) *",
    documentType: "Type de document",
    documentNumber: "Numéro de document",
    documentSupport: "Support de document",
    nationality: "Nationalité (ISO3)",
    gender: "Sexe",
    phone: "Téléphone",
    phone2: "Téléphone 2",
    email: "Email",
    address: "Adresse *",
    postalCode: "Code postal *",
    country: "Pays (ISO3) *",
    municipalityCode: "Code municipal INE (5) *",
    municipalityName: "Nom de la municipalité *",
    relationship: "Relation avec le mineur",
    addTraveler: "Ajouter un voyageur",
    removeTraveler: "Supprimer",
    totalPeople: "Total des personnes",
    // Options
    unspecified: "Non spécifié",
    yes: "Oui",
    no: "Non",
    // Types de paiement
    cash: "Espèces",
    card: "Carte",
    platform: "Plateforme",
    transfer: "Virement",
    mobile: "Mobile",
    check: "Chèque",
    destination: "Destination",
    other: "Autre",
    // Types de document
    nif: "NIF",
    nie: "NIE",
    passport: "Passeport",
    otherDoc: "Autre",
    // Genres
    male: "Masculin",
    female: "Féminin",
    other: "Autre",
    // Pas de document
    noDocument: "Pas de document (mineur)"
  }
};

// Mapeo de tipos de pago a etiquetas
const paymentTypeLabels = {
  EFECT: { es: "Efectivo", en: "Cash", fr: "Espèces" },
  TARJT: { es: "Tarjeta", en: "Card", fr: "Carte" },
  PLATF: { es: "Plataforma", en: "Platform", fr: "Plateforme" },
  TRANS: { es: "Transferencia", en: "Transfer", fr: "Virement" },
  MOVIL: { es: "Móvil", en: "Mobile", fr: "Mobile" },
  TREG: { es: "Cheque", en: "Check", fr: "Chèque" },
  DESTI: { es: "Destino", en: "Destination", fr: "Destination" },
  OTRO: { es: "Otro", en: "Other", fr: "Autre" }
};

// Mapeo de tipos de documento a etiquetas
const documentTypeLabels = {
  NIF: { es: "NIF", en: "NIF", fr: "NIF" },
  NIE: { es: "NIE", en: "NIE", fr: "NIE" },
  PAS: { es: "Pasaporte", en: "Passport", fr: "Passeport" },
  OTRO: { es: "Otro", en: "Other", fr: "Autre" }
};

// Mapeo de géneros a etiquetas
const genderLabels = {
  H: { es: "Masculino", en: "Male", fr: "Masculin" },
  M: { es: "Femenino", en: "Female", fr: "Féminin" },
  O: { es: "Otro", en: "Other", fr: "Autre" }
};

export default function GuestRegistrationPage() {
  const [language, setLanguage] = useState<Language>("es");
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
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const t = translations[language];

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

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const payload = {
        codigoEstablecimiento: codigoEstablecimiento.trim(),
        comunicaciones: [{ contrato: { ...contrato, numPersonas: personas.length }, personas }]
      };
      
      // Guardar comunicación del día (para Alta masiva)
      const res = await fetch('/api/ministerio/comunicaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoEstablecimiento: payload.codigoEstablecimiento,
          contrato: payload.comunicaciones[0].contrato,
          personas: payload.comunicaciones[0].personas
        })
      });
      
      if (!res.ok) {
        throw new Error("Error al enviar el registro");
      }
      
      setShowSuccess(true);
      // Reset form
      setCodigoEstablecimiento("");
      setContrato({
        referencia: "",
        fechaContrato: "",
        fechaEntrada: "",
        fechaSalida: "",
        numPersonas: 1,
        pago: { tipoPago: "EFECT" }
      });
      setPersonas([{
        rol: "VI",
        nombre: "",
        apellido1: "",
        fechaNacimiento: "",
        contacto: {},
        direccion: { direccion: "", codigoPostal: "", pais: "ESP", codigoMunicipio: "" }
      }]);
      
    } catch (e) {
      alert(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.success}</h1>
          <p className="text-gray-600 mb-6">
            {language === "es" && "Su registro ha sido enviado correctamente. Gracias."}
            {language === "en" && "Your registration has been submitted successfully. Thank you."}
            {language === "fr" && "Votre enregistrement a été soumis avec succès. Merci."}
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {language === "es" && "Nuevo registro"}
            {language === "en" && "New registration"}
            {language === "fr" && "Nouvel enregistrement"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con selector de idioma */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🐬</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-sm text-gray-600">{t.title}</p>
                <p className="text-xs text-gray-500">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Languages className="h-5 w-5 text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇬🇧 English</option>
                <option value="fr">🇫🇷 Français</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {t.contract}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.establishmentCode}</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={codigoEstablecimiento} 
                onChange={e=>setCodigoEstablecimiento(e.target.value)} 
                required 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.reference}</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={contrato.referencia} 
                onChange={e=>setContrato(c=>({ ...c, referencia: e.target.value }))} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.contractDate}</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={contrato.fechaContrato} 
                onChange={e=>setContrato(c=>({ ...c, fechaContrato: e.target.value }))} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.checkIn}</label>
              <input 
                placeholder="2025-09-03T15:00:00" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={contrato.fechaEntrada} 
                onChange={e=>setContrato(c=>({ ...c, fechaEntrada: e.target.value }))} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.checkOut}</label>
              <input 
                placeholder="2025-09-05T11:00:00" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={contrato.fechaSalida} 
                onChange={e=>setContrato(c=>({ ...c, fechaSalida: e.target.value }))} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.numRooms}</label>
              <input 
                type="number" 
                min={1} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={contrato.numHabitaciones ?? ""} 
                onChange={e=>setContrato(c=>({ ...c, numHabitaciones: e.target.value ? Number(e.target.value) : undefined }))} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.internet}</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={String(contrato.internet ?? "")} 
                onChange={e=>setContrato(c=>({ ...c, internet: e.target.value === '' ? undefined : e.target.value === 'true' }))}
              >
                <option value="">{t.unspecified}</option>
                <option value="true">{t.yes}</option>
                <option value="false">{t.no}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentType}</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={contrato.pago.tipoPago} 
                onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, tipoPago: e.target.value as TipoPago } }))}
              >
                {Object.entries(paymentTypeLabels).map(([key, labels]) => (
                  <option key={key} value={key}>{labels[language]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentDate}</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={contrato.pago.fechaPago ?? ""} 
                onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, fechaPago: e.target.value || undefined } }))} 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentMethod}/{t.cardholder}/{t.cardExpiry}</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                  placeholder={t.paymentMethod} 
                  className="px-3 py-2 border border-gray-300 rounded-md" 
                  value={contrato.pago.medioPago ?? ""} 
                  onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, medioPago: e.target.value || undefined } }))} 
                />
                <input 
                  placeholder={t.cardholder} 
                  className="px-3 py-2 border border-gray-300 rounded-md" 
                  value={contrato.pago.titular ?? ""} 
                  onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, titular: e.target.value || undefined } }))} 
                />
                <input 
                  placeholder="MM/AAAA" 
                  className="px-3 py-2 border border-gray-300 rounded-md" 
                  value={contrato.pago.caducidadTarjeta ?? ""} 
                  onChange={e=>setContrato(c=>({ ...c, pago: { ...c.pago, caducidadTarjeta: e.target.value || undefined } }))} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            {t.travelers}
          </h2>
          <div className="space-y-8">
            {personas.map((p, idx) => (
              <div key={idx} className="border rounded-md p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{t.traveler} #{idx+1}</h3>
                  {personas.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => { removePersona(idx); syncNumPersonas(); }} 
                      className="text-red-600 text-sm"
                    >
                      {t.removeTraveler}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    placeholder={t.firstName} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.nombre} 
                    onChange={e=>handlePersonaChange(idx,{ nombre: e.target.value })} 
                  />
                  <input 
                    placeholder={t.lastName1} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.apellido1} 
                    onChange={e=>handlePersonaChange(idx,{ apellido1: e.target.value })} 
                  />
                  <input 
                    placeholder={t.lastName2} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.apellido2 ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ apellido2: e.target.value || undefined })} 
                  />
                  <input 
                    type="date" 
                    placeholder={t.birthDate} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.fechaNacimiento} 
                    onChange={e=>handlePersonaChange(idx,{ fechaNacimiento: e.target.value })} 
                  />
                  <select 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.tipoDocumento ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ tipoDocumento: (e.target.value || undefined) as TipoDocumento | undefined })}
                  >
                    <option value="">{t.noDocument}</option>
                    {Object.entries(documentTypeLabels).map(([key, labels]) => (
                      <option key={key} value={key}>{labels[language]}</option>
                    ))}
                  </select>
                  <input 
                    placeholder={t.documentNumber} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.numeroDocumento ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ numeroDocumento: e.target.value || undefined })} 
                  />
                  <input 
                    placeholder={t.documentSupport} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.soporteDocumento ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ soporteDocumento: e.target.value || undefined })} 
                  />
                  <input 
                    placeholder={t.nationality} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.nacionalidad ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ nacionalidad: e.target.value || undefined })} 
                  />
                  <select 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.sexo ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ sexo: (e.target.value || undefined) as Sexo | undefined })}
                  >
                    <option value="">{t.gender}</option>
                    {Object.entries(genderLabels).map(([key, labels]) => (
                      <option key={key} value={key}>{labels[language]}</option>
                    ))}
                  </select>
                  <input 
                    placeholder={t.phone} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.contacto.telefono ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ contacto: { ...p.contacto, telefono: e.target.value || undefined } })} 
                  />
                  <input 
                    placeholder={t.phone2} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.contacto.telefono2 ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ contacto: { ...p.contacto, telefono2: e.target.value || undefined } })} 
                  />
                  <input 
                    placeholder={t.email} 
                    type="email" 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.contacto.correo ?? ""} 
                    onChange={e=>handlePersonaChange(idx,{ contacto: { ...p.contacto, correo: e.target.value || undefined } })} 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <input 
                    placeholder={t.address} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.direccion.direccion} 
                    onChange={e=>handlePersonaDireccionChange(idx,{ direccion: e.target.value })} 
                  />
                  <input 
                    placeholder={t.postalCode} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.direccion.codigoPostal} 
                    onChange={e=>handlePersonaDireccionChange(idx,{ codigoPostal: e.target.value })} 
                  />
                  <input 
                    placeholder={t.country} 
                    className="px-3 py-2 border border-gray-300 rounded-md" 
                    value={p.direccion.pais} 
                    onChange={e=>handlePersonaDireccionChange(idx,{ pais: e.target.value })} 
                  />
                  {p.direccion.pais === "ESP" ? (
                    <input 
                      placeholder={t.municipalityCode} 
                      className="px-3 py-2 border border-gray-300 rounded-md" 
                      value={p.direccion.codigoMunicipio ?? ""} 
                      onChange={e=>handlePersonaDireccionChange(idx,{ codigoMunicipio: e.target.value || undefined })} 
                    />
                  ) : (
                    <input 
                      placeholder={t.municipalityName} 
                      className="px-3 py-2 border border-gray-300 rounded-md" 
                      value={p.direccion.nombreMunicipio ?? ""} 
                      onChange={e=>handlePersonaDireccionChange(idx,{ nombreMunicipio: e.target.value || undefined })} 
                    />
                  )}
                </div>
                {numMenores > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.relationship}</label>
                    <select 
                      className="px-3 py-2 border border-gray-300 rounded-md" 
                      value={p.parentesco ?? ""} 
                      onChange={e=>handlePersonaChange(idx,{ parentesco: (e.target.value || undefined) as Parentesco | undefined })}
                    >
                      <option value="">{t.unspecified}</option>
                      {["PM","CY","AB","BA","BN","CD","HJ","HR","NI","SB","SG","TI","YN","TU","OT"].map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
            <div className="flex justify-between">
              <button 
                type="button" 
                onClick={() => { addPersona(); syncNumPersonas(); }} 
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t.addTraveler}
              </button>
              <div className="text-sm text-gray-600">{t.totalPeople}: {personas.length}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => { syncNumPersonas(); handleSubmit(); }} 
            className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" 
            disabled={submitting}
          >
            {submitting ? t.submitting : (
              <>
                <Save className="h-4 w-4 mr-2" /> 
                {t.submit}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


