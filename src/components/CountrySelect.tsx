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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🌍 CountrySelect: Iniciando carga de países para idioma:', language);
    setLoading(true);
    
    try {
      const sortedCountries = getCountriesSorted(language);
      console.log('✅ CountrySelect: Países cargados exitosamente:', sortedCountries.length);
      console.log('📋 Primeros 5 países:', sortedCountries.slice(0, 5));
      setCountries(sortedCountries);
    } catch (error) {
      console.error('❌ Error cargando países:', error);
      // Fallback con países básicos
      const fallbackCountries = [
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
      ];
      console.log('🔄 CountrySelect: Usando países de fallback:', fallbackCountries.length);
      setCountries(fallbackCountries);
    } finally {
      setLoading(false);
    }
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('🔄 CountrySelect: País seleccionado:', e.target.value);
    onChange(e.target.value);
  };

  console.log('🎨 CountrySelect: Renderizando con', countries.length, 'países, valor actual:', value, 'cargando:', loading);

  if (loading) {
    return (
      <select
        name={name}
        disabled
        className={className}
      >
        <option value="">Cargando países...</option>
      </select>
    );
  }

  return (
    <select
      name={name}
      value={value}
      onChange={handleChange}
      required={required}
      className={className}
    >
      <option value="">{placeholder}</option>
      {countries.map((country) => (
        <option key={country.iso3} value={country.iso3}>
          {country.name}
        </option>
      ))}
    </select>
  );
}

// Componente para nacionalidad (mismo que país pero con placeholder diferente)
export function NationalitySelect(props: Omit<CountrySelectProps, 'placeholder'>) {
  return (
    <CountrySelect
      {...props}
      placeholder="Seleccione nacionalidad"
    />
  );
}