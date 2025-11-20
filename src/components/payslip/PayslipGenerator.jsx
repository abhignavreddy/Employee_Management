import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '../ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '../../hooks/use-toast';

const PayslipGenerator = ({ employee, month, onDownloadComplete }) => {
  const [generating, setGenerating] = useState(false);

  const generatePayslipPDF = async () => {
    setGenerating(true);
    
    try {
      // Create a temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      document.body.appendChild(container);

      // Generate HTML
      container.innerHTML = getPayslipHTML(employee, month);

      // Wait for fonts to load
      await document.fonts.ready;

      // Convert to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Download
      const fileName = `Payslip_${employee.empId}_${month.replace(' ', '_')}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'Success',
        description: 'Payslip downloaded successfully',
      });

      if (onDownloadComplete) onDownloadComplete();
    } catch (error) {
      console.error('Error generating payslip:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate payslip',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePayslipPDF}
      disabled={generating}
      size="sm"
      variant="outline"
    >
      {generating ? (
        <>
          <Download className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 mr-2" />
          Download Payslip
        </>
      )}
    </Button>
  );
};

const getPayslipHTML = (employee, month) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `
    <div style="font-family: Arial, sans-serif; padding: 40px; background: white;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
        <div style="font-size: 28px; font-weight: bold; color: #1e40af; margin-bottom: 5px;">
          YOUR COMPANY NAME
        </div>
        <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
          123 Business Street, Tech Park, Bangalore - 560001<br>
          Email: hr@company.com | Phone: +91 80-12345678<br>
          CIN: U12345KA2020PTC123456
        </div>
        <div style="font-size: 20px; color: #64748b; margin-top: 15px; font-weight: 600;">
          SALARY SLIP FOR ${month.toUpperCase()}
        </div>
      </div>

      <!-- Employee Details -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 25px; background: #f8fafc; padding: 20px; border-radius: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Employee Name</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${employee.firstName} ${employee.lastName}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Employee ID</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${employee.empId}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Designation</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${employee.empRole}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Pay Period</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${month}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Payment Date</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${currentDate}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Bank Account</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">XXXX${String(employee.bankDetails?.bankAccount || '0000').slice(-4)}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">PAN Number</div>
          <div style="font-size: 14px; font-weight: 600; color: #1e293b;">XXXXX${Math.floor(1000 + Math.random() * 9000)}</div>
        </div>
      </div>

      <!-- Earnings Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr>
            <th colspan="2" style="background: #2563eb; color: white; padding: 12px; text-align: center; font-size: 14px; border: 1px solid #2563eb;">
              EARNINGS
            </th>
          </tr>
          <tr>
            <th style="background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
              Component
            </th>
            <th style="background: #f1f5f9; padding: 10px; text-align: right; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">Basic Salary</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.basicSalary.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">House Rent Allowance (HRA)</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.hra.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">Special Allowance</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.specialAllowance.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">Other Allowances</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.otherAllowances.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 14px;">
              <strong>Gross Earnings</strong>
            </td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-size: 14px;">
              <strong>${employee.grossSalary.toLocaleString('en-IN')}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Deductions Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr>
            <th colspan="2" style="background: #dc2626; color: white; padding: 12px; text-align: center; font-size: 14px; border: 1px solid #dc2626;">
              DEDUCTIONS
            </th>
          </tr>
          <tr>
            <th style="background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
              Component
            </th>
            <th style="background: #f1f5f9; padding: 10px; text-align: right; font-size: 12px; color: #475569; border: 1px solid #e2e8f0;">
              Amount (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">Provident Fund (PF) - Employee Contribution</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.pf.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">Employee State Insurance (ESI)</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.esi.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">Professional Tax</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.professionalTax.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;">Tax Deducted at Source (TDS)</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500; font-size: 13px;">
              ${employee.tds.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 14px;">
              <strong>Total Deductions</strong>
            </td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-size: 14px;">
              <strong>${employee.totalDeductions.toLocaleString('en-IN')}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Net Salary -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tbody>
          <tr style="background: #dbeafe;">
            <td style="padding: 15px; border: 2px solid #2563eb; font-size: 16px; font-weight: 700; color: #1e40af;">
              <strong>NET SALARY (Take Home Pay)</strong>
            </td>
            <td style="padding: 15px; border: 2px solid #2563eb; text-align: right; font-size: 18px; font-weight: 700; color: #1e40af;">
              <strong>₹ ${employee.netSalary.toLocaleString('en-IN')}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words -->
      <div style="margin-bottom: 25px; padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e; font-size: 13px;">
        <strong>Amount in Words:</strong> ${numberToWords(employee.netSalary)} Rupees Only
      </div>

      <!-- Note -->
      <div style="margin-bottom: 25px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 12px; line-height: 1.6;">
        <strong>Note:</strong> This is a computer-generated payslip and does not require a physical signature. 
        For any queries, please contact the HR department at hr@company.com
      </div>

      <!-- Signatures -->
      <div style="display: flex; justify-content: space-between; margin-top: 60px;">
        <div style="text-align: center;">
          <div style="width: 200px; border-top: 1px solid #000; padding-top: 8px; font-size: 12px; font-weight: 600;">
            Employee Signature
          </div>
        </div>
        <div style="text-align: center;">
          <div style="width: 200px; border-top: 1px solid #000; padding-top: 8px; font-size: 12px; font-weight: 600;">
            Authorized Signatory
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 10px; color: #64748b;">
        Generated on ${currentDate} | This is a system-generated document
      </div>
    </div>
  `;
};

// Helper function to convert number to words
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const remainder = num % 100;
  
  let result = '';
  
  if (crores > 0) result += ones[crores] + ' Crore ';
  if (lakhs > 0) result += (lakhs < 10 ? ones[lakhs] : tens[Math.floor(lakhs / 10)] + ' ' + ones[lakhs % 10]) + ' Lakh ';
  if (thousands > 0) result += (thousands < 10 ? ones[thousands] : tens[Math.floor(thousands / 10)] + ' ' + ones[thousands % 10]) + ' Thousand ';
  if (hundreds > 0) result += ones[hundreds] + ' Hundred ';
  
  if (remainder > 0) {
    if (remainder < 10) {
      result += ones[remainder];
    } else if (remainder < 20) {
      result += teens[remainder - 10];
    } else {
      result += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10];
    }
  }
  
  return result.trim();
};

export default PayslipGenerator;
