import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import PayslipGenerator from '../../components/payslip/PayslipGenerator';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../lib/apiClient';
import { calculatePayroll } from '../../lib/payrollCalculations';

const MySalaryPage = () => {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const response = await apiClient.get(`/employees/empid/${user.empId}`);
      const empData = response.data;
      setEmployeeData(empData);
      
      // Calculate payroll
      const payroll = calculatePayroll(empData.salary);
      setPayrollData({ ...empData, ...payroll });
    } catch (err) {
      console.error('Error loading employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Salary</h1>
        <p className="text-gray-600 mt-1">View your salary details and download payslips</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Gross</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{payrollData?.grossSalary.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Take Home</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{payrollData?.netSalary.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Annual CTC</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{employeeData?.salary.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Basic Salary</span>
              <span className="font-semibold">₹{payrollData?.basicSalary.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">HRA</span>
              <span className="font-semibold">₹{payrollData?.hra.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Special Allowance</span>
              <span className="font-semibold">₹{payrollData?.specialAllowance.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Other Allowances</span>
              <span className="font-semibold">₹{payrollData?.otherAllowances.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-3 border-t font-bold text-green-700">
              <span>Gross Salary</span>
              <span>₹{payrollData?.grossSalary.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Provident Fund</span>
              <span className="font-semibold">₹{payrollData?.pf.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ESI</span>
              <span className="font-semibold">₹{payrollData?.esi.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Professional Tax</span>
              <span className="font-semibold">₹{payrollData?.professionalTax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">TDS</span>
              <span className="font-semibold">₹{payrollData?.tds.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-3 border-t font-bold text-red-700">
              <span>Total Deductions</span>
              <span>₹{payrollData?.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Payslip */}
      <Card>
        <CardHeader>
          <CardTitle>Download Payslip</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold">{currentMonth} Payslip</p>
              <p className="text-sm text-gray-600">
                Net Salary: ₹{payrollData?.netSalary.toLocaleString('en-IN')}
              </p>
            </div>
            <PayslipGenerator employee={payrollData} month={currentMonth} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MySalaryPage;
