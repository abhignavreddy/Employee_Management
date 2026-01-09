// src/lib/payrollCalculations.js

/**
 * Calculate ESI contribution (employee)
 * Only applicable if gross salary ≤ ₹21,000/month
 */
export const calculateESI = (grossSalary) => {
  if (grossSalary <= 21000) {
    return Math.round(grossSalary * 0.0075); // 0.75% employee contribution
  }
  return 0;
};

/**
 * Calculate Professional Tax (Karnataka/Maharashtra rates)
 */
export const calculateProfessionalTax = (grossSalary) => {
  if (grossSalary <= 7500) return 0;
  if (grossSalary <= 10000) return 175;
  return 200; // Standard for most states
};

/**
 * Calculate TDS using New Tax Regime (FY 2024-25)
 * With ₹75,000 standard deduction and Section 87A rebate
 */
export const calculateTDS = (annualGross) => {
  // Apply standard deduction (₹75,000 for new regime)
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualGross - standardDeduction);
  
  let annualTax = 0;

  // New Tax Regime Slabs (FY 2024-25)
  if (taxableIncome <= 400000) {
    annualTax = 0;
  } else if (taxableIncome <= 800000) {
    annualTax = (taxableIncome - 400000) * 0.05;
  } else if (taxableIncome <= 1200000) {
    annualTax = 400000 * 0.05 + (taxableIncome - 800000) * 0.10;
  } else if (taxableIncome <= 1600000) {
    annualTax = 400000 * 0.05 + 400000 * 0.10 + (taxableIncome - 1200000) * 0.15;
  } else if (taxableIncome <= 2000000) {
    annualTax = 400000 * 0.05 + 400000 * 0.10 + 400000 * 0.15 + (taxableIncome - 1600000) * 0.20;
  } else if (taxableIncome <= 2400000) {
    annualTax = 400000 * 0.05 + 400000 * 0.10 + 400000 * 0.15 + 400000 * 0.20 + (taxableIncome - 2000000) * 0.25;
  } else {
    annualTax = 400000 * 0.05 + 400000 * 0.10 + 400000 * 0.15 + 400000 * 0.20 + 400000 * 0.25 + (taxableIncome - 2400000) * 0.30;
  }

  // Apply Section 87A rebate: If taxable income ≤ ₹7 lakhs, rebate up to ₹25,000
  if (taxableIncome <= 700000) {
    annualTax = Math.max(0, annualTax - 25000);
  }

  // Return monthly TDS
  return Math.round(annualTax / 12);
};

/**
 * Simplified Payroll Calculation
 * - Gross Salary = Basic Salary (no allowances)
 * - Net Salary = Gross - ESI - Professional Tax - TDS
 * - No PF deduction
 * - LOP handled separately in UI
 */
export const calculatePayroll = (annualCTC) => {
  const ctc = Number(annualCTC) || 0;
  
  if (ctc === 0) {
    return {
      annualCTC: 0,
      monthlyCTC: 0,
      basicSalary: 0,
      hra: 0,
      specialAllowance: 0,
      otherAllowances: 0,
      grossSalary: 0,
      pf: 0,
      employerPF: 0,
      esi: 0,
      professionalTax: 0,
      tds: 0,
      totalDeductions: 0,
      netSalary: 0,
    };
  }

  // Simplified: Monthly CTC = Annual CTC / 12
  const monthlyCTC = Math.round(ctc / 12);
  
  // For now: Gross = Basic (no allowances)
  const basicSalary = monthlyCTC;
  const grossSalary = basicSalary;
  
  // Placeholder for future allowances (all zero for now)
  const hra = 0;
  const specialAllowance = 0;
  const otherAllowances = 0;
  
  // No PF deduction as per requirement
  const pf = 0;
  const employerPF = 0;
  
  // Calculate ESI (only if gross ≤ ₹21,000)
  const esi = calculateESI(grossSalary);
  
  // Calculate Professional Tax
  const professionalTax = calculateProfessionalTax(grossSalary);
  
  // Calculate TDS using new tax regime
  const annualGross = grossSalary * 12;
  const tds = calculateTDS(annualGross);
  
  // Total deductions
  const totalDeductions = esi + professionalTax + tds;
  
  // Net salary (before LOP)
  const netSalary = grossSalary - totalDeductions;

  return {
    annualCTC: ctc,
    monthlyCTC,
    basicSalary,
    hra,
    specialAllowance,
    otherAllowances,
    grossSalary,
    pf,
    employerPF,
    esi,
    professionalTax,
    tds,
    totalDeductions,
    netSalary,
  };
};

/**
 * Calculate LOP (Loss of Pay) deduction based on actual working days
 * This deducts from gross salary proportionally
 */
export const calculateLOP = (grossSalary, workingDays, lopDays) => {
  if (!workingDays || workingDays === 0 || !lopDays || lopDays === 0) {
    return 0;
  }
  const perDayRate = grossSalary / workingDays;
  return Math.round(perDayRate * lopDays);
};

/**
 * Calculate final take-home after LOP deduction
 */
export const calculateTakeHome = (netSalary, lopAmount) => {
  return Math.max(0, netSalary - lopAmount);
};
