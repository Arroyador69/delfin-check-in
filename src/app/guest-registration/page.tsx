"use client";

import { useState, useEffect } from "react";
import { Save, FileText, Globe, CheckCircle } from "lucide-react";

type TipoPago = "EFECT" | "TARJT" | "PLATF" | "TRANS" | "MOVIL" | "TREG" | "DESTI" | "OTRO";
type TipoDocumento = "NIF" | "NIE" | "PAS" | "OTRO";
type Sexo = "H" | "M" | "O";

type Language = "es" | "en" | "fr";

interface DireccionForm {
  direccion: string;
  direccionComplementaria?: string;
  codigoPostal: string;
  pais: string;
  codigoMunicipio?: string;
  nombreMunicipio?: string;
}

interface PersonaForm {
  rol: "VI";
  nombre: string;
  apellido1: string;
  apellido2?: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
  soporteDocumento?: string;
  fechaNacimiento: string;
  nacionalidad?: string;
  sexo?: Sexo;
  contacto: { telefono?: string; telefono2?: string; correo?: string };
  direccion: DireccionForm;
}

interface PagoForm {
  tipoPago: TipoPago;
  fechaPago?: string;
  medioPago?: string;
  titular?: string;
  caducidadTarjeta?: string;
}

interface ContratoForm {
  referencia: string;
  fechaContrato: string;
  fechaEntrada: string;
  fechaSalida: string;
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
    validationError: "Por favor, complete todos los campos obligatorios",
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
    passport: "Pasaporte",
    dni: "DNI",
    nie: "NIE",
    otherDoc: "Otro",
    // Géneros
    male: "Hombre",
    female: "Mujer",
    otherGender: "Otro",
    // Estados
    spain: "España",
    otherCountry: "Otro país",
    // Mensajes
    formInstructions: "Complete todos los campos obligatorios marcados con *",
    redirectMessage: "Será redirigido al dashboard del administrador para generar el XML",
  },
  en: {
    title: "Guest Registration Form",
    subtitle: "Compatible with Spanish Ministry of Interior registration",
    contract: "Contract",
    travelers: "Travelers",
    submit: "Submit registration",
    submitting: "Submitting...",
    success: "Registration submitted successfully",
    error: "Error submitting registration",
    validationError: "Please complete all required fields",
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
    passport: "Passport",
    dni: "DNI",
    nie: "NIE",
    otherDoc: "Other",
    // Genders
    male: "Male",
    female: "Female",
    otherGender: "Other",
    // States
    spain: "Spain",
    otherCountry: "Other country",
    // Messages
    formInstructions: "Complete all required fields marked with *",
    redirectMessage: "You will be redirected to the admin dashboard to generate XML",
  },
  fr: {
    title: "Formulaire d'enregistrement des voyageurs",
    subtitle: "Compatible avec l'enregistrement du ministère espagnol de l'Intérieur",
    contract: "Contrat",
    travelers: "Voyageurs",
    submit: "Soumettre l'enregistrement",
    submitting: "Soumission...",
    success: "Enregistrement soumis avec succès",
    error: "Erreur lors de la soumission",
    validationError: "Veuillez remplir tous les champs obligatoires",
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
    lastName1: "Premier nom *",
    lastName2: "Deuxième nom",
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
    municipalityName: "Nom municipal *",
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
    passport: "Passeport",
    dni: "DNI",
    nie: "NIE",
    otherDoc: "Autre",
    // Genres
    male: "Homme",
    female: "Femme",
    otherGender: "Autre",
    // États
    spain: "Espagne",
    otherCountry: "Autre pays",
    // Messages
    formInstructions: "Remplissez tous les champs obligatoires marqués avec *",
    redirectMessage: "Vous serez redirigé vers le tableau de bord admin pour générer XML",
  }
};

