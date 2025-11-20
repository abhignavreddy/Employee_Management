export const calculatePF = (basicSalary) => {
  const pfBase = Math.min(basicSalary, 15000);
  return Math.round(pfBase * 0.12);
};

export const calculateESI = (grossSalary) => {
  if (grossSalary <= 21000) {
    return Math.round(grossSalary * 0.0075);
  }
  return 0;
};

export const calculateProfessionalTax = (grossSalary) => {
  if (grossSalary <= 7500) return 0;
  if (grossSalary <= 10000) return 175;
  if (grossSalary <= 25000) return 200;
  return 200;
};

export const calculateTDS = (annualIncome) => {
  let tax = 0;
  
  if (annualIncome <= 300000) {
    tax = 0;
  } else if (annualIncome <= 700000) {
    tax = (annualIncome - 300000) * 0.05;
  } else if (annualIncome <= 1000000) {
    tax = 400000 * 0.05 + (annualIncome - 700000) * 0.10;
  } else if (annualIncome <= 1200000) {
    tax = 400000 * 0.05 + 300000 * 0.10 + (annualIncome - 1000000) * 0.15;
  } else if (annualIncome <= 1500000) {
    tax = 400000 * 0.05 + 300000 * 0.10 + 200000 * 0.15 + (annualIncome - 1200000) * 0.20;
  } else {
    tax = 400000 * 0.05 + 300000 * 0.10 + 200000 * 0.15 + 300000 * 0.20 + (annualIncome - 1500000) * 0.30;
  }
  
  return Math.round(tax / 12);
};

export const calculatePayroll = (annualSalary) => {
  const monthlySalary = Math.round(annualSalary / 12);
  
  const basicSalary = Math.round(monthlySalary * 0.50);
  const hra = Math.round(monthlySalary * 0.20);
  const specialAllowance = Math.round(monthlySalary * 0.20);
  const otherAllowances = Math.round(monthlySalary * 0.10);
  
  const grossSalary = basicSalary + hra + specialAllowance + otherAllowances;
  
  const pf = calculatePF(basicSalary);
  const esi = calculateESI(grossSalary);
  const professionalTax = calculateProfessionalTax(grossSalary);
  const tds = calculateTDS(annualSalary);
  
  const totalDeductions = pf + esi + professionalTax + tds;
  const netSalary = grossSalary - totalDeductions;
  
  return {
    basicSalary,
    hra,
    specialAllowance,
    otherAllowances,
    grossSalary,
    pf,
    esi,
    professionalTax,
    tds,
    totalDeductions,
    netSalary,
  };
};
