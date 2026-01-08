import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

// Create axios instances for each document type
export const employeeDocApi = axios.create({
  baseURL: `${BASE_URL}/employee-documents`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const companyDocApi = axios.create({
  baseURL: `${BASE_URL}/company-documents`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const clientDocApi = axios.create({
  baseURL: `${BASE_URL}/client-documents`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Generic service methods
const createDocumentService = (apiInstance) => ({
  uploadDocument: async (file, requestDto) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('empId', requestDto.empId);
    formData.append('empName', requestDto.empName);
    formData.append('note', requestDto.note);
    formData.append('updatedBy', requestDto.updatedBy);

    return apiInstance.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  getAllDocuments: async () => {
    return apiInstance.get('');
  },

  getDocumentsByEmpId: async (empId) => {
    return apiInstance.get(`/by-emp/${empId}`);
  },

  getDownloadUrl: async (documentId) => {
    return apiInstance.get(`/download-url/${documentId}`);
  },

  deleteDocument: async (documentId, updatedBy) => {
    return apiInstance.delete(`/${documentId}`, {
      params: { updatedBy }
    });
  }
});

// Export specific services for each type
export const employeeDocumentService = createDocumentService(employeeDocApi);
export const companyDocumentService = createDocumentService(companyDocApi);
export const clientDocumentService = createDocumentService(clientDocApi);

export default {
  employee: employeeDocumentService,
  company: companyDocumentService,
  client: clientDocumentService
};