export default function GuestRegistrationPage() {
  const [language, setLanguage] = useState<Language>("es");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  const t = translations[language];

  // Estado del formulario
  const [codigoEstablecimiento, setCodigoEstablecimiento] = useState("");
  const [contrato, setContrato] = useState<ContratoForm>({
    referencia: "",
    fechaContrato: "",
    fechaEntrada: "",
    fechaSalida: "",
    numPersonas: 1,
    numHabitaciones: 1,
    internet: false,
    pago: {
      tipoPago: "EFECT",
      fechaPago: "",
      medioPago: "",
      titular: "",
      caducidadTarjeta: "",
    },
  });

  const [personas, setPersonas] = useState<PersonaForm[]>([
    {
      rol: "VI",
      nombre: "",
      apellido1: "",
      apellido2: "",
      tipoDocumento: "PAS",
      numeroDocumento: "",
      soporteDocumento: "",
      fechaNacimiento: "",
      nacionalidad: "ESP",
      sexo: "H",
      contacto: { telefono: "", telefono2: "", correo: "" },
      direccion: {
        direccion: "",
        direccionComplementaria: "",
        codigoPostal: "",
        pais: "ESP",
        codigoMunicipio: "",
        nombreMunicipio: "",
      },
    },
  ]);

  const handlePersonaChange = (index: number, field: keyof PersonaForm, value: any) => {
    const newPersonas = [...personas];
    newPersonas[index] = { ...newPersonas[index], [field]: value };
    setPersonas(newPersonas);
  };

  const handlePersonaDireccionChange = (index: number, field: keyof DireccionForm, value: any) => {
    const newPersonas = [...personas];
    newPersonas[index] = {
      ...newPersonas[index],
      direccion: { ...newPersonas[index].direccion, [field]: value }
    };
    setPersonas(newPersonas);
  };

  const handlePersonaContactoChange = (index: number, field: keyof PersonaForm['contacto'], value: string) => {
    const newPersonas = [...personas];
    newPersonas[index] = {
      ...newPersonas[index],
      contacto: { ...newPersonas[index].contacto, [field]: value }
    };
    setPersonas(newPersonas);
  };

  const validateForm = (): boolean => {
    if (!codigoEstablecimiento.trim() || !contrato.referencia.trim() || 
        !contrato.fechaContrato || !contrato.fechaEntrada || !contrato.fechaSalida) {
      setValidationError(t.validationError);
      return false;
    }
    
    const persona = personas[0];
    if (!persona.nombre.trim() || !persona.apellido1.trim() || 
        !persona.fechaNacimiento || !persona.direccion.direccion.trim() || 
        !persona.direccion.codigoPostal.trim()) {
      setValidationError(t.validationError);
      return false;
    }
    
    if (persona.direccion.pais === "ESP" && !persona.direccion.codigoMunicipio?.trim()) {
      setValidationError(t.validationError);
      return false;
    }
    
    setValidationError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setValidationError("");

    try {
      const payload = {
        codigoEstablecimiento,
        comunicaciones: [{
          contrato: {
            ...contrato,
            numPersonas: personas.length,
          },
          personas,
        }],
      };

      const response = await fetch("/api/ministerio/comunicaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Error al enviar el registro");
      }

      setShowSuccess(true);
      
      // Redirigir al dashboard del administrador después de 3 segundos
      setTimeout(() => {
        window.open('/guest-registrations-dashboard', '_blank');
      }, 3000);

    } catch (error) {
      console.error("Error:", error);
      setValidationError(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t.success}
          </h3>
          <p className="text-gray-600 mb-6">
            {t.redirectMessage}
          </p>
          <div className="text-sm text-gray-500">
            <p>Redirigiendo en unos segundos...</p>
            <p className="mt-2">
              <a 
                href="/guest-registrations-dashboard" 
                target="_blank"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Abrir dashboard ahora
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple sin menú de navegación */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🐬</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-sm text-gray-600">Sistema de Registro de Viajeros</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇬🇧 English</option>
                <option value="fr">🇫🇷 Français</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título principal centrado */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🐬</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {t.title}
          </h2>
          <p className="text-lg text-gray-600">
            {t.subtitle}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t.formInstructions}
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sección Contrato */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                {t.contract}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.establishmentCode}
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoEstablecimiento}
                    onChange={(e) => setCodigoEstablecimiento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={10}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.reference}
                  </label>
                  <input
                    type="text"
                    required
                    value={contrato.referencia}
                    onChange={(e) => setContrato({...contrato, referencia: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contractDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={contrato.fechaContrato}
                    onChange={(e) => setContrato({...contrato, fechaContrato: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.checkIn}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={contrato.fechaEntrada}
                    onChange={(e) => setContrato({...contrato, fechaEntrada: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.checkOut}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={contrato.fechaSalida}
                    onChange={(e) => setContrato({...contrato, fechaSalida: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.numRooms}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={contrato.numHabitaciones || 1}
                    onChange={(e) => setContrato({...contrato, numHabitaciones: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="internet"
                    checked={contrato.internet || false}
                    onChange={(e) => setContrato({...contrato, internet: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="internet" className="ml-2 block text-sm text-gray-900">
                    {t.internet}
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.paymentType}
                  </label>
                  <select
                    required
                    value={contrato.pago.tipoPago}
                    onChange={(e) => setContrato({
                      ...contrato, 
                      pago: {...contrato.pago, tipoPago: e.target.value as TipoPago}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EFECT">{t.cash}</option>
                    <option value="TARJT">{t.card}</option>
                    <option value="PLATF">{t.platform}</option>
                    <option value="TRANS">{t.transfer}</option>
                    <option value="MOVIL">{t.mobile}</option>
                    <option value="TREG">{t.check}</option>
                    <option value="DESTI">{t.destination}</option>
                    <option value="OTRO">{t.other}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.paymentDate}
                  </label>
                  <input
                    type="date"
                    value={contrato.pago.fechaPago || ""}
                    onChange={(e) => setContrato({
                      ...contrato, 
                      pago: {...contrato.pago, fechaPago: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.paymentMethod}
                  </label>
                  <input
                    type="text"
                    value={contrato.pago.medioPago || ""}
                    onChange={(e) => setContrato({
                      ...contrato, 
                      pago: {...contrato.pago, medioPago: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.cardholder}
                  </label>
                  <input
                    type="text"
                    value={contrato.pago.titular || ""}
                    onChange={(e) => setContrato({
                      ...contrato, 
                      pago: {...contrato.pago, titular: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.cardExpiry}
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YYYY"
                    value={contrato.pago.caducidadTarjeta || ""}
                    onChange={(e) => setContrato({
                      ...contrato, 
                      pago: {...contrato.pago, caducidadTarjeta: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Sección Viajeros */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                {t.travelers}
              </h3>
              
              {personas.map((persona, index) => (
                <div key={index} className="border rounded-lg p-6 mb-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-4">
                    {t.traveler} {index + 1}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.firstName}
                      </label>
                      <input
                        type="text"
                        required
                        value={persona.nombre}
                        onChange={(e) => handlePersonaChange(index, 'nombre', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.lastName1}
                      </label>
                      <input
                        type="text"
                        required
                        value={persona.apellido1}
                        onChange={(e) => handlePersonaChange(index, 'apellido1', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.lastName2}
                      </label>
                      <input
                        type="text"
                        value={persona.apellido2 || ""}
                        onChange={(e) => handlePersonaChange(index, 'apellido2', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.birthDate}
                      </label>
                      <input
                        type="date"
                        required
                        value={persona.fechaNacimiento}
                        onChange={(e) => handlePersonaChange(index, 'fechaNacimiento', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.documentType}
                      </label>
                      <select
                        value={persona.tipoDocumento || "PAS"}
                        onChange={(e) => handlePersonaChange(index, 'tipoDocumento', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="NIF">{t.dni}</option>
                        <option value="NIE">{t.nie}</option>
                        <option value="PAS">{t.passport}</option>
                        <option value="OTRO">{t.otherDoc}</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.documentNumber}
                      </label>
                      <input
                        type="text"
                        value={persona.numeroDocumento || ""}
                        onChange={(e) => handlePersonaChange(index, 'numeroDocumento', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.nationality}
                      </label>
                      <input
                        type="text"
                        value={persona.nacionalidad || "ESP"}
                        onChange={(e) => handlePersonaChange(index, 'nacionalidad', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.gender}
                      </label>
                      <select
                        value={persona.sexo || "H"}
                        onChange={(e) => handlePersonaChange(index, 'sexo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="H">{t.male}</option>
                        <option value="M">{t.female}</option>
                        <option value="O">{t.otherGender}</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.phone}
                      </label>
                      <input
                        type="tel"
                        value={persona.contacto.telefono || ""}
                        onChange={(e) => handlePersonaContactoChange(index, 'telefono', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.email}
                      </label>
                      <input
                        type="email"
                        value={persona.contacto.correo || ""}
                        onChange={(e) => handlePersonaContactoChange(index, 'correo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.address}
                      </label>
                      <input
                        type="text"
                        required
                        value={persona.direccion.direccion}
                        onChange={(e) => handlePersonaDireccionChange(index, 'direccion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.postalCode}
                      </label>
                      <input
                        type="text"
                        required
                        value={persona.direccion.codigoPostal}
                        onChange={(e) => handlePersonaDireccionChange(index, 'codigoPostal', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.country}
                      </label>
                      <select
                        value={persona.direccion.pais}
                        onChange={(e) => handlePersonaDireccionChange(index, 'pais', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ESP">{t.spain}</option>
                        <option value="OTHER">{t.otherCountry}</option>
                      </select>
                    </div>
                    
                    {persona.direccion.pais === "ESP" ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.municipalityCode}
                        </label>
                        <input
                          type="text"
                          required
                          value={persona.direccion.codigoMunicipio || ""}
                          onChange={(e) => handlePersonaDireccionChange(index, 'codigoMunicipio', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          maxLength={5}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.municipalityName}
                        </label>
                        <input
                          type="text"
                          required
                          value={persona.direccion.nombreMunicipio || ""}
                          onChange={(e) => handlePersonaDireccionChange(index, 'nombreMunicipio', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mensaje de error */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{validationError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de envío */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-lg font-medium"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    {t.submitting}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-3" />
                    {t.submit}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


