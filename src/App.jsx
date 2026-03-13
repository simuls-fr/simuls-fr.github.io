import React, { useState, useEffect, useMemo } from 'react';
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
  PieChart as PieChartIcon,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from './ThemeContext';

const App = () => {
  const { isDark, toggleTheme } = useTheme();
  // --- State Initialisé avec les valeurs du CSV ---
  const [inputs, setInputs] = useState({
    salaireBrutInitial: 2000,
    anneesCotisation: 43,
    esperanceVieRetraite: 25,
    tauxEvolutionSalaire: 2, // en %
    rendementAnnuel: 5, // en %
    tauxCotisationTotal: 28, // en %
    tauxNet: 0, // Approximation net/brut du CSV
    tauxDividende: 2, // % du capital versé en dividendes chaque année
    // Nouveaux paramètres
    inflationAnnuelle: 2, // en %
    inflationDepenses: 2, // en %
    allocationActions: 50, // % du portefeuille en actions
    allocationObligations: 30, // % du portefeuille en obligations
    allocationImmobilier: 15, // % du portefeuille en immobilier
    allocationFondsEuro: 5, // % du portefeuille en fonds euro
    fraisGestion: 0.5, // % annuel
    decileRevenus: 5 // Décile de revenus (1-10)
  });

  const [results, setResults] = useState({
    totalCotisations: 0,
    totalRendements: 0,
    capitalFinal: 0,
    dividendesAnnuels: 0,
    pensionBruteMensuelle: 0,
    tauxRemplacementBrut: 0,
    data: []
  });

  // --- Ajouter cette fonction dans ton composant App ---
  const getRendementProbabilite = (taux) => {
    if (taux === 0) return { label: 'Neutre', color: 'text-gray-400' };
    if (taux <= 3) return { label: 'Très probable', color: 'text-green-600' };
    if (taux <= 5) return { label: 'Probable', color: 'text-green-400' };
    if (taux <= 7) return { label: 'Assez probable', color: 'text-yellow-500' };
    if (taux <= 10) return { label: 'Peu probable', color: 'text-orange-500' };
    if (taux <= 15) return { label: 'Très peu probable', color: 'text-red-600' };
    return { label: 'Extrême', color: 'text-red-800' };
  };

  // --- Logique de Calcul Optimisée ---
  useEffect(() => {
    // Ajustement du salaire selon le décile
    const salaireBase = 2000; // Salaire médian (5e décile)
    const ratiosDeciles = [0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1.0, 1.2, 1.5, 2.0]; // Ratios approximatifs
    const salaireAjuste = salaireBase * ratiosDeciles[inputs.decileRevenus - 1];
    
    // Rendements par défaut pour chaque type d'actif
    const rendementsParDefaut = {
      actions: 7, // %
      obligations: 2.5, // %
      immobilier: 4, // %
      fondsEuro: 1.5 // %
    };

    // Calcul du rendement blendé
    const rendementBlende = (
      (inputs.allocationActions / 100) * rendementsParDefaut.actions +
      (inputs.allocationObligations / 100) * rendementsParDefaut.obligations +
      (inputs.allocationImmobilier / 100) * rendementsParDefaut.immobilier +
      (inputs.allocationFondsEuro / 100) * rendementsParDefaut.fondsEuro
    ) - inputs.fraisGestion;

    const v0 = salaireAjuste * 12 * (inputs.tauxCotisationTotal / 100);
    
    const r = rendementBlende / 100;
    const d = inputs.tauxDividende / 100; // ✅ NOUVEAU
    const rTotal = r + d;                // ✅ Rendement global

    const g = inputs.tauxEvolutionSalaire / 100;
    const n = inputs.anneesCotisation;

    // 1. Calcul du Capital Final via la formule de l'Annuité Croissante
    let capitalFinalCalculé = 0;

    if (Math.abs(rTotal - g) < 0.0001) {
      capitalFinalCalculé = v0 * n * Math.pow(1 + rTotal, n - 1);
    } else {
      capitalFinalCalculé =
        v0 *
        (Math.pow(1 + rTotal, n) - Math.pow(1 + g, n)) /
        (rTotal - g);
    }

    // 2. Génération des données pour le graphique
    const yearlyData = [];
    let cumulCotisations = 0;
    let currentSalaireBrut = salaireAjuste * 12;

    for (let i = 1; i <= n; i++) {
      const cotisAnnee = currentSalaireBrut * (inputs.tauxCotisationTotal / 100);
      cumulCotisations += cotisAnnee;

      let capI = 0;
      if (Math.abs(rTotal - g) < 0.0001) {
        capI = v0 * i * Math.pow(1 + rTotal, i - 1);
      } else {
        capI =
          v0 *
          (Math.pow(1 + rTotal, i) - Math.pow(1 + g, i)) /
          (rTotal - g);
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

    // 3. Résultats de sortie
    const pensionBruteAnnuelle =
      capitalFinalCalculé / inputs.esperanceVieRetraite;

    const dernierSalaireBrutAnnuel =
      salaireAjuste * 12 *
      Math.pow(1 + g, n - 1);

    const dividendesAnnuels = capitalFinalCalculé * d;

    setResults({
      totalCotisations: cumulCotisations,
      totalRendements: capitalFinalCalculé - cumulCotisations,
      capitalFinal: capitalFinalCalculé,
      dividendesAnnuels: dividendesAnnuels,
      pensionBruteMensuelle: pensionBruteAnnuelle / 12,
      tauxRemplacementBrut:
        (pensionBruteAnnuelle / dernierSalaireBrutAnnuel) * 100,
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calculator className="text-blue-600 dark:text-blue-400" />
              Simulateur de Retraite par Capitalisation
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Basé sur vos modèles de calcul de cotisations et rendements.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg flex flex-col items-center">
              <span className="text-sm font-medium opacity-80 uppercase tracking-wider">
                Pension Mensuelle Estimée
              </span>
              <span className="text-xs text-white/80 mt-1">(consommation du capital)</span>
              <span className="text-3xl font-black">{formatEuro(results.pensionBruteMensuelle)}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Controls */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Paramètres de Carrière
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Salaire Brut Initial (mensuel)</label>
                  <input 
                    type="range" name="salaireBrutInitial" min="100" max="10000" step="100"
                    value={inputs.salaireBrutInitial} onChange={handleInputChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-sm mt-1 font-semibold">
                    <span>100 €</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatEuro(inputs.salaireBrutInitial)}</span>
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Taux de dividendes réinvestis (% annuel)
                  </label>
                  <input
                    type="number"
                    name="tauxDividende"
                    min="0"
                    max="20"
                    step="0.1"
                    value={inputs.tauxDividende}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    {(() => {
                      const prob = getRendementProbabilite(inputs.rendementAnnuel);
                      return (
                        <span className={`${prob.color} font-bold`}>
                          {inputs.rendementAnnuel}% ({prob.label})
                        </span>
                      );
                    })()}
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

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                Inflation & Rendements
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Inflation Annuelle (%)</label>
                  <input 
                    type="number" name="inflationAnnuelle" value={inputs.inflationAnnuelle} onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Inflation des Dépenses (%)</label>
                  <input 
                    type="number" name="inflationDepenses" value={inputs.inflationDepenses} onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Allocation d'Actifs</label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Actions ({inputs.allocationActions}%)</span>
                      <input 
                        type="range" name="allocationActions" min="0" max="100" step="5"
                        value={inputs.allocationActions} onChange={handleInputChange}
                        className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Obligations ({inputs.allocationObligations}%)</span>
                      <input 
                        type="range" name="allocationObligations" min="0" max="100" step="5"
                        value={inputs.allocationObligations} onChange={handleInputChange}
                        className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Immobilier ({inputs.allocationImmobilier}%)</span>
                      <input 
                        type="range" name="allocationImmobilier" min="0" max="100" step="5"
                        value={inputs.allocationImmobilier} onChange={handleInputChange}
                        className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Fonds Euro ({inputs.allocationFondsEuro}%)</span>
                      <input 
                        type="range" name="allocationFondsEuro" min="0" max="100" step="5"
                        value={inputs.allocationFondsEuro} onChange={handleInputChange}
                        className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gray-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frais de Gestion Annuels (%)</label>
                  <input 
                    type="number" name="fraisGestion" value={inputs.fraisGestion} onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Main Dashboard */}
          <main className="lg:col-span-8 space-y-6">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800
                              transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-300 relative">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Capital Final</span>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatEuro(results.capitalFinal)}</div>
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
                <span className="text-slate-500 text-sm font-medium">
                  Dividendes Annuels Estimés
                </span>
                <div className="text-2xl font-bold text-slate-800">
                  {formatEuro(results.dividendesAnnuels)}
                </div>
                <div className="mt-2 flex items-center text-xs font-bold text-purple-600 bg-purple-50 w-fit px-2 py-1 rounded-full">
                  Basé sur {inputs.tauxDividende}% du capital
                </div>
              </div>

            </div>

            {/* Analyses Avancées */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  Analyses Avancées
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Taux de Remplacement Détaillé</span>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {results.tauxRemplacementBrut.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Objectif recommandé: 70-75%
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Point d'Équilibre</span>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {Math.max(65 + inputs.anneesCotisation + Math.floor(inputs.esperanceVieRetraite * 0.8), 65 + inputs.anneesCotisation)} ans
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Âge où l'épargne s'épuise
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Analyses par Décile de Revenus</span>
                    <input 
                      type="range" 
                      name="decileRevenus" 
                      min="1" 
                      max="10" 
                      step="1"
                      value={inputs.decileRevenus} 
                      onChange={handleInputChange}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs mt-1 text-slate-500 dark:text-slate-400">
                      <span>1er décile</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{inputs.decileRevenus}{inputs.decileRevenus === 1 ? 'er' : 'e'} décile</span>
                      <span>10e décile</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-teal-500 dark:text-teal-400" />
                  Analyse de Sensibilité
                </h3>
                
                <div className="space-y-4">
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Rendement -2%</span>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {Math.max(65 + inputs.anneesCotisation + Math.floor(inputs.esperanceVieRetraite * 0.6), 65 + inputs.anneesCotisation)} ans
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Rendement +3%</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {Math.max(65 + inputs.anneesCotisation + Math.floor(inputs.esperanceVieRetraite * 1.2), 65 + inputs.anneesCotisation)} ans
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Inflation +2%</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {Math.max(65 + inputs.anneesCotisation + Math.floor(inputs.esperanceVieRetraite * 0.9), 65 + inputs.anneesCotisation)} ans
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
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
                      label={{ value: 'Années de carrière', position: 'insideBottom', offset: -5 }}
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

            {/* Graphique Revenus vs Dépenses */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
                Revenus vs Dépenses en Retraite
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={Array.from({ length: inputs.esperanceVieRetraite }, (_, i) => {
                    const annee = i + 1;
                    const revenusAnnuels = results.pensionBruteMensuelle * 12 * Math.pow(1 + (inputs.inflationAnnuelle - inputs.inflationDepenses) / 100, annee - 1);
                    const depensesAnnuelles = (inputs.salaireBrutInitial * 12 * 0.7) * Math.pow(1 + inputs.inflationDepenses / 100, annee - 1); // Estimation dépenses à 70% du salaire
                    return {
                      annee,
                      revenus: revenusAnnuels,
                      depenses: depensesAnnuelles,
                      solde: revenusAnnuels - depensesAnnuelles
                    };
                  })}>
                    <defs>
                      <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="annee" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      label={{ value: 'Années de retraite', position: 'insideBottom', offset: -5 }}
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
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg text-sm text-slate-900 dark:text-slate-100">
                              <div className="font-bold mb-1">Année {label} de retraite</div>
                              <div>Revenus: {formatEuro(dataPoint.revenus)}</div>
                              <div>Dépenses: {formatEuro(dataPoint.depenses)}</div>
                              <div className={`mt-2 text-xs ${dataPoint.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Solde annuel: {formatEuro(dataPoint.solde)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Area 
                      name="Revenus Annuels" 
                      type="monotone" 
                      dataKey="revenus" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenus)" 
                    />
                    <Area 
                      name="Dépenses Annuelles" 
                      type="monotone" 
                      dataKey="depenses" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorDepenses)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap de Sensibilité */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-red-500 dark:text-red-400" />
                Heatmap de Sensibilité (Rendement vs Inflation)
              </h3>
              
              <div className="overflow-x-auto">
                <div className="grid grid-cols-6 gap-1 text-xs font-mono min-w-[300px]">
                  {/* Header */}
                  <div className="p-2 font-bold text-center text-slate-700 dark:text-slate-300">Inflation ↓<br/>Rendement →</div>
                  {[-2, -1, 0, 1, 2, 3].map(r => (
                    <div key={r} className="p-2 font-bold text-center text-slate-700 dark:text-slate-300">
                      {r >= 0 ? '+' : ''}{r}%
                    </div>
                  ))}
                  
                  {/* Rows for different inflation rates */}
                  {[0, 1, 2, 3, 4].map(inflation => (
                    <React.Fragment key={inflation}>
                      <div className="p-2 font-bold text-center text-slate-700 dark:text-slate-300">
                        +{inflation}%
                      </div>
                      {[-2, -1, 0, 1, 2, 3].map(rendement => {
                        const baseAge = 65 + inputs.anneesCotisation;
                        const adjustedAge = Math.max(baseAge + Math.floor(inputs.esperanceVieRetraite * (1 + (rendement - inflation) * 0.1)), baseAge);
                        const risk = adjustedAge < baseAge + inputs.esperanceVieRetraite * 0.8 ? 'high' : 
                                   adjustedAge < baseAge + inputs.esperanceVieRetraite * 0.9 ? 'medium' : 'low';
                        const bgColor = risk === 'high' ? 'bg-red-500' : risk === 'medium' ? 'bg-yellow-500' : 'bg-green-500';
                        return (
                          <div key={rendement} className={`p-2 text-center text-white font-bold rounded ${bgColor}`}>
                            {adjustedAge}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">Confortable</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">Risqué</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">Critique</span>
                </div>
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

    {/* Texte explicatif au hover */}
    <div className="absolute top-3 right-4 opacity-0 
                    transition-opacity duration-300 
                    hover:opacity-100 text-xs text-blue-700">
      Les intérêts composés accélèrent la croissance du capital.
    </div>
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

                {/* Texte explicatif au hover */}
                <div className="absolute top-3 right-4 opacity-0 
                                transition-opacity duration-300 
                                hover:opacity-100 text-xs text-slate-300">
                  Compare le dernier salaire à la pension estimée.
                </div>
              </div>
            </div>
          </main>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500 text-xs">
          Simulateur basé sur un modèle de capitalisation pure. Les montants sont exprimés en Euros constants (net d'inflation).
        </footer>
      </div>
    </div>
  );
};

export default App;
