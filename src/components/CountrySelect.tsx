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
    console.log('CountrySelect: Loading countries for language:', language);
    try {
      const sortedCountries = getCountriesSorted(language);
      console.log('CountrySelect: Loaded countries:', sortedCountries.length);
      setCountries(sortedCountries);
    } catch (error) {
      console.error('Error loading countries:', error);
      // Fallback con algunos países básicos
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
      console.log('CountrySelect: Using fallback countries:', fallbackCountries.length);
      setCountries(fallbackCountries);
    }
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  console.log('CountrySelect: Rendering with', countries.length, 'countries, value:', value);

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