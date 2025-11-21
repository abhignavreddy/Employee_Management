import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
  ThemeProvider,
  createTheme
} from '@mui/material';
import {
  BusinessCenter,
  Business,
  People
} from '@mui/icons-material';
import DocumentTypePanel from './DocumentTypePanel';

// Compact professional theme
const professionalTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.02em'
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.01em'
    }
  },
  palette: {
    primary: {
      main: '#1a365d',
      light: '#2d4a7c',
      dark: '#0f2342'
    },
    secondary: {
      main: '#2c5282',
      light: '#4a6fa5',
      dark: '#1e3a5f'
    },
    background: {
      default: '#f7fafc',
      paper: '#ffffff'
    },
    text: {
      primary: '#1a202c',
      secondary: '#4a5568'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '6px 16px',
          fontSize: '0.875rem'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    }
  }
});

const DocumentManagementPage = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab mapping - maps tab names to indices
  const tabMap = {
    'employee-documents': 0,
    'company-documents': 1,
    'client-documents': 2
  };
  
  const tabNames = ['employee-documents', 'company-documents', 'client-documents'];
  
  // Get initial tab from URL params or location state
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    const tabFromState = location.state?.defaultTab;
    
    // Priority: URL params > navigation state > default (0)
    if (tabFromUrl && tabMap[tabFromUrl] !== undefined) {
      return tabMap[tabFromUrl];
    }
    if (tabFromState && tabMap[tabFromState] !== undefined) {
      return tabMap[tabFromState];
    }
    return 0; // Default to first tab
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Update URL with new tab
    setSearchParams({ tab: tabNames[newValue] });
  };
  
  // Listen for navigation state changes
  useEffect(() => {
    if (location.state?.defaultTab) {
      const tabIndex = tabMap[location.state.defaultTab];
      if (tabIndex !== undefined) {
        setActiveTab(tabIndex);
        setSearchParams({ tab: location.state.defaultTab });
      }
    }
  }, [location.state]);

  return (
    <ThemeProvider theme={professionalTheme}>
      <Box sx={{ backgroundColor: '#f7fafc', minHeight: '100vh', py: 3 }}>
        <Container maxWidth="xl">
          {/* Page Header */}
          <Box sx={{ mb: 2.5 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#1a202c',
                mb: 0.5,
                fontSize: '1.5rem'
              }}
            >
              Documents
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#4a5568',
                fontSize: '0.875rem'
              }}
            >
              Manage employee, company, and client documents
            </Typography>
          </Box>

          <Paper 
            elevation={2}
            sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Tabs Header */}
            <Box sx={{ 
              borderBottom: 2, 
              borderColor: '#e2e8f0',
              backgroundColor: '#ffffff'
            }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                variant="fullWidth"
                TabIndicatorProps={{
                  style: {
                    height: 3,
                    borderRadius: '3px 3px 0 0'
                  }
                }}
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 70,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    color: '#4a5568',
                    py: 2,
                    '&.Mui-selected': {
                      color: '#1a365d',
                      backgroundColor: '#f7fafc'
                    },
                    '&:hover': {
                      backgroundColor: '#f7fafc',
                      transition: 'background-color 0.2s'
                    }
                  }
                }}
              >
                {/* Employee Documents Tab */}
                <Tab 
                  icon={<BusinessCenter sx={{ fontSize: 28, mb: 0.5 }} />}
                  label={
                    <Box>
                      <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        Employee Documents
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#718096', mt: 0.25 }}>
                        Personnel & HR Files
                      </Typography>
                    </Box>
                  }
                />
                
                {/* Company Documents Tab */}
                <Tab 
                  icon={<Business sx={{ fontSize: 28, mb: 0.5 }} />}
                  label={
                    <Box>
                      <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        Company Documents
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#718096', mt: 0.25 }}>
                        Corporate & Legal Files
                      </Typography>
                    </Box>
                  }
                />
                
                {/* Client Documents Tab */}
                <Tab 
                  icon={<People sx={{ fontSize: 28, mb: 0.5 }} />}
                  label={
                    <Box>
                      <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        Client Documents
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#718096', mt: 0.25 }}>
                        Client Contracts & Records
                      </Typography>
                    </Box>
                  }
                />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <TabPanel value={activeTab} index={0}>
              <DocumentTypePanel documentType="EMPLOYEE" />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <DocumentTypePanel documentType="COMPANY" />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <DocumentTypePanel documentType="CLIENT" />
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

// Tab Panel Component
function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      aria-labelledby={`document-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 2.5 }}>{children}</Box>}
    </div>
  );
}

export default DocumentManagementPage;
