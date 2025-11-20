import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Download, Filter, Send, Eye, Calculator } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { Toaster } from '../../components/ui/toaster';
import apiClient from '../../lib/apiClient';
import PayslipGenerator from '../../components/payslip/PayslipGenerator';

const api = apiClient;

const EmployeeApi = {
  list: () => api.get('/employees').then((r) => r.data),
};

// Indian Payroll Calculation Functions
const calculatePF = (basicSalary) => {
  // Employee PF: 12% of basic salary (capped at ₹15,000 basic)
  const pfBase = Math.min(basicSalary, 15000);
  return Math.round(pfBase * 0.12);
};

const calculateESI = (grossSalary) => {
  // ESI: 0.75% for employees earning up to ₹21,000/month
  if (grossSalary <= 21000) {
    return Math.round(grossSalary * 0.0075);
  }
  return 0;
};

const calculateProfessionalTax = (grossSalary) => {
  // Professional Tax (varies by state, using Maharashtra rates)
  if (grossSalary <= 7500) return 0;
  if (grossSalary <= 10000) return 175;
  if (grossSalary <= 25000) return 200;
  return 200; // Max ₹2,500/year (approx ₹200/month)
};

const calculateTDS = (annualIncome) => {
  // Simplified TDS calculation (Old regime, no exemptions)
  // New regime FY 2024-25: 0-3L: 0%, 3-7L: 5%, 7-10L: 10%, 10-12L: 15%, 12-15L: 20%, >15L: 30%
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
  
  return Math.round(tax / 12); // Monthly TDS
};

const calculatePayroll = (annualSalary) => {
  const monthlySalary = Math.round(annualSalary / 12);
  
  // Breakdown (approximate Indian standards)
  const basicSalary = Math.round(monthlySalary * 0.50); // 50% of CTC
  const hra = Math.round(monthlySalary * 0.20); // 20% of CTC
  const specialAllowance = Math.round(monthlySalary * 0.20); // 20% of CTC
  const otherAllowances = Math.round(monthlySalary * 0.10); // 10% of CTC
  
  const grossSalary = basicSalary + hra + specialAllowance + otherAllowances;
  
  // Deductions
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

const PayrollPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  });
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await EmployeeApi.list();
      const employeeList = data?.content || data || [];
      
      // Filter only active employees
      const activeEmployees = employeeList.filter(emp => emp.status === 'ACTIVE');
      setEmployees(activeEmployees);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load employees.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const payrollData = useMemo(() => {
    return employees.map(emp => {
      const payroll = calculatePayroll(emp.salary);
      return {
        ...emp,
        ...payroll,
        status: 'Pending', // Default status, can be updated from backend
      };
    });
  }, [employees]);

  const totalPayroll = payrollData.reduce((sum, p) => sum + p.netSalary, 0);
  const paidCount = payrollData.filter(p => p.status === 'Paid').length;
  const pendingCount = payrollData.filter(p => p.status === 'Pending').length;

  const getSalaryStatusColor = (status) => {
    return status === 'Paid'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const handleProcessPayroll = () => {
    toast({
      title: 'Payroll Processing',
      description: 'Salary payments are being processed for all employees.',
    });
  };

  const handleDownloadReport = () => {
    // Generate CSV
    const headers = [
      'Employee ID', 'Name', 'Role', 'Basic Salary', 'HRA', 'Special Allowance', 
      'Other Allowances', 'Gross Salary', 'PF', 'ESI', 'Professional Tax', 'TDS', 
      'Total Deductions', 'Net Salary'
    ];
    
    const rows = payrollData.map(emp => [
      emp.empId,
      `${emp.firstName} ${emp.lastName}`,
      emp.empRole,
      emp.basicSalary,
      emp.hra,
      emp.specialAllowance,
      emp.otherAllowances,
      emp.grossSalary,
      emp.pf,
      emp.esi,
      emp.professionalTax,
      emp.tds,
      emp.totalDeductions,
      emp.netSalary,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedMonth.replace(' ', '_')}.csv`;
    a.click();
    
    toast({
      title: 'Download Started',
      description: 'Payroll report has been downloaded.',
    });
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setDetailsOpen(true);
  };

  const months = [];
  const currentDate = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    months.push(`${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Process and manage employee salaries</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button className="text-white" onClick={handleProcessPayroll}>
            <Send className="w-4 h-4 mr-2" />
            Process Payroll
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold text-blue-600">₹{totalPayroll.toLocaleString('en-IN')}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Employees</p>
                <p className="text-2xl font-bold text-gray-900">{payrollData.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{paidCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">⏳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                {months.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">Showing payroll for {selectedMonth}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Details</CardTitle>
          <CardDescription>
            Detailed breakdown of employee salaries for {selectedMonth}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading payroll data...</p>
          ) : payrollData.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No active employees found</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollData.map((record) => {
                    const fullName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
                    const totalAllowances = record.hra + record.specialAllowance + record.otherAllowances;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{fullName}</TableCell>
                        <TableCell className="font-mono text-sm">{record.empId}</TableCell>
                        <TableCell>{record.empRole}</TableCell>
                        <TableCell>₹{record.basicSalary.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-green-600">
                          +₹{totalAllowances.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ₹{record.grossSalary.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-red-600">
                          -₹{record.totalDeductions.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="font-bold text-lg text-blue-600">
                          ₹{record.netSalary.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSalaryStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewDetails(record)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            <PayslipGenerator 
                              employee={record} 
                              month={selectedMonth}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Salary Breakdown - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
              </DialogTitle>
            </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Employee ID</p>
                  <p className="font-semibold">{selectedEmployee.empId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-semibold">{selectedEmployee.empRole}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Month</p>
                  <p className="font-semibold">{selectedMonth}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Annual CTC</p>
                  <p className="font-semibold">₹{selectedEmployee.salary.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h3 className="font-semibold text-green-700 mb-2">Earnings</h3>
                <div className="space-y-2 border rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Basic Salary (50%)</span>
                    <span className="font-semibold">₹{selectedEmployee.basicSalary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">HRA (20%)</span>
                    <span className="font-semibold">₹{selectedEmployee.hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Special Allowance (20%)</span>
                    <span className="font-semibold">₹{selectedEmployee.specialAllowance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Allowances (10%)</span>
                    <span className="font-semibold">₹{selectedEmployee.otherAllowances.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-green-700">
                    <span>Gross Salary</span>
                    <span>₹{selectedEmployee.grossSalary.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="font-semibold text-red-700 mb-2">Deductions</h3>
                <div className="space-y-2 border rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provident Fund (PF)</span>
                    <span className="font-semibold">₹{selectedEmployee.pf.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ESI</span>
                    <span className="font-semibold">₹{selectedEmployee.esi.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Professional Tax</span>
                    <span className="font-semibold">₹{selectedEmployee.professionalTax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TDS</span>
                    <span className="font-semibold">₹{selectedEmployee.tds.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-red-700">
                    <span>Total Deductions</span>
                    <span>₹{selectedEmployee.totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Net Salary (Take Home)</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{selectedEmployee.netSalary.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default PayrollPage;
