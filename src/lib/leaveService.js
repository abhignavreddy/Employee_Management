import apiClient from './apiClient';

export const applyLeave = async (data) => {
  const response = await apiClient.post('/leave-approvel/apply', data);
  return response.data;
};

export const getLeavesByEmployee = async (empId) => {
  const response = await apiClient.get(`/leave-approvel/employee/${empId}`);
  return response.data;
};

export const getLeavesByRole = async (role) => {
  const response = await apiClient.get(`/leave-approvel/view?role=${userRole}`, {
    params: { role }
  });
  return response.data;
};

