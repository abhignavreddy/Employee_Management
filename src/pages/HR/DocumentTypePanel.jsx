import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Snackbar,
  Chip,
  CircularProgress,
  InputAdornment,
  Typography,
  Card,
  CardContent,
  Divider,
  Paper,
  Autocomplete
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Visibility,
  Search,
  Add,
  Description,
  InsertDriveFile
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import apiClient from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const DocumentTypePanel = ({ documentType }) => {
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [entityOptions, setEntityOptions] = useState([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  
  const [formData, setFormData] = useState({
    entityId: '',
    entityName: '',
    note: '',
    updatedBy: '',
    file: null,
    projectName: '',
    contactName: '',
    organizationId: '',
    companyName: '',
    documentName: '',
    dateOfIssue: null,
    expiryDate: null,
    responsibleParty: ''
  });

  const getDocumentEndpoint = () => {
    switch(documentType) {
      case 'EMPLOYEE':
        return '/employee-documents';
      case 'COMPANY':
        return '/company-documents';
      case 'CLIENT':
        return '/client-documents';
      default:
        return '/employee-documents';
    }
  };

  const getEntityEndpoint = () => {
    switch(documentType) {
      case 'EMPLOYEE':
        return '/employees';
      case 'COMPANY':
        return '/companies';
      case 'CLIENT':
        return '/client-onboard';
      default:
        return '/employees';
    }
  };

  const documentEndpoint = getDocumentEndpoint();
  const entityEndpoint = getEntityEndpoint();

  useEffect(() => {
    if (user && user.empId) {
      setFormData(prev => ({
        ...prev,
        updatedBy: user.empId
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [documentType]);

  useEffect(() => {
    try {
      if (searchQuery.trim() === '') {
        setFilteredDocuments(documents);
      } else {
        const filtered = documents.filter(doc => {
          const searchLower = searchQuery.toLowerCase();
          
          if (documentType === 'CLIENT') {
            return doc.businessName?.toLowerCase().includes(searchLower) ||
                   doc.projectName?.toLowerCase().includes(searchLower) ||
                   doc.contactName?.toLowerCase().includes(searchLower) ||
                   doc.fileName?.toLowerCase().includes(searchLower);
          } else if (documentType === 'COMPANY') {
            return doc.companyName?.toLowerCase().includes(searchLower) ||
                   doc.organizationId?.toLowerCase().includes(searchLower) ||
                   doc.documentName?.toLowerCase().includes(searchLower) ||
                   doc.responsibleParty?.toLowerCase().includes(searchLower) ||
                   doc.fileName?.toLowerCase().includes(searchLower);
          } else {
            return doc.empId?.toLowerCase().includes(searchLower) ||
                   doc.empName?.toLowerCase().includes(searchLower) ||
                   doc.fileName?.toLowerCase().includes(searchLower);
          }
        });
        setFilteredDocuments(filtered);
      }
    } catch (error) {
      console.error('Error filtering documents:', error);
      setFilteredDocuments(documents);
    }
  }, [searchQuery, documents]);

  const fetchEntityList = async (inputValue = '') => {
    try {
      setEntityLoading(true);
      const params = inputValue ? { search: inputValue } : {};
      const response = await apiClient.get(entityEndpoint, { params });
      
      let mappedOptions;
      if (documentType === 'CLIENT') {
        const projectMap = new Map();
        response.data.forEach(entity => {
          const projectName = entity.clientInfo?.projectName;
          const businessName = entity.clientInfo?.businessName;
          const contactName = entity.contactInfo?.contactName;
          
          if (projectName && !projectMap.has(projectName)) {
            projectMap.set(projectName, {
              id: projectName,
              projectName: projectName,
              businessName: businessName,
              contactName: contactName
            });
          }
        });
        
        mappedOptions = Array.from(projectMap.values());
        setProjectOptions(mappedOptions);
      } else if (documentType === 'COMPANY') {
        mappedOptions = response.data.map(entity => ({
          id: entity.organizationId || entity.id,
          name: entity.companyName || entity.name,
          organizationId: entity.organizationId
        }));
        setEntityOptions(mappedOptions);
      } else {
        mappedOptions = response.data.map(entity => ({
          id: entity.empId || entity.id,
          name: entity.empName || entity.name || `${entity.firstName || ''} ${entity.lastName || ''}`.trim()
        }));
        setEntityOptions(mappedOptions);
      }
      
      setEntityLoading(false);
    } catch (error) {
      console.error('Error fetching entity list:', error);
      if (documentType === 'CLIENT') {
        setProjectOptions([]);
      } else {
        setEntityOptions([]);
      }
      setEntityLoading(false);
    }
  };

  useEffect(() => {
    if (uploadDialogOpen) {
      fetchEntityList();
    }
  }, [uploadDialogOpen]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(documentEndpoint);
      setDocuments(response.data || []);
      setFilteredDocuments(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showSnackbar('Failed to fetch documents. Check if backend is running.', 'error');
      setDocuments([]);
      setFilteredDocuments([]);
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    try {
      const file = event.target.files?.[0];
      if (file) {
        setFormData({ ...formData, file: file });
      }
    } catch (error) {
      console.error('Error handling file change:', error);
      showSnackbar('Error selecting file', 'error');
    }
  };

  const handleInputChange = (event) => {
    try {
      const { name, value } = event.target;
      setFormData({ ...formData, [name]: value });
    } catch (error) {
      console.error('Error handling input change:', error);
    }
  };

  const handleEntitySelect = (event, value) => {
    if (value) {
      if (documentType === 'CLIENT') {
        setSelectedProject(value);
        setFormData({
          ...formData,
          projectName: value.projectName,
          entityName: value.businessName,
          contactName: value.contactName
        });
      } else if (documentType === 'COMPANY') {
        setSelectedEntity(value);
        setFormData({
          ...formData,
          entityId: value.id,
          entityName: value.name,
          organizationId: value.organizationId || value.id,
          companyName: value.name
        });
      } else {
        setSelectedEntity(value);
        setFormData({
          ...formData,
          entityId: value.id,
          entityName: value.name
        });
      }
    } else {
      if (documentType === 'CLIENT') {
        setSelectedProject(null);
      } else {
        setSelectedEntity(null);
      }
      resetFormFields();
    }
  };

  const resetFormFields = () => {
    const currentUpdatedBy = user?.empId || '';
    
    setFormData({
      entityId: '',
      entityName: '',
      note: '',
      updatedBy: currentUpdatedBy,
      file: null,
      projectName: '',
      contactName: '',
      organizationId: '',
      companyName: '',
      documentName: '',
      dateOfIssue: null,
      expiryDate: null,
      responsibleParty: ''
    });
  };

  const handleUpload = async () => {
    if (documentType === 'CLIENT') {
      if (!formData.file || !formData.entityName || !formData.projectName || !formData.contactName || !formData.updatedBy) {
        showSnackbar('Please fill all required fields', 'warning');
        return;
      }
    } else if (documentType === 'COMPANY') {
      if (!formData.file || !formData.documentName || !formData.updatedBy) {
        showSnackbar('Please fill all required fields', 'warning');
        return;
      }
    } else {
      if (!formData.file || !formData.entityId || !formData.entityName || !formData.updatedBy) {
        showSnackbar('Please fill all required fields', 'warning');
        return;
      }
    }

    const uploadData = new FormData();
    uploadData.append('file', formData.file);
    
    if (documentType === 'CLIENT') {
      uploadData.append('businessName', formData.entityName);
      uploadData.append('projectName', formData.projectName);
      uploadData.append('contactName', formData.contactName);
    } else if (documentType === 'COMPANY') {
      uploadData.append('companyName', formData.companyName || 'N/A');
      uploadData.append('organizationId', formData.organizationId || 'N/A');
      uploadData.append('documentName', formData.documentName);
      
      if (formData.dateOfIssue) {
        uploadData.append('dateOfIssue', formData.dateOfIssue.toISOString());
      }
      if (formData.expiryDate) {
        uploadData.append('expiryDate', formData.expiryDate.toISOString());
      }
      if (formData.responsibleParty) {
        uploadData.append('responsibleParty', formData.responsibleParty);
      }
    } else {
      uploadData.append('empId', formData.entityId);
      uploadData.append('empName', formData.entityName);
    }
    
    uploadData.append('note', formData.note || '');
    uploadData.append('updatedBy', formData.updatedBy);

    try {
      setLoading(true);
      await apiClient.post(`${documentEndpoint}/upload`, uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      showSnackbar(`${getDocumentTypeLabel().label} document uploaded successfully`, 'success');
      setUploadDialogOpen(false);
      resetForm();
      fetchDocuments();
      setLoading(false);
    } catch (error) {
      console.error('Upload error:', error);
      showSnackbar('Upload failed: ' + (error.response?.data?.message || error.message), 'error');
      setLoading(false);
    }
  };

  const handleView = async (documentId, fileName) => {
    try {
      const response = await apiClient.get(`${documentEndpoint}/download-url/${documentId}`);
      const fileUrl = response.data;
      
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      
      showSnackbar('Opening document in new tab', 'success');
    } catch (error) {
      console.error('View error:', error);
      showSnackbar('Failed to open document', 'error');
    }
  };

  const handleDelete = async (documentId, updatedBy) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setLoading(true);
      
      if (documentType === 'CLIENT') {
        showSnackbar('Delete not available for client documents', 'warning');
        setLoading(false);
        return;
      }
      
      await apiClient.delete(`${documentEndpoint}/${documentId}`, {
        params: documentType === 'EMPLOYEE' ? { updatedBy: updatedBy || 'system' } : {}
      });
      showSnackbar('Document deleted successfully', 'success');
      fetchDocuments();
      setLoading(false);
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar('Delete failed', 'error');
      setLoading(false);
    }
  };

  const resetForm = () => {
    resetFormFields();
    setSelectedEntity(null);
    setSelectedProject(null);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    try {
      return new Date(dateTime).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const formatDate = (dateTime) => {
    if (!dateTime) return 'N/A';
    try {
      return new Date(dateTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getDocumentTypeLabel = () => {
    switch(documentType) {
      case 'EMPLOYEE': 
        return { 
          label: 'Employee', 
          idLabel: 'Employee ID', 
          nameLabel: 'Employee Name'
        };
      case 'CLIENT': 
        return { 
          label: 'Client', 
          idLabel: 'Project Name', 
          nameLabel: 'Business Name'
        };
      default: 
        return { 
          label: 'Document', 
          idLabel: 'ID', 
          nameLabel: 'Name'
        };
    }
  };

  const labels = getDocumentTypeLabel();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                fontSize: '1.15rem',
                color: '#1a202c'
              }}
            >
              {labels.label} Document Repository
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#4a5568',
                fontSize: '0.8125rem'
              }}
            >
              Manage and organize all {labels.label.toLowerCase()} related documentation
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="medium"
            startIcon={<Add sx={{ fontSize: 18 }} />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ 
              minWidth: 160, 
              height: 40,
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: 2
            }}
          >
            Add Document
          </Button>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Stats Card */}
        <Box mb={2.5}>
          <Card 
            variant="outlined"
            sx={{ 
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              maxWidth: 300
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    backgroundColor: '#edf2f7',
                    borderRadius: 2,
                    p: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <InsertDriveFile sx={{ fontSize: 28, color: '#2c5282' }} />
                </Box>
                <Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '1.75rem',
                      color: '#1a202c'
                    }}
                  >
                    {filteredDocuments?.length || 0}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#4a5568',
                      fontSize: '0.8125rem',
                      fontWeight: 500
                    }}
                  >
                    Total Documents
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Search Section */}
        <Box mb={2.5}>
          <TextField
            fullWidth
            placeholder={
              documentType === 'CLIENT' 
                ? `Search by business name, project, contact, or filename...`
                : documentType === 'COMPANY'
                ? `Search by company, organization ID, document name, or filename...`
                : `Search by ${labels.idLabel}, ${labels.nameLabel}, or filename...`
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem',
                backgroundColor: '#ffffff'
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 20, color: '#718096' }} />
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Documents Table */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <TableContainer 
            component={Paper} 
            variant="outlined"
            sx={{ 
              border: '1px solid #e2e8f0',
              borderRadius: 2
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f7fafc' }}>
                  {documentType === 'CLIENT' ? (
                    <>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Business Name</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Project Name</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Contact Name</TableCell>
                    </>
                  ) : documentType === 'COMPANY' ? (
                    <>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Document Name</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Issue Date</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Expiry Date</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Responsible Party</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>{labels.idLabel}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>{labels.nameLabel}</TableCell>
                    </>
                  )}
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>File Name</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>File Size</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Note</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Uploaded At</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Updated By</TableCell>
                  <TableCell align="center" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1a202c', py: 1.5 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!filteredDocuments || filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={documentType === 'COMPANY' ? 13 : 8} align="center">
                      <Box py={5}>
                        <Description sx={{ fontSize: 48, color: '#cbd5e0', mb: 1.5 }} />
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: '#718096',
                            fontSize: '1rem',
                            fontWeight: 600,
                            mb: 0.5
                          }}
                        >
                          No {labels.label.toLowerCase()} documents found
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: '#a0aec0',
                            fontSize: '0.8125rem'
                          }}
                        >
                          Click "Add Document" to upload your first document
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow 
                      key={doc.id} 
                      hover
                      sx={{ 
                        '&:hover': { backgroundColor: '#f7fafc' },
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      {documentType === 'CLIENT' ? (
                        <>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.businessName || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.projectName || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.contactName || 'N/A'}</TableCell>
                        </>
                      ) : documentType === 'COMPANY' ? (
                        <>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.companyName || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.organizationId || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.documentName || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{formatDate(doc.dateOfIssue)}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{formatDate(doc.expiryDate)}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.responsibleParty || 'N/A'}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.empId || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.empName || 'N/A'}</TableCell>
                        </>
                      )}
                      <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.fileName || 'N/A'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{doc.note || 'N/A'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', py: 1.5 }}>{formatDateTime(doc.createdAt)}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip 
                          label={doc.updatedBy || 'N/A'} 
                          size="small"
                          sx={{ 
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            height: 24
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <IconButton
                          color="primary"
                          onClick={() => handleView(doc.id, doc.fileName)}
                          title="View Document"
                          size="small"
                          sx={{ mr: 0.5 }}
                        >
                          <Visibility sx={{ fontSize: 18 }} />
                        </IconButton>
                        {documentType !== 'CLIENT' && (
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(doc.id, doc.updatedBy)}
                            title="Delete"
                            size="small"
                          >
                            <Delete sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Upload Dialog */}
        <Dialog 
          open={uploadDialogOpen} 
          onClose={() => setUploadDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                fontSize: '1.15rem',
                color: '#1a202c'
              }}
            >
              Upload {labels.label} Document
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#718096',
                mt: 0.5,
                fontSize: '0.8125rem'
              }}
            >
              Fill in the details below to upload a new document
            </Typography>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              
              {/* CLIENT-SPECIFIC: Project Name Autocomplete */}
              {documentType === 'CLIENT' ? (
                <>
                  <Autocomplete
                    size="small"
                    value={selectedProject}
                    onChange={handleEntitySelect}
                    onInputChange={(event, value) => {
                      if (value.length > 1) {
                        fetchEntityList(value);
                      }
                    }}
                    options={projectOptions}
                    getOptionLabel={(option) => option.projectName || ''}
                    loading={entityLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Project Name"
                        placeholder="Search and select project..."
                        InputProps={{
                          ...params.InputProps,
                          sx: { fontSize: '0.875rem' },
                          endAdornment: (
                            <>
                              {entityLoading ? <CircularProgress size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        InputLabelProps={{
                          sx: { fontSize: '0.875rem' }
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ fontSize: '0.875rem' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {option.projectName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#718096', fontSize: '0.75rem' }}>
                            Business: {option.businessName || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    noOptionsText="Type to search projects..."
                  />

                  <TextField
                    required
                    fullWidth
                    size="small"
                    label="Business Name"
                    value={formData.entityName}
                    InputProps={{
                      readOnly: true,
                      sx: { 
                        fontSize: '0.875rem', 
                        backgroundColor: '#f7fafc'
                      },
                      startAdornment: (
                        <InputAdornment position="start">
                          <Chip 
                            label="Auto" 
                            size="small" 
                            color="success" 
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{ sx: { fontSize: '0.875rem' } }}
                    placeholder="Automatically filled from project"
                  />

                  <TextField
                    required
                    fullWidth
                    size="small"
                    label="Contact Name"
                    value={formData.contactName}
                    InputProps={{
                      readOnly: true,
                      sx: { 
                        fontSize: '0.875rem', 
                        backgroundColor: '#f7fafc'
                      },
                      startAdornment: (
                        <InputAdornment position="start">
                          <Chip 
                            label="Auto" 
                            size="small" 
                            color="success" 
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{ sx: { fontSize: '0.875rem' } }}
                    placeholder="Automatically filled from project"
                  />
                </>
              ) : documentType === 'EMPLOYEE' ? (
                <Autocomplete
                  size="small"
                  value={selectedEntity}
                  onChange={handleEntitySelect}
                  onInputChange={(event, value) => {
                    if (value.length > 1) {
                      fetchEntityList(value);
                    }
                  }}
                  options={entityOptions}
                  getOptionLabel={(option) => `${option.id} - ${option.name}`}
                  loading={entityLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label={labels.idLabel}
                      placeholder={`Search ${labels.idLabel.toLowerCase()}...`}
                      InputProps={{
                        ...params.InputProps,
                        sx: { fontSize: '0.875rem' },
                        endAdornment: (
                          <>
                            {entityLoading ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      InputLabelProps={{
                        sx: { fontSize: '0.875rem' }
                      }}
                    />
                  )}
                  noOptionsText="Type to search..."
                />
              ) : null}

              {/* COMPANY-SPECIFIC FIELDS */}
              {documentType === 'COMPANY' && (
                <>
                  <TextField
                    required
                    fullWidth
                    size="small"
                    label="Document Name"
                    name="documentName"
                    value={formData.documentName}
                    onChange={handleInputChange}
                    placeholder="e.g., Business License, Tax Certificate"
                    InputProps={{ sx: { fontSize: '0.875rem' } }}
                    InputLabelProps={{ sx: { fontSize: '0.875rem' } }}
                  />
                  <DatePicker
                    label="Date of Issue"
                    value={formData.dateOfIssue}
                    onChange={(newValue) => setFormData({ ...formData, dateOfIssue: newValue })}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        InputProps: { sx: { fontSize: '0.875rem' } },
                        InputLabelProps: { sx: { fontSize: '0.875rem' } }
                      }
                    }}
                  />
                  <DatePicker
                    label="Expiry Date"
                    value={formData.expiryDate}
                    onChange={(newValue) => setFormData({ ...formData, expiryDate: newValue })}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        InputProps: { sx: { fontSize: '0.875rem' } },
                        InputLabelProps: { sx: { fontSize: '0.875rem' } }
                      }
                    }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Responsible Party"
                    name="responsibleParty"
                    value={formData.responsibleParty}
                    onChange={handleInputChange}
                    placeholder="Person responsible for this document"
                    InputProps={{ sx: { fontSize: '0.875rem' } }}
                    InputLabelProps={{ sx: { fontSize: '0.875rem' } }}
                  />
                </>
              )}

              {/* EMPLOYEE-SPECIFIC FIELDS */}
              {documentType === 'EMPLOYEE' && (
                <TextField
                  required
                  fullWidth
                  size="small"
                  label={labels.nameLabel}
                  value={formData.entityName}
                  InputProps={{
                    readOnly: true,
                    sx: { fontSize: '0.875rem', backgroundColor: '#f7fafc' }
                  }}
                  InputLabelProps={{ sx: { fontSize: '0.875rem' } }}
                />
              )}

              {/* COMMON FIELDS */}
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                placeholder="Add any notes (optional)"
                InputProps={{ sx: { fontSize: '0.875rem' } }}
                InputLabelProps={{ sx: { fontSize: '0.875rem' } }}
              />

              <TextField
                required
                fullWidth
                size="small"
                label="Updated By"
                value={ user?.name || 'Not logged in'}
                InputProps={{
                  readOnly: true,
                  sx: { fontSize: '0.875rem', backgroundColor: '#f7fafc' },
                  startAdornment: (
                    <InputAdornment position="start">
                      <Chip 
                        label={user?.empId } 
                        size="small" 
                        color={user?.empId ? 'success' : 'warning'}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </InputAdornment>
                  ),
                }}
                InputLabelProps={{ sx: { fontSize: '0.875rem' } }}
                placeholder={user?.empId || 'Loading...'}
              />
              
              <Box>
                <input
                  accept="*/*"
                  style={{ display: 'none' }}
                  id={`file-upload-${documentType}`}
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor={`file-upload-${documentType}`}>
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload sx={{ fontSize: 18 }} />}
                    fullWidth
                    sx={{ height: 44, fontSize: '0.875rem' }}
                  >
                    {formData.file ? formData.file.name : 'Choose File *'}
                  </Button>
                </label>
              </Box>

              {formData.file && (
                <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
                  Selected: {formData.file.name} ({formatFileSize(formData.file.size)})
                </Alert>
              )}
            </Box>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => {
                setUploadDialogOpen(false);
                resetForm();
              }}
              disabled={loading}
              sx={{ fontSize: '0.875rem' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <CloudUpload sx={{ fontSize: 18 }} />}
              disabled={loading}
              sx={{ fontSize: '0.875rem', fontWeight: 600 }}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            sx={{ fontSize: '0.875rem' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default DocumentTypePanel;
