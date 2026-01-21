'use client';

import { useState, useEffect } from 'react';
import { Calculator, Plus, Trash2, Save, Euro, Calendar, Users, Home, Settings } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'per_guest' | 'per_room';
  isPercentage: boolean;
  percentage?: number;
  lastUpdate?: string;
}

interface CalculationResult {
  totalMonthlyCosts: number;
  costPerRoom: number;
  costPerGuest: number;
  breakdown: {
    fixed: number;
    variable: number;
    percentage: number;
  };
}

interface Settings {
  totalRooms: number;
  guestsPerRoom: number;
  monthlyOccupancy: number;
  averageRoomPrice: number;
}

export default function CostCalculator() {
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      name: 'Luz',
      amount: 0,
      frequency: 'monthly',
      isPercentage: false
    },
    {
      id: '2',
      name: 'Agua',
      amount: 0,
      frequency: 'quarterly',
      isPercentage: false
    },
    {
      id: '3',
      name: 'Limpieza',
      amount: 0,
      frequency: 'monthly',
      isPercentage: false
    },
    {
      id: '4',
      name: 'Seguro de la casa',
      amount: 0,
      frequency: 'yearly',
      isPercentage: false
    },
    {
      id: '5',
      name: 'Software de gestión',
      amount: 0,
      frequency: 'monthly',
      isPercentage: false
    },
    {
      id: '6',
      name: 'Impuestos',
      amount: 0,
      frequency: 'yearly',
      isPercentage: true,
      percentage: 0
    },
    {
      id: '7',
      name: 'Comisiones OTA',
      amount: 0,
      frequency: 'per_guest',
      isPercentage: true,
      percentage: 0
    }
  ]);

  const [totalRooms, setTotalRooms] = useState(6);
  const [guestsPerRoom, setGuestsPerRoom] = useState(2);
  const [monthlyOccupancy, setMonthlyOccupancy] = useState(80); // Porcentaje
  const [averageRoomPrice, setAverageRoomPrice] = useState(50); // Precio medio por habitación
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    const savedExpenses = localStorage.getItem('cost-calculator-expenses');
    const savedSettings = localStorage.getItem('cost-calculator-settings');
    
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
    
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setTotalRooms(settings.totalRooms || 6);
      setGuestsPerRoom(settings.guestsPerRoom || 2);
      setMonthlyOccupancy(settings.monthlyOccupancy || 80);
      setAverageRoomPrice(settings.averageRoomPrice || 50);
    }
  }, []);

  // Guardar datos cuando cambien
  useEffect(() => {
    localStorage.setItem('cost-calculator-expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('cost-calculator-settings', JSON.stringify({
      totalRooms,
      guestsPerRoom,
      monthlyOccupancy,
      averageRoomPrice
    }));
  }, [totalRooms, guestsPerRoom, monthlyOccupancy, averageRoomPrice]);

  const addExpense = () => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      name: '',
      amount: 0,
      frequency: 'monthly',
      isPercentage: false
    };
    setExpenses([...expenses, newExpense]);
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };

  const updateExpense = (id: string, field: keyof Expense, value: any) => {
    setExpenses(expenses.map(expense => 
      expense.id === id ? { ...expense, [field]: value } : expense
    ));
  };

  const calculateCosts = () => {
    let totalMonthlyCosts = 0;
    let fixedCosts = 0;
    let variableCosts = 0;
    let percentageCosts = 0;

    expenses.forEach(expense => {
      if (!expense.name.trim()) return;

      let monthlyAmount = 0;
      
      if (expense.isPercentage && expense.percentage) {
        // Para porcentajes, asumimos que se aplican sobre ingresos estimados
        const estimatedMonthlyRevenue = totalRooms * 30 * (monthlyOccupancy / 100) * averageRoomPrice;
        monthlyAmount = (estimatedMonthlyRevenue * expense.percentage) / 100;
        percentageCosts += monthlyAmount;
      } else {
        // Convertir a costos mensuales
        switch (expense.frequency) {
          case 'monthly':
            monthlyAmount = expense.amount;
            break;
          case 'quarterly':
            monthlyAmount = expense.amount / 3;
            break;
          case 'yearly':
            monthlyAmount = expense.amount / 12;
            break;
          case 'per_guest':
            const monthlyGuests = totalRooms * (monthlyOccupancy / 100) * 30 * guestsPerRoom;
            monthlyAmount = expense.amount * monthlyGuests;
            break;
          case 'per_room':
            monthlyAmount = expense.amount * totalRooms;
            break;
        }
        
        if (expense.frequency === 'per_guest') {
          variableCosts += monthlyAmount;
        } else {
          fixedCosts += monthlyAmount;
        }
      }
      
      totalMonthlyCosts += monthlyAmount;
    });

    // Calcular costos por habitación y por huésped
    const costPerRoom = totalMonthlyCosts / totalRooms;
    const monthlyGuests = totalRooms * (monthlyOccupancy / 100) * 30 * guestsPerRoom;
    const costPerGuest = monthlyGuests > 0 ? totalMonthlyCosts / monthlyGuests : 0;

    setCalculationResult({
      totalMonthlyCosts,
      costPerRoom,
      costPerGuest,
      breakdown: {
        fixed: fixedCosts,
        variable: variableCosts,
        percentage: percentageCosts
      }
    });
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      yearly: 'Anual',
      per_guest: 'Por huésped',
      per_room: 'Por habitación'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header mejorado */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 flex items-center gap-3">
              <span className="text-4xl sm:text-5xl md:text-6xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🧮</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Calculadora de Costos
              </span>
            </h1>
            <p className="text-gray-700 text-base sm:text-lg mb-4">
              Calcula el costo real por huésped en tu alojamiento
            </p>
            <button
              onClick={calculateCosts}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              <Calculator className="h-5 w-5" />
              ✨ Calcular Costos
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuración */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>⚙️</span>
                  <Settings className="h-6 w-6" />
                  Configuración
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🏠 Total de habitaciones
                    </label>
                    <input
                      type="number"
                      value={totalRooms}
                      onChange={(e) => setTotalRooms(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      👥 Huéspedes por habitación
                    </label>
                    <input
                      type="number"
                      value={guestsPerRoom}
                      onChange={(e) => setGuestsPerRoom(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📊 Ocupación mensual (%)
                    </label>
                    <input
                      type="number"
                      value={monthlyOccupancy}
                      onChange={(e) => setMonthlyOccupancy(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💶 Precio medio por habitación (€/noche)
                    </label>
                    <input
                      type="number"
                      value={averageRoomPrice}
                      onChange={(e) => setAverageRoomPrice(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gastos */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>💸</span>
                    <Euro className="h-6 w-6" />
                    Gastos Operativos
                  </h2>
                  <button
                    onClick={addExpense}
                    className="flex items-center px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    ✨ Añadir Gasto
                  </button>
                </div>

                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📝 Concepto
                          </label>
                          <input
                            type="text"
                            value={expense.name}
                            onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                            placeholder="Ej: Luz, Agua, Limpieza..."
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📅 Frecuencia
                          </label>
                          <select
                            value={expense.frequency}
                            onChange={(e) => updateExpense(expense.id, 'frequency', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                          >
                            <option value="monthly">Mensual</option>
                            <option value="quarterly">Trimestral</option>
                            <option value="yearly">Anual</option>
                            <option value="per_guest">Por huésped</option>
                            <option value="per_room">Por habitación</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            💰 {expense.isPercentage ? 'Porcentaje (%)' : 'Importe (€)'}
                          </label>
                          <input
                            type="number"
                            value={expense.isPercentage ? expense.percentage : expense.amount}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (expense.isPercentage) {
                                updateExpense(expense.id, 'percentage', value);
                              } else {
                                updateExpense(expense.id, 'amount', value);
                              }
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                            min="0"
                            step={expense.isPercentage ? "0.1" : "0.01"}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🏷️ Tipo
                          </label>
                          <select
                            value={expense.isPercentage ? 'percentage' : 'fixed'}
                            onChange={(e) => updateExpense(expense.id, 'isPercentage', e.target.value === 'percentage')}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900"
                          >
                            <option value="fixed">Fijo</option>
                            <option value="percentage">Porcentaje</option>
                          </select>
                        </div>

                        <div>
                          <button
                            onClick={() => removeExpense(expense.id)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all transform hover:scale-105 flex items-center justify-center font-semibold shadow-lg"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resultados */}
          {calculationResult && (
            <div className="mt-6 bg-white rounded-xl shadow-lg border border-blue-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📊</span>
                <Calculator className="h-6 w-6" />
                Resultados del Cálculo
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center mb-2">
                    <Euro className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">Costo Total Mensual</p>
                      <p className="text-3xl font-bold text-blue-600">
                        €{calculationResult.totalMonthlyCosts.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center mb-2">
                    <Home className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">Costo por Habitación</p>
                      <p className="text-3xl font-bold text-green-600">
                        €{calculationResult.costPerRoom.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-center mb-2">
                    <Users className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">Costo por Huésped</p>
                      <p className="text-3xl font-bold text-purple-600">
                        €{calculationResult.costPerGuest.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">Costo por Noche</p>
                      <p className="text-3xl font-bold text-orange-600">
                        €{(calculationResult.costPerGuest / 30).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desglose detallado */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📈</span>
                  Desglose de Costos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200">
                    <p className="text-sm text-gray-600 font-semibold mb-2">💰 Costos Fijos</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      €{calculationResult.breakdown.fixed.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200">
                    <p className="text-sm text-gray-600 font-semibold mb-2">📊 Costos Variables</p>
                    <p className="text-2xl font-bold text-teal-600">
                      €{calculationResult.breakdown.variable.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200">
                    <p className="text-sm text-gray-600 font-semibold mb-2">📉 Costos por Porcentaje</p>
                    <p className="text-2xl font-bold text-amber-600">
                      €{calculationResult.breakdown.percentage.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-5">
                <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>💡</span>
                  Información Importante
                </h4>
                <ul className="text-sm text-yellow-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>El cálculo se basa en una ocupación del <strong>{monthlyOccupancy}%</strong> mensual</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>Se utiliza un precio medio de <strong>€{averageRoomPrice}</strong> por noche para cálculos de porcentajes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>Los costos por huésped se calculan dividiendo entre el total de huéspedes mensuales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>Los datos se guardan automáticamente en tu navegador</span>
                  </li>
                </ul>
              </div>

              {/* Ejemplos de gastos */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
                  Ejemplos de Gastos Comunes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="font-bold mb-2 text-blue-900">💰 Gastos Fijos:</p>
                    <ul className="space-y-1">
                      <li>• Luz: €80/mes</li>
                      <li>• Agua: €120/trimestre</li>
                      <li>• Seguro: €300/año</li>
                      <li>• Software gestión: €25/mes</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="font-bold mb-2 text-blue-900">📊 Gastos Variables:</p>
                    <ul className="space-y-1">
                      <li>• Limpieza: €15/habitación</li>
                      <li>• Desayunos: €5/huésped</li>
                      <li>• Ropa de cama: €200/año</li>
                      <li>• Mantenimiento: €50/mes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
