'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle } from 'lucide-react';

interface DynamicPriceCalculatorProps {
  currentProperties?: number;
  isYearly?: boolean;
  onPlanChange?: (plan: 'monthly' | 'yearly', properties: number, totalPrice: number) => void;
  showUpgradeButton?: boolean;
  className?: string;
  onCheckout?: (properties: number, isYearly: boolean, totalPrice: number) => void;
}

export default function DynamicPriceCalculator({
  currentProperties = 1,
  isYearly = false,
  onPlanChange,
  showUpgradeButton = true,
  className = '',
  onCheckout
}: DynamicPriceCalculatorProps) {
  const [properties, setProperties] = useState(currentProperties);
  const [isYearlyPlan, setIsYearlyPlan] = useState(isYearly);

  // Función para obtener precio por propiedad según volumen
  const getVolumePrice = (propCount: number): number => {
    if (propCount === 1) return 14.99;
    if (propCount === 2) return 13.49;
    if (propCount >= 3 && propCount <= 4) return 12.74;
    if (propCount >= 5 && propCount <= 9) return 11.99;
    if (propCount >= 10) return 11.24;
    return 14.99;
  };

  // Calcular precio total
  const calculateTotal = () => {
    const pricePerProperty = getVolumePrice(properties);
    
    if (isYearlyPlan) {
      const monthlyPrice = properties * pricePerProperty;
      const yearlyPrice = monthlyPrice * 12;
      const annualDiscount = yearlyPrice * 0.167; // 16.7% descuento anual
      return yearlyPrice - annualDiscount;
    } else {
      return properties * pricePerProperty;
    }
  };

  // Calcular descuento aplicado
  const getDiscount = () => {
    const basePrice = 14.99;
    const currentPrice = getVolumePrice(properties);
    return ((basePrice - currentPrice) / basePrice) * 100;
  };

  // Calcular ahorro si es anual
  const calculateSavings = () => {
    if (!isYearlyPlan) return 0;
    
    const monthlyTotal = properties * getVolumePrice(properties) * 12;
    const yearlyTotal = calculateTotal();
    return monthlyTotal - yearlyTotal;
  };

  const total = calculateTotal();
  const discount = getDiscount();
  const savings = calculateSavings();

  useEffect(() => {
    if (onPlanChange) {
      onPlanChange(isYearlyPlan ? 'yearly' : 'monthly', properties, total);
    }
  }, [properties, isYearlyPlan, onPlanChange, total]);

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-200 ${className}`}>
      {/* Contador de propiedades */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          🏠 Número de propiedades
        </label>
        
        <div className="relative flex items-center justify-center space-x-4">
          {/* Botón decremento */}
          <button
            type="button"
            onClick={() => setProperties(Math.max(1, properties - 1))}
            disabled={properties <= 1}
            className="w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-bold text-xl shadow-md hover:shadow-lg"
          >
            −
          </button>
          
          {/* Input central */}
          <div className="relative">
            <input
              type="number"
              value={properties}
              onChange={(e) => setProperties(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-24 h-16 text-center text-2xl font-bold text-blue-600 border-2 border-blue-500 rounded-xl focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all"
              readOnly
            />
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
              {properties === 1 ? 'propiedad' : 'propiedades'}
            </div>
          </div>
          
          {/* Botón incremento */}
          <button
            type="button"
            onClick={() => setProperties(properties + 1)}
            className="w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center font-bold text-xl shadow-md hover:shadow-lg"
          >
            +
          </button>
        </div>
      </div>

      {/* Selector de plan */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          📅 Tipo de plan
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsYearlyPlan(false)}
            className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              !isYearlyPlan
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-md'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            💳 Mensual
          </button>
          <button
            onClick={() => setIsYearlyPlan(true)}
            className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              isYearlyPlan
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-md'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            🎯 Anual
          </button>
        </div>
        {isYearlyPlan && (
          <p className="text-xs text-green-600 mt-2 font-medium">
            ✓ Ahorras {calculateSavings().toFixed(2)}€ al año con descuento del 16.7%
          </p>
        )}
      </div>

      {/* Resultados */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="text-center">
          <div className="text-4xl font-black text-blue-600 mb-2">
            {total.toFixed(2)}€
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {isYearlyPlan ? 'por año' : 'por mes'}
          </div>
          
          {/* Descuento por volumen */}
          {discount > 0 && (
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-3">
              <span className="mr-1">🎉</span>
              Descuento {discount.toFixed(0)}% por volumen
            </div>
          )}
          
          {/* Detalles de precio */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>Precio por propiedad:</span>
                <span className="font-semibold">{getVolumePrice(properties).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span>Propiedades:</span>
                <span className="font-semibold">{properties}</span>
              </div>
              {isYearlyPlan && (
                <div className="flex justify-between text-green-600 pt-2 border-t border-green-200">
                  <span className="font-semibold">Ahorras:</span>
                  <span className="font-bold">{savings.toFixed(2)}€ al año</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botón de upgrade si está habilitado */}
      {showUpgradeButton && (
        <button
          onClick={() => {
            if (onCheckout) {
              onCheckout(properties, isYearlyPlan, total);
            } else {
              window.location.href = '/upgrade-plan';
            }
          }}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
        >
          <ArrowUpCircle className="w-6 h-6" />
          <span>Contratar {properties} {properties === 1 ? 'propiedad' : 'propiedades'}</span>
        </button>
      )}
    </div>
  );
}
