'use client';

import React, { useState, useEffect } from 'react';
import { COUNTRIES_DATA, getCountriesSorted } from '@/lib/countries-data';

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
    console.log('🌍 CountrySelect: Cargando países para idioma:', language);
    
    // Cargar países directamente
    const loadCountries = () => {
      try {
        const sortedCountries = getCountriesSorted(language);
        console.log('✅ CountrySelect: Países cargados:', sortedCountries.length);
        setCountries(sortedCountries);
      } catch (error) {
        console.error('❌ Error cargando países:', error);
        // Fallback inmediato
        setCountries([
          { iso3: 'ESP', name: 'España' },
          { iso3: 'FRA', name: 'Francia' },
          { iso3: 'GBR', name: 'Reino Unido' },
          { iso3: 'DEU', name: 'Alemania' },
          { iso3: 'ITA', name: 'Italia' },
          { iso3: 'USA', name: 'Estados Unidos' },
          { iso3: 'MEX', name: 'México' },
          { iso3: 'ARG', name: 'Argentina' },
          { iso3: 'BRA', name: 'Brasil' },
          { iso3: 'CHN', name: 'China' }
        ]);
      }
    };

    // Cargar inmediatamente
    loadCountries();
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('🔄 País seleccionado:', e.target.value);
    onChange(e.target.value);
  };

  console.log('🎨 CountrySelect renderizando:', {
    countriesCount: countries.length,
    value,
    name,
    language
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
          backgroundColor: 'white'
        }}
      >
        <option value="">{placeholder}</option>
        {countries.map((country) => (
          <option key={country.iso3} value={country.iso3}>
            {country.name}
          </option>
        ))}
      </select>
      {countries.length === 0 && (
        <div className="text-red-500 text-sm mt-1">
          ⚠️ Error cargando países
        </div>
      )}
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