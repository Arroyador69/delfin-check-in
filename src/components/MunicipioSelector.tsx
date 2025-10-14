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
        console.log(`🔍 Buscando municipios para: "${busqueda}"`);
        
        let resultados: Municipio[] = [];
        let fuenteUsada = '';
        
        // 1. Intentar con nuestra API interna
        try {
          const response = await fetch(`/api/municipios/buscar?q=${encodeURIComponent(busqueda)}`, {
            signal: AbortSignal.timeout(3000)
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              resultados = data;
              fuenteUsada = 'API interna';
              console.log(`✅ Encontrados ${data.length} municipios en API interna`);
            }
          }
        } catch (error) {
          console.log('⚠️ API interna no disponible:', error);
        }
        
        // 2. Si no hay resultados, intentar con APIs externas
        if (resultados.length === 0) {
          try {
            // API de GeoAPI España (gratuita)
            const geoApiUrl = `https://apiv1.geoapi.es/municipios?q=${encodeURIComponent(busqueda)}&type=JSON&key=YOUR_API_KEY&sandbox=1`;
            const response = await fetch(geoApiUrl, {
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.data && data.data.length > 0) {
                resultados = data.data.map((m: any) => ({
                  c: m.CODIGO_INE,
                  n: m.NOMBRE,
                  p: m.PROVINCIA
                }));
                fuenteUsada = 'GeoAPI España';
                console.log(`✅ Encontrados ${resultados.length} municipios en GeoAPI`);
              }
            }
          } catch (error) {
            console.log('⚠️ GeoAPI no disponible:', error);
          }
        }
        
        // 3. Si aún no hay resultados, intentar con INE API
        if (resultados.length === 0) {
          try {
            const ineApiUrl = `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/t20/e244/p05/l0/00000.px?tip=AM&p=5&ccaa=0&mun=0&tip_amb=1`;
            const response = await fetch(ineApiUrl, {
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.Metadatos && data.Metadatos.Municipios) {
                const municipios = Object.values(data.Metadatos.Municipios) as any[];
                const queryLower = busqueda.toLowerCase();
                resultados = municipios
                  .filter(m => m.Nombre && m.Nombre.toLowerCase().includes(queryLower))
                  .map(m => ({
                    c: m.Codigo,
                    n: m.Nombre,
                    p: m.Provincia || 'Desconocida'
                  }))
                  .slice(0, 20);
                
                if (resultados.length > 0) {
                  fuenteUsada = 'INE API';
                  console.log(`✅ Encontrados ${resultados.length} municipios en INE API`);
                }
              }
            }
          } catch (error) {
            console.log('⚠️ INE API no disponible:', error);
          }
        }
        
        // 4. Si aún no hay resultados, intentar con búsqueda web
        if (resultados.length === 0) {
          try {
            const webSearchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(busqueda + ' municipio españa código INE')}&format=json&no_html=1&skip_disambig=1`;
            const response = await fetch(webSearchUrl, {
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.RelatedTopics && data.RelatedTopics.length > 0) {
                const webResults = data.RelatedTopics
                  .filter((topic: any) => topic.Text && topic.Text.includes('código INE'))
                  .map((topic: any) => {
                    const text = topic.Text;
                    const codigoMatch = text.match(/(\d{5})/);
                    const nombreMatch = text.match(/([A-Za-záéíóúñü\s]+)/);
                    if (codigoMatch && nombreMatch) {
                      return {
                        c: codigoMatch[1],
                        n: nombreMatch[1].trim(),
                        p: 'Desconocida'
                      };
                    }
                    return null;
                  })
                  .filter(Boolean)
                  .slice(0, 10);
                
                if (webResults.length > 0) {
                  resultados = webResults;
                  fuenteUsada = 'Búsqueda web';
                  console.log(`✅ Encontrados ${resultados.length} municipios en búsqueda web`);
                }
              }
            }
          } catch (error) {
            console.log('⚠️ Búsqueda web no disponible:', error);
          }
        }
        
        // 5. Fallback final: búsqueda local inteligente
        if (resultados.length === 0) {
          const MUNICIPIOS_INE = [
            {c:'29042', n:'Fuengirola', p:'Málaga'}, {c:'29045', n:'Málaga', p:'Málaga'}, {c:'28001', n:'Madrid', p:'Madrid'}, {c:'08001', n:'Barcelona', p:'Barcelona'}, {c:'46001', n:'Valencia', p:'Valencia'}, {c:'41001', n:'Sevilla', p:'Sevilla'}, {c:'15001', n:'A Coruña', p:'A Coruña'}, {c:'48001', n:'Bilbao', p:'Vizcaya'}, {c:'33001', n:'Oviedo', p:'Asturias'}, {c:'35001', n:'Las Palmas', p:'Las Palmas'}, {c:'38001', n:'Santa Cruz de Tenerife', p:'Santa Cruz de Tenerife'}, {c:'07001', n:'Palma', p:'Baleares'}, {c:'29001', n:'Almería', p:'Almería'}, {c:'11001', n:'Cádiz', p:'Cádiz'}, {c:'14001', n:'Córdoba', p:'Córdoba'}, {c:'14002', n:'Adamuz', p:'Córdoba'}, {c:'18001', n:'Granada', p:'Granada'}, {c:'21001', n:'Huelva', p:'Huelva'}, {c:'23001', n:'Jaén', p:'Jaén'}, {c:'22001', n:'Huesca', p:'Huesca'}, {c:'50001', n:'Zaragoza', p:'Zaragoza'}, {c:'44001', n:'Teruel', p:'Teruel'}, {c:'39001', n:'Santander', p:'Cantabria'}, {c:'09001', n:'Burgos', p:'Burgos'}, {c:'24001', n:'León', p:'León'}, {c:'34001', n:'Palencia', p:'Palencia'}, {c:'37001', n:'Salamanca', p:'Salamanca'}, {c:'40001', n:'Segovia', p:'Segovia'}, {c:'42001', n:'Soria', p:'Soria'}, {c:'47001', n:'Valladolid', p:'Valladolid'}, {c:'49001', n:'Zamora', p:'Zamora'}, {c:'26001', n:'Logroño', p:'La Rioja'}, {c:'06001', n:'Badajoz', p:'Badajoz'}, {c:'10001', n:'Cáceres', p:'Cáceres'}, {c:'16001', n:'Cuenca', p:'Cuenca'}, {c:'19001', n:'Guadalajara', p:'Guadalajara'}, {c:'45001', n:'Toledo', p:'Toledo'}, {c:'13001', n:'Ciudad Real', p:'Ciudad Real'}, {c:'02001', n:'Albacete', p:'Albacete'}, {c:'12001', n:'Castellón', p:'Castellón'}, {c:'03001', n:'Alicante', p:'Alicante'}, {c:'17001', n:'Girona', p:'Girona'}, {c:'25001', n:'Lleida', p:'Lleida'}, {c:'43001', n:'Tarragona', p:'Tarragona'}, {c:'27001', n:'Lugo', p:'Lugo'}, {c:'32001', n:'Ourense', p:'Ourense'}, {c:'36001', n:'Pontevedra', p:'Pontevedra'}, {c:'05001', n:'Ávila', p:'Ávila'}, {c:'04001', n:'Almería', p:'Almería'}, {c:'08001', n:'Barcelona', p:'Barcelona'}, {c:'29001', n:'Málaga', p:'Málaga'}, {c:'28001', n:'Madrid', p:'Madrid'}, {c:'46001', n:'Valencia', p:'Valencia'}, {c:'41001', n:'Sevilla', p:'Sevilla'}
          ];
          
          const queryLower = busqueda.toLowerCase().trim();
          resultados = MUNICIPIOS_INE.filter(m => {
            const nombreLower = m.n.toLowerCase();
            const provinciaLower = m.p.toLowerCase();
            
            if (nombreLower === queryLower || provinciaLower === queryLower) return true;
            if (nombreLower.startsWith(queryLower) || provinciaLower.startsWith(queryLower)) return true;
            if (nombreLower.includes(queryLower) || provinciaLower.includes(queryLower)) return true;
            
            const queryWords = queryLower.split(/\s+/);
            const nombreWords = nombreLower.split(/[\s\-]+/);
            const provinciaWords = provinciaLower.split(/[\s\-]+/);
            
            const allWordsInNombre = queryWords.every(qWord => 
              nombreWords.some(nWord => nWord.includes(qWord) || qWord.includes(nWord))
            );
            const allWordsInProvincia = queryWords.every(qWord => 
              provinciaWords.some(pWord => pWord.includes(qWord) || qWord.includes(pWord))
            );
            
            return allWordsInNombre || allWordsInProvincia;
          }).sort((a, b) => {
            const aNombre = a.n.toLowerCase();
            const bNombre = b.n.toLowerCase();
            
            if (aNombre === queryLower && bNombre !== queryLower) return -1;
            if (bNombre === queryLower && aNombre !== queryLower) return 1;
            if (aNombre.startsWith(queryLower) && !bNombre.startsWith(queryLower)) return -1;
            if (bNombre.startsWith(queryLower) && !aNombre.startsWith(queryLower)) return 1;
            
            return aNombre.localeCompare(bNombre);
          });
          
          fuenteUsada = 'Catálogo local';
          console.log(`⚠️ Usando fallback local: ${resultados.length} municipios`);
        }
        
        // 6. Si aún no hay resultados, crear un resultado genérico
        if (resultados.length === 0) {
          resultados = [{
            c: '00000',
            n: `${busqueda} (municipio no encontrado)`,
            p: 'Verificar nombre'
          }];
          fuenteUsada = 'Resultado genérico';
          console.log(`⚠️ No se encontraron municipios, creando resultado genérico`);
        }
        
        console.log(`📊 Fuente utilizada: ${fuenteUsada} - ${resultados.length} resultados`);
        setResultados(resultados);
      setMostrarResultados(true);
    } else if (busqueda.length === 0) {
        setResultados([]);
      setMostrarResultados(false);
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
