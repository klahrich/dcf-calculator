import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

const DCFCalculator = () => {
  const [mode, setMode] = useState('dcf');
  const [inputs, setInputs] = useState({
    discountRate: 10,
    marketCap: 1000,
    netCash: 50,
    fcfApproach: 'specific', // 'specific' or 'growth'
    fcf1: 10,
    fcf2: 11,
    fcf3: 12,
    fcf4: 13,
    fcf5: 14,
    baseFcf: 10,
    fcfGrowthRate: 10,
    terminalGrowthRate: 3,
    sbcApproach: 'percentage', // 'percentage' or 'dilution'
    sbcPercentage: 0,
    annualDilution: 0
  });
  const [results, setResults] = useState(null);

  const calculateDCF = () => {
    const { discountRate, fcfApproach, fcf1, fcf2, fcf3, fcf4, fcf5, baseFcf, fcfGrowthRate, terminalGrowthRate, netCash, sbcApproach, sbcPercentage, annualDilution } = inputs;
    const r = (discountRate || 0) / 100;
    const g = (terminalGrowthRate || 0) / 100;
    
    // Get FCF values based on approach
    let fcfValues;
    if (fcfApproach === 'growth') {
      const growthRate = (fcfGrowthRate || 0) / 100;
      const base = baseFcf || 0;
      fcfValues = [
        base,
        base * Math.pow(1 + growthRate, 1),
        base * Math.pow(1 + growthRate, 2),
        base * Math.pow(1 + growthRate, 3),
        base * Math.pow(1 + growthRate, 4)
      ];
    } else {
      fcfValues = [fcf1 || 0, fcf2 || 0, fcf3 || 0, fcf4 || 0, fcf5 || 0];
    }
    
    // Apply SBC adjustment to FCF values
    let adjustedFcfValues = [...fcfValues];
    
    if (sbcApproach === 'percentage' && (sbcPercentage || 0) > 0) {
      // Reduce FCF by SBC percentage (treating SBC as % of FCF as proxy for % of revenue)
      adjustedFcfValues = adjustedFcfValues.map(fcf => fcf * (1 - (sbcPercentage || 0) / 100));
    }
    
    // Present value of explicit forecast period (years 1-5)
    let pvExplicit = 0;
    
    adjustedFcfValues.forEach((fcf, index) => {
      const year = index + 1;
      pvExplicit += fcf / Math.pow(1 + r, year);
    });
    
    // Terminal value calculation (using adjusted FCF5)
    const terminalFcf = adjustedFcfValues[4] * (1 + g);
    const terminalValue = r !== g ? terminalFcf / (r - g) : 0;
    const pvTerminal = terminalValue / Math.pow(1 + r, 5);
    
    // Enterprise Value = PV of all FCFs
    const enterpriseValue = pvExplicit + pvTerminal;
    
    // Equity Value = Enterprise Value + Net Cash
    let equityValue = enterpriseValue + (netCash || 0);
    
    // Apply dilution if using dilution approach
    if (sbcApproach === 'dilution' && (annualDilution || 0) > 0) {
      const dilutionFactor = Math.pow(1 - (annualDilution || 0) / 100, 5);
      equityValue = equityValue * dilutionFactor;
    }
    
    return {
      equityValue: equityValue.toFixed(2),
      enterpriseValue: enterpriseValue.toFixed(2),
      netCash: (netCash || 0).toFixed(2),
      pvExplicit: pvExplicit.toFixed(2),
      pvTerminal: pvTerminal.toFixed(2),
      terminalValue: terminalValue.toFixed(2),
      sbcImpact: sbcApproach === 'dilution' && (annualDilution || 0) > 0 
        ? ((enterpriseValue + (netCash || 0)) - equityValue).toFixed(2) 
        : sbcApproach === 'percentage' && (sbcPercentage || 0) > 0
        ? ((fcfValues[0] + fcfValues[1] + fcfValues[2] + fcfValues[3] + fcfValues[4]) - (adjustedFcfValues[0] + adjustedFcfValues[1] + adjustedFcfValues[2] + adjustedFcfValues[3] + adjustedFcfValues[4])).toFixed(2)
        : '0.00',
      breakdown: adjustedFcfValues.map((fcf, index) => ({
        year: index + 1,
        fcf: fcf.toFixed(2),
        originalFcf: fcfValues[index].toFixed(2),
        pv: (fcf / Math.pow(1 + r, index + 1)).toFixed(2)
      }))
    };
  };

  const calculateInverseDCF = () => {
    const { marketCap, fcfApproach, fcf1, fcf2, fcf3, fcf4, fcf5, baseFcf, fcfGrowthRate, terminalGrowthRate, netCash, sbcApproach, sbcPercentage, annualDilution } = inputs;
    const g = (terminalGrowthRate || 0) / 100;
    
    // Get FCF values based on approach
    let fcfValues;
    if (fcfApproach === 'growth') {
      const growthRate = (fcfGrowthRate || 0) / 100;
      const base = baseFcf || 0;
      fcfValues = [
        base,
        base * Math.pow(1 + growthRate, 1),
        base * Math.pow(1 + growthRate, 2),
        base * Math.pow(1 + growthRate, 3),
        base * Math.pow(1 + growthRate, 4)
      ];
    } else {
      fcfValues = [fcf1 || 0, fcf2 || 0, fcf3 || 0, fcf4 || 0, fcf5 || 0];
    }
    
    // Calculate implied Enterprise Value
    let targetEquityValue = marketCap || 0;
    
    // If using dilution approach, we need to reverse the dilution to get pre-dilution equity value target
    if (sbcApproach === 'dilution' && (annualDilution || 0) > 0) {
      const dilutionFactor = Math.pow(1 - (annualDilution || 0) / 100, 5);
      targetEquityValue = (marketCap || 0) / dilutionFactor;
    }
    
    const impliedEV = targetEquityValue - (netCash || 0);
    
    // Apply SBC adjustment to FCF values if using percentage approach
    let adjustedFcfValues = [...fcfValues];
    if (sbcApproach === 'percentage' && (sbcPercentage || 0) > 0) {
      adjustedFcfValues = adjustedFcfValues.map(fcf => fcf * (1 - (sbcPercentage || 0) / 100));
    }
    
    // Binary search for discount rate
    let low = 0.001; // Start with 0.1%
    let high = 0.99;  // Cap at 99%
    let tolerance = 0.0001;
    let iterations = 0;
    const maxIterations = 1000;
    
    // Safety check: if terminal growth rate >= discount rate, we'll have issues
    if (g >= 0.99) {
      return {
        impliedReturn: "Error",
        impliedEV: impliedEV.toFixed(2),
        targetEquityValue: targetEquityValue.toFixed(2),
        iterations: 0
      };
    }
    
    while (high - low > tolerance && iterations < maxIterations) {
      const mid = (low + high) / 2;
      const r = mid;
      
      // Safety check: discount rate must be > growth rate for terminal value calculation
      if (r <= g) {
        low = mid;
        iterations++;
        continue;
      }
      
      // Calculate DCF with this discount rate
      let pvExplicit = 0;
      
      adjustedFcfValues.forEach((fcf, index) => {
        const year = index + 1;
        pvExplicit += fcf / Math.pow(1 + r, year);
      });
      
      const terminalFcf = adjustedFcfValues[4] * (1 + g);
      const terminalValue = terminalFcf / (r - g);
      const pvTerminal = terminalValue / Math.pow(1 + r, 5);
      
      const calculatedEV = pvExplicit + pvTerminal;
      
      if (calculatedEV > impliedEV) {
        low = mid; // Need higher discount rate
      } else {
        high = mid; // Need lower discount rate
      }
      
      iterations++;
    }
    
    const impliedReturn = (low + high) / 2;
    
    return {
      impliedReturn: (impliedReturn * 100).toFixed(2),
      impliedEV: impliedEV.toFixed(2),
      targetEquityValue: targetEquityValue.toFixed(2),
      iterations: iterations
    };
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: (field === 'sbcApproach' || field === 'fcfApproach') ? value : 
               (value === '' ? '' : (parseFloat(value) || 0))
    }));
  };

  const handleCalculate = () => {
    if (mode === 'dcf') {
      const result = calculateDCF();
      setResults(result);
    } else {
      const result = calculateInverseDCF();
      setResults(result);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [mode, inputs]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">DCF Calculator</h1>
              <p className="text-blue-100 mt-1">Discounted Cash Flow Analysis Tool</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Mode Selection */}
          <div className="mb-8">
            <div className="flex bg-gray-100 rounded-lg p-1 max-w-md">
              <button
                onClick={() => setMode('dcf')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  mode === 'dcf'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Standard DCF
              </button>
              <button
                onClick={() => setMode('inverse')}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                  mode === 'inverse'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Inverse DCF
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Inputs Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">
                {mode === 'dcf' ? 'DCF Inputs' : 'Inverse DCF Inputs'}
              </h2>
              
              <div className="space-y-4">
                {mode === 'dcf' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.discountRate}
                      onChange={(e) => handleInputChange('discountRate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Market Cap ($M)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.marketCap}
                      onChange={(e) => handleInputChange('marketCap', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Net Cash ($M)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.netCash}
                    onChange={(e) => handleInputChange('netCash', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cash & equivalents minus total debt
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year 1-5 FCF ($M)
                    </label>
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                      <button
                        type="button"
                        onClick={() => handleInputChange('fcfApproach', 'specific')}
                        className={`flex-1 py-2 px-3 text-sm rounded-md font-medium transition-all ${
                          inputs.fcfApproach === 'specific'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Specific Values
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('fcfApproach', 'growth')}
                        className={`flex-1 py-2 px-3 text-sm rounded-md font-medium transition-all ${
                          inputs.fcfApproach === 'growth'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Growth Rate
                      </button>
                    </div>

                    {inputs.fcfApproach === 'specific' ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Year 1</label>
                          <input
                            type="number"
                            step="0.01"
                            value={inputs.fcf1}
                            onChange={(e) => handleInputChange('fcf1', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Year 2</label>
                          <input
                            type="number"
                            step="0.01"
                            value={inputs.fcf2}
                            onChange={(e) => handleInputChange('fcf2', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Year 3</label>
                          <input
                            type="number"
                            step="0.01"
                            value={inputs.fcf3}
                            onChange={(e) => handleInputChange('fcf3', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Year 4</label>
                          <input
                            type="number"
                            step="0.01"
                            value={inputs.fcf4}
                            onChange={(e) => handleInputChange('fcf4', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Year 5</label>
                          <input
                            type="number"
                            step="0.01"
                            value={inputs.fcf5}
                            onChange={(e) => handleInputChange('fcf5', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Base FCF (Year 1)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={inputs.baseFcf}
                            onChange={(e) => handleInputChange('baseFcf', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Annual FCF Growth Rate (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={inputs.fcfGrowthRate}
                            onChange={(e) => handleInputChange('fcfGrowthRate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terminal Growth Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.terminalGrowthRate}
                      onChange={(e) => handleInputChange('terminalGrowthRate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* SBC Section */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Share-Based Compensation</h3>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SBC Treatment
                      </label>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleInputChange('sbcApproach', 'percentage')}
                          className={`flex-1 py-1 px-3 text-xs rounded-md font-medium transition-all ${
                            inputs.sbcApproach === 'percentage'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          % of FCF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('sbcApproach', 'dilution')}
                          className={`flex-1 py-1 px-3 text-xs rounded-md font-medium transition-all ${
                            inputs.sbcApproach === 'dilution'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          Dilution
                        </button>
                      </div>
                    </div>

                    {inputs.sbcApproach === 'percentage' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SBC as % of FCF
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.sbcPercentage}
                          onChange={(e) => handleInputChange('sbcPercentage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Reduces FCF each year (typically 2-8% for tech companies)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Annual Share Dilution (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.annualDilution}
                          onChange={(e) => handleInputChange('annualDilution', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Applied to final equity value (typically 1-4% annually)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Results
              </h2>
              
              {results && (
                <div className="space-y-6">
                  {mode === 'dcf' ? (
                    <>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-2">
                            ${results.equityValue}M
                          </div>
                          <div className="text-gray-600">Fair Equity Value</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-lg font-semibold text-blue-600">
                            ${results.enterpriseValue}M
                          </div>
                          <div className="text-sm text-gray-600">Enterprise Value</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-lg font-semibold text-emerald-600">
                            +${results.netCash}M
                          </div>
                          <div className="text-sm text-gray-600">Net Cash</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-lg font-semibold text-purple-600">
                            ${results.pvExplicit}M
                          </div>
                          <div className="text-sm text-gray-600">PV of Years 1-5</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-lg font-semibold text-indigo-600">
                            ${results.pvTerminal}M
                          </div>
                          <div className="text-sm text-gray-600">PV of Terminal Value</div>
                        </div>
                      </div>

                      {(inputs.sbcPercentage > 0 || inputs.annualDilution > 0) && (
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-700">SBC Impact</div>
                              <div className="text-xs text-gray-500">
                                {inputs.sbcApproach === 'percentage' ? 'FCF reduction' : '5-year dilution effect'}
                              </div>
                            </div>
                            <div className="text-lg font-semibold text-orange-600">
                              -${results.sbcImpact}M
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-800 mb-3">Cash Flow Breakdown</h3>
                        <div className="space-y-2">
                          {results.breakdown && results.breakdown.map((item) => (
                            <div key={item.year} className="flex justify-between text-sm">
                              <span>Year {item.year}:</span>
                              <span>
                                {item.originalFcf !== item.fcf ? (
                                  <>
                                    <span className="text-gray-400 line-through">${item.originalFcf}M</span>
                                    {' → '}
                                  </>
                                ) : null}
                                FCF ${item.fcf}M → PV ${item.pv}M
                              </span>
                            </div>
                          ))}
                          <div className="border-t pt-2 mt-2 font-medium">
                            <div className="flex justify-between">
                              <span>Terminal Value:</span>
                              <span>${results.terminalValue}M</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-2">
                            {results.impliedReturn}%
                          </div>
                          <div className="text-gray-600">Implied Annual Return</div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="text-sm text-gray-600">
                          <p className="mb-2">
                            At the current market cap of <strong>${inputs.marketCap}M</strong>, 
                            the investment would need to generate an annual return of{' '}
                            <strong>{results.impliedReturn}%</strong> to justify the valuation.
                          </p>
                          {results.targetEquityValue !== results.impliedEV && (
                            <p className="mb-2 text-xs">
                              Target Equity Value: <strong>${results.targetEquityValue}M</strong>
                              <span className="text-gray-400"> (adjusted for SBC)</span>
                            </p>
                          )}
                          <p className="mb-2 text-xs">
                            Implied Enterprise Value: <strong>${results.impliedEV}M</strong>
                            <span className="text-gray-400"> (Equity Value - Net Cash)</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Calculation converged in {results.iterations} iterations
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-3">How it works:</h3>
            <div className="text-sm text-blue-700 space-y-2">
              {mode === 'dcf' ? (
                <div>
                  <p><strong>Standard DCF:</strong> Calculates fair equity value using Enterprise Value approach.</p>
                  <p>Enterprise Value = PV(FCF Years 1-5) + PV(Terminal Value)</p>
                  <p>Equity Value = Enterprise Value + Net Cash</p>
                  <p><strong>SBC Options:</strong> Treat as FCF reduction (% approach) or apply dilution to final value.</p>
                </div>
              ) : (
                <div>
                  <p><strong>Inverse DCF:</strong> Calculates the required return to justify current market cap.</p>
                  <p>Accounts for SBC impact, then finds the discount rate that justifies the valuation.</p>
                  <p>Shows what annual return the business needs to generate after SBC costs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DCFCalculator;