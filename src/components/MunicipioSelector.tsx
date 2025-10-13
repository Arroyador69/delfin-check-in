'use client';

import { useState, useEffect, useRef } from 'react';

interface Municipio {
  c: string; // código INE
  n: string; // nombre
  p: string; // provincia
}

interface MunicipioSelectorProps {
  value: string;
  onChange: (codigo: string, nombre: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function MunicipioSelector({ 
  value, 
  onChange, 
  placeholder = 'Busca tu municipio...',
  className = '',
  required = false
}: MunicipioSelectorProps) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Municipio[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState<Municipio | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarResultados(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar municipios cuando cambia el texto
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const buscarMunicipios = async () => {
      if (busqueda.length >= 2) {
        try {
          const response = await fetch(`/api/municipios/buscar?q=${encodeURIComponent(busqueda)}`);
          const data = await response.json();
          
          if (data.municipios && Array.isArray(data.municipios)) {
            setResultados(data.municipios);
            setMostrarResultados(true);
            console.log(`🔍 Municipios encontrados (${data.fuente}):`, data.municipios.length);
          } else {
            setResultados([]);
            setMostrarResultados(false);
          }
        } catch (error) {
          console.error('Error buscando municipios:', error);
          setResultados([]);
          setMostrarResultados(false);
        }
      } else if (busqueda.length === 0) {
        // Mostrar municipios principales
        try {
          const response = await fetch('/api/municipios/buscar?q=');
          const data = await response.json();
          setResultados(data.municipios || []);
          setMostrarResultados(false);
        } catch (error) {
          setResultados([]);
          setMostrarResultados(false);
        }
      } else {
        setResultados([]);
        setMostrarResultados(false);
      }
    };

    // Debounce: esperar 300ms después de la última tecla
    timeoutId = setTimeout(buscarMunicipios, 300);
    
    return () => clearTimeout(timeoutId);
  }, [busqueda]);

  const seleccionarMunicipio = (municipio: Municipio) => {
    setMunicipioSeleccionado(municipio);
    setBusqueda(municipio.n);
    setMostrarResultados(false);
    onChange(municipio.c, municipio.n);
  };

  const handleFocus = () => {
    if (busqueda.length >= 2) {
      setMostrarResultados(true);
    } else {
      setResultados(buscarMunicipio(''));
      setMostrarResultados(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      
      {mostrarResultados && resultados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {resultados.map((municipio) => (
            <button
              key={municipio.c}
              type="button"
              onClick={() => seleccionarMunicipio(municipio)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
            >
              <div>
                <div className="font-medium text-gray-900">{municipio.n}</div>
                <div className="text-sm text-gray-500">{municipio.p}</div>
              </div>
              <div className="text-xs text-gray-400 font-mono">
                INE: {municipio.c}
              </div>
            </button>
          ))}
        </div>
      )}
      
      {municipioSeleccionado && (
        <div className="mt-2 text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Código INE: {municipioSeleccionado.c}
        </div>
      )}
      
      {busqueda.length >= 2 && resultados.length === 0 && (
        <div className="mt-2 text-sm text-amber-600">
          No se encontró el municipio. Si no aparece en la lista, escribe el nombre completo y luego podrás añadir el código INE manualmente.
        </div>
      )}
    </div>
  );
}
