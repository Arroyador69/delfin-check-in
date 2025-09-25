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
      name: 'Impuestos',
      amount: 0,
      frequency: 'yearly',
      isPercentage: true,
      percentage: 0
    },
    {
      id: '5',
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
      monthlyOccupancy
    }));
  }, [totalRooms, guestsPerRoom, monthlyOccupancy]);

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
        const estimatedMonthlyRevenue = totalRooms * 30 * (monthlyOccupancy / 100) * 50; // 50€ por noche estimado
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Calculadora de Costos</h1>
                  <p className="text-gray-600">Calcula el costo real por huésped en tu alojamiento</p>
                </div>
              </div>
              <button
                onClick={calculateCosts}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuración */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Configuración
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total de habitaciones
                    </label>
                    <input
                      type="number"
                      value={totalRooms}
                      onChange={(e) => setTotalRooms(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Huéspedes por habitación
                    </label>
                    <input
                      type="number"
                      value={guestsPerRoom}
                      onChange={(e) => setGuestsPerRoom(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ocupación mensual (%)
                    </label>
                    <input
                      type="number"
                      value={monthlyOccupancy}
                      onChange={(e) => setMonthlyOccupancy(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gastos */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Euro className="h-5 w-5 mr-2" />
                    Gastos Operativos
                  </h2>
                  <button
                    onClick={addExpense}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir
                  </button>
                </div>

                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Concepto
                          </label>
                          <input
                            type="text"
                            value={expense.name}
                            onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                            placeholder="Ej: Luz, Agua, Limpieza..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Frecuencia
                          </label>
                          <select
                            value={expense.frequency}
                            onChange={(e) => updateExpense(expense.id, 'frequency', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="monthly">Mensual</option>
                            <option value="quarterly">Trimestral</option>
                            <option value="yearly">Anual</option>
                            <option value="per_guest">Por huésped</option>
                            <option value="per_room">Por habitación</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {expense.isPercentage ? 'Porcentaje (%)' : 'Importe (€)'}
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step={expense.isPercentage ? "0.1" : "0.01"}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo
                          </label>
                          <select
                            value={expense.isPercentage ? 'percentage' : 'fixed'}
                            onChange={(e) => updateExpense(expense.id, 'isPercentage', e.target.value === 'percentage')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="fixed">Fijo</option>
                            <option value="percentage">Porcentaje</option>
                          </select>
                        </div>

                        <div>
                          <button
                            onClick={() => removeExpense(expense.id)}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
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
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Resultados del Cálculo
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Euro className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Costo Total Mensual</p>
                      <p className="text-2xl font-bold text-blue-600">
                        €{calculationResult.totalMonthlyCosts.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Home className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Costo por Habitación</p>
                      <p className="text-2xl font-bold text-green-600">
                        €{calculationResult.costPerRoom.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Costo por Huésped</p>
                      <p className="text-2xl font-bold text-purple-600">
                        €{calculationResult.costPerGuest.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600">Costo por Noche</p>
                      <p className="text-2xl font-bold text-orange-600">
                        €{(calculationResult.costPerGuest / 30).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desglose detallado */}
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Desglose de Costos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Costos Fijos</p>
                    <p className="text-lg font-semibold text-gray-900">
                      €{calculationResult.breakdown.fixed.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Costos Variables</p>
                    <p className="text-lg font-semibold text-gray-900">
                      €{calculationResult.breakdown.variable.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Costos por Porcentaje</p>
                    <p className="text-lg font-semibold text-gray-900">
                      €{calculationResult.breakdown.percentage.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Información Importante</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• El cálculo se basa en una ocupación del {monthlyOccupancy}% mensual</li>
                  <li>• Se asume un precio promedio de €50 por noche para cálculos de porcentajes</li>
                  <li>• Los costos por huésped se calculan dividiendo entre el total de huéspedes mensuales</li>
                  <li>• Los datos se guardan automáticamente en tu navegador</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
