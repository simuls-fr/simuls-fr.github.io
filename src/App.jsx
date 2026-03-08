import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, 
  Wallet, 
  Calendar, 
  User, 
  Calculator, 
  Info,
  ChevronRight,
  PieChart as PieChartIcon
} from 'lucide-react';

const App = () => {
  // --- State Initialisé avec les valeurs du CSV ---
  const [inputs, setInputs] = useState({
    salaireBrutInitial: 1800,
    anneesCotisation: 43,
    esperanceVieRetraite: 25,
    tauxEvolutionSalaire: 1, // en %
    rendementAnnuel: 5, // en %
    tauxCotisationTotal: 28, // en %
    tauxNet: 73.3, // Approximation net/brut du CSV
  });

  const [results, setResults] = useState({
    totalCotisations: 0,
    totalRendements: 0,
    capitalFinal: 0,
    pensionBruteMensuelle: 0,
    tauxRemplacementBrut: 0,
    data: []
  });

// --- Logique de Calcul Optimisée ---
  useEffect(() => {
    const v0 = inputs.salaireBrutInitial * 12 * (inputs.tauxCotisationTotal / 100); // Cotisation annuelle initiale
    const r = inputs.rendementAnnuel / 100;
    const g = inputs.tauxEvolutionSalaire / 100;
    const n = inputs.anneesCotisation;

    // 1. Calcul du Capital Final via la formule de l'Annuité Croissante
    // Sn = v0 * [(1+r)^n - (1+g)^n] / (r - g)
    let capitalFinalCalculé = 0;
    if (Math.abs(r - g) < 0.0001) {
      // Cas particulier où le rendement égale l'évolution du salaire
      capitalFinalCalculé = v0 * n * Math.pow(1 + r, n - 1);
    } else {
      capitalFinalCalculé = v0 * (Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g);
    }

    // 2. Génération des données pour le graphique (évolution annuelle)
    const yearlyData = [];
    let cumulCotisations = 0;
    let currentSalaireBrut = inputs.salaireBrutInitial * 12;

    for (let i = 1; i <= n; i++) {
      const cotisAnnee = currentSalaireBrut * (inputs.tauxCotisationTotal / 100);
      cumulCotisations += cotisAnnee;
      
      // Calcul du capital au temps 'i' pour le graphique
      let capI = 0;
      if (Math.abs(r - g) < 0.0001) {
        capI = v0 * i * Math.pow(1 + r, i - 1);
      } else {
        capI = v0 * (Math.pow(1 + r, i) - Math.pow(1 + g, i)) / (r - g);
      }

      yearlyData.push({
        annee: i,
        salaireBrutMensuel: Math.round(currentSalaireBrut / 12),
        cotisationsCumulees: Math.round(cumulCotisations),
        capitalTotal: Math.round(capI),
        rendementCumule: Math.round(capI - cumulCotisations)
      });

      currentSalaireBrut *= (1 + g);
    }

    // 3. Calcul des résultats de sortie
    const pensionBruteAnnuelle = capitalFinalCalculé / inputs.esperanceVieRetraite;
    const dernierSalaireBrutAnnuel = (inputs.salaireBrutInitial * 12) * Math.pow(1 + g, n - 1);
    
    setResults({
      totalCotisations: cumulCotisations,
      totalRendements: capitalFinalCalculé - cumulCotisations,
      capitalFinal: capitalFinalCalculé,
      pensionBruteMensuelle: pensionBruteAnnuelle / 12,
      tauxRemplacementBrut: (pensionBruteAnnuelle / dernierSalaireBrutAnnuel) * 100,
      data: yearlyData
    });
  }, [inputs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const formatEuro = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
 
  const cotisationMensuelle =
    inputs.salaireBrutInitial * (inputs.tauxCotisationTotal / 100);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="text-blue-600" />
              Simulateur de Retraite par Capitalisation
            </h1>
            <p className="text-slate-500 mt-1">Basé sur vos modèles de calcul de cotisations et rendements.</p>
          </div>
          <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg flex flex-col items-center">
            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Pension Mensuelle Estime</span>
            <span className="text-3xl font-black">{formatEuro(results.pensionBruteMensuelle)}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Controls */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500" />
                Paramètres de Carrière
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salaire Brut Initial (mensuel)</label>
                  <input 
                    type="range" name="salaireBrutInitial" min="100" max="10000" step="100"
                    value={inputs.salaireBrutInitial} onChange={handleInputChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-sm mt-1 font-semibold">
                    <span>100 €</span>
                    <span className="text-blue-600">{formatEuro(inputs.salaireBrutInitial)}</span>
                    <span>10 000 €</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Durée de cotisation (ans)</label>
                  <input 
                    type="range" name="anneesCotisation" min="5" max="50" step="1"
                    value={inputs.anneesCotisation} onChange={handleInputChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-sm mt-1 font-semibold">
                    <span>5 ans</span>
                    <span className="text-blue-600">{inputs.anneesCotisation} ans</span>
                    <span>50 ans</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Évolution Salaire Annuelle (%)</label>
                  <input 
                    type="number" name="tauxEvolutionSalaire" value={inputs.tauxEvolutionSalaire} onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Finance & Retraite
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Taux de Cotisation Total (%)</label>
                  <input 
                    type="range" name="tauxCotisationTotal" min="5" max="40" step="0.5"
                    value={inputs.tauxCotisationTotal} onChange={handleInputChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-sm mt-1 font-semibold">
                    <span>5%</span>
                    <span className="text-emerald-600">
                      {inputs.tauxCotisationTotal}% 
                      <span className="text-slate-500 font-normal ml-2">
                        ({formatEuro(cotisationMensuelle)})
                      </span>
                    </span>
                    <span>40%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rendement Annuel Net Inflation (%)</label>
                  <input 
                    type="range" name="rendementAnnuel" min="0" max="15" step="0.1"
                    value={inputs.rendementAnnuel} onChange={handleInputChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-sm mt-1 font-semibold">
                    <span>0%</span>
                    <span className="text-emerald-600">{inputs.rendementAnnuel}%</span>
                    <span>15%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Espérance de vie à la retraite (ans)</label>
                  <input 
                    type="number" name="esperanceVieRetraite" value={inputs.esperanceVieRetraite} onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Définit la vitesse de consommation du capital.</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Dashboard */}
          <main className="lg:col-span-8 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100
                              transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-300 relative">
                <span className="text-slate-500 text-sm font-medium">Capital Final</span>
                <div className="text-2xl font-bold text-slate-800">{formatEuro(results.capitalFinal)}</div>
                <div className="mt-2 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                  Total accumulé
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100
                              transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-300 relative">
                <span className="text-slate-500 text-sm font-medium">Taux de Remplacement</span>
                <div className="text-2xl font-bold text-slate-800">{results.tauxRemplacementBrut.toFixed(1)} %</div>
                <div className="mt-2 flex items-center text-xs font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-full">
                  Vs dernier salaire
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100
                              transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-300 relative">
                <span className="text-slate-500 text-sm font-medium">Part Intérêts/Rendement</span>
                <div className="text-2xl font-bold text-slate-800">{((results.totalRendements / results.capitalFinal) * 100).toFixed(1)} %</div>
                <div className="mt-2 flex items-center text-xs font-bold text-purple-600 bg-purple-50 w-fit px-2 py-1 rounded-full">
                  Effet cumulé
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Croissance du Capital sur {inputs.anneesCotisation} ans
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.data}>
                    <defs>
                      <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCotis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="annee" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      label={{ value: 'Années de cotisations', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-lg text-sm text-slate-900">
                              <div className="font-bold mb-1">Année {label}</div>
                              <div>Salaire Brut Mensuel: {formatEuro(dataPoint.salaireBrutMensuel)}</div>
                              <div>Total Cotisations: {formatEuro(dataPoint.cotisationsCumulees)}</div>
                              <div>Capital Total: {formatEuro(dataPoint.capitalTotal)}</div>
                              <div className="mt-2 text-xs text-purple-600">
                                Intérêts cumulés: {formatEuro(dataPoint.rendementCumule)}
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                Astuce: Les intérêts composés augmentent chaque année, même si vos cotisations restent stables.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Area 
                      name="Capital Total (avec intérêts)" 
                      type="monotone" 
                      dataKey="capitalTotal" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorCapital)" 
                    />
                    <Area 
                      name="Total Cotisations versées" 
                      type="monotone" 
                      dataKey="cotisationsCumulees" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fillOpacity={1} 
                      fill="url(#colorCotis)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

{/* Analysis Section */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

  {/* Observation clé */}
  <div className="relative bg-blue-50 p-6 rounded-3xl border border-blue-100
                  transform transition-all duration-300 ease-in-out
                  hover:scale-105 hover:shadow-xl hover:border-blue-300">

    <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
      <Info className="w-5 h-5" />
      Observation clé
    </h4>

    <p className="text-blue-800 text-sm leading-relaxed">
      Grâce à un rendement de {inputs.rendementAnnuel}%, vos intérêts représentent 
      <span className="font-bold"> {formatEuro(results.totalRendements)}</span>, soit plus que le montant total 
      des cotisations que vous avez réellement versées ({formatEuro(results.totalCotisations)}). 
      C'est la magie des intérêts composés sur {inputs.anneesCotisation} ans.
    </p>

  </div>


            {/* Structure de la retraite */}
            <div className="relative bg-slate-800 p-6 rounded-3xl text-white shadow-xl
                              transform transition-all duration-300 ease-in-out
                              hover:scale-105 hover:shadow-2xl">

                <h4 className="font-bold flex items-center gap-2 mb-3">
                  <PieChartIcon className="w-5 h-5 text-blue-400" />
                  Structure de la retraite
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Dernier salaire mensuel estimé</span>
                    <span className="font-mono">
                      {formatEuro(results.data[results.data.length - 1]?.salaireBrutMensuel)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Pension brute mensuelle</span>
                    <span className="font-mono text-blue-400 font-bold">
                      {formatEuro(results.pensionBruteMensuelle)}
                    </span>
                  </div>

                  <div className="h-px bg-slate-700 my-2"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase opacity-50">
                      Taux de remplacement
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      {results.tauxRemplacementBrut.toFixed(1)}%
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </main>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-xs">
          Simulateur basé sur un modèle de capitalisation pure. Les montants sont exprimés en Euros constants (net d'inflation).
        </footer>
      </div>
    </div>
  );
};

export default App;
