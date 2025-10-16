'use client';

import React, { useState, useEffect } from 'react';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  language?: string;
}

export default function CountrySelect({
  value,
  onChange,
  placeholder = 'Seleccione país',
  required = false,
  className = '',
  name = '',
  language = 'es'
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Array<{iso3: string, name: string}>>([]);

  useEffect(() => {
    console.log('🌍 CountrySelect: Iniciando carga para idioma:', language);
    
    // Países básicos para empezar
    const basicCountries = [
      { iso3: 'ESP', name: 'España' },
      { iso3: 'FRA', name: 'Francia' },
      { iso3: 'GBR', name: 'Reino Unido' },
      { iso3: 'DEU', name: 'Alemania' },
      { iso3: 'ITA', name: 'Italia' },
      { iso3: 'USA', name: 'Estados Unidos' },
      { iso3: 'MEX', name: 'México' },
      { iso3: 'ARG', name: 'Argentina' },
      { iso3: 'BRA', name: 'Brasil' },
      { iso3: 'CHN', name: 'China' },
      { iso3: 'JPN', name: 'Japón' },
      { iso3: 'IND', name: 'India' },
      { iso3: 'RUS', name: 'Rusia' },
      { iso3: 'CAN', name: 'Canadá' },
      { iso3: 'AUS', name: 'Australia' },
      { iso3: 'NLD', name: 'Países Bajos' },
      { iso3: 'BEL', name: 'Bélgica' },
      { iso3: 'CHE', name: 'Suiza' },
      { iso3: 'AUT', name: 'Austria' },
      { iso3: 'SWE', name: 'Suecia' },
      { iso3: 'NOR', name: 'Noruega' },
      { iso3: 'DNK', name: 'Dinamarca' },
      { iso3: 'FIN', name: 'Finlandia' },
      { iso3: 'POL', name: 'Polonia' },
      { iso3: 'CZE', name: 'República Checa' },
      { iso3: 'HUN', name: 'Hungría' },
      { iso3: 'ROU', name: 'Rumanía' },
      { iso3: 'BGR', name: 'Bulgaria' },
      { iso3: 'GRC', name: 'Grecia' },
      { iso3: 'PRT', name: 'Portugal' }
    ];

    // Intentar cargar países completos
    const loadFullCountries = async () => {
      try {
        console.log('🔄 Intentando cargar países completos...');
        const { getCountriesSorted } = await import('@/lib/countries-data');
        const fullCountries = getCountriesSorted(language);
        console.log('✅ Países completos cargados:', fullCountries.length);
        setCountries(fullCountries);
      } catch (error) {
        console.error('❌ Error cargando países completos:', error);
        console.log('🔄 Usando países básicos');
        setCountries(basicCountries);
      }
    };

    // Cargar países básicos inmediatamente
    setCountries(basicCountries);
    console.log('✅ Países básicos cargados:', basicCountries.length);
    
    // Intentar cargar países completos en segundo plano
    loadFullCountries();
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('🔄 País seleccionado:', e.target.value);
    onChange(e.target.value);
  };

  console.log('🎨 CountrySelect renderizando:', {
    countriesCount: countries.length,
    value,
    name,
    language,
    placeholder
  });

  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={handleChange}
        required={required}
        className={className}
        style={{ 
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '16px',
          backgroundColor: 'white',
          color: '#374151'
        }}
      >
        <option value="">{placeholder}</option>
        {countries.map((country) => (
          <option key={country.iso3} value={country.iso3}>
            {country.name}
          </option>
        ))}
      </select>
      <div className="text-xs text-gray-500 mt-1">
        {countries.length} países disponibles
      </div>
    </div>
  );
}

// Componente para nacionalidad
export function NationalitySelect(props: Omit<CountrySelectProps, 'placeholder'>) {
  return (
    <CountrySelect
      {...props}
      placeholder="Seleccione nacionalidad"
    />
  );
}