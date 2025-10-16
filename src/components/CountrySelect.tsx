'use client';

import React, { useState, useEffect } from 'react';
import { COUNTRIES_DATA, getCountriesSorted, getCountryName } from '@/lib/countries-data';

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
  const [currentLanguage, setCurrentLanguage] = useState(language);

  useEffect(() => {
    setCountries(getCountriesSorted(currentLanguage));
  }, [currentLanguage]);

  useEffect(() => {
    setCurrentLanguage(language);
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const getDisplayValue = () => {
    if (!value) return '';
    // Si el valor ya es un código ISO3, devolverlo tal como está
    if (value.length === 3 && /^[A-Z]{3}$/.test(value)) {
      return value;
    }
    // Si es un nombre de país, intentar convertirlo a ISO3
    const country = COUNTRIES_DATA.find(c => 
      Object.values(c.name).some(name => 
        name.toLowerCase() === value.toLowerCase()
      )
    );
    return country ? country.iso3 : value;
  };

  return (
    <select
      name={name}
      value={getDisplayValue()}
      onChange={handleChange}
      required={required}
      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
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
