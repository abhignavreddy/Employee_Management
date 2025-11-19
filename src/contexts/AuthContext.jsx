import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
  if (!user) return; // run idle timer ONLY when logged in

  let timeout;

  const logoutAndRedirect = () => {
    logout();
    window.location.href = "/login";  // force redirect
  };

  const resetTimer = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log("⏳ Auto logout due to inactivity");
      logoutAndRedirect();
    }, 10 * 60 * 1000); // 10 minutes
  };

  // Track all user interactions
  window.addEventListener("mousemove", resetTimer);
  window.addEventListener("keydown", resetTimer);
  window.addEventListener("click", resetTimer);
  window.addEventListener("scroll", resetTimer);

  resetTimer(); // start idle timer

  return () => {
    clearTimeout(timeout);
    window.removeEventListener("mousemove", resetTimer);
    window.removeEventListener("keydown", resetTimer);
    window.removeEventListener("click", resetTimer);
    window.removeEventListener("scroll", resetTimer);
  };
}, [user]);



  // 🧠 MAIN LOGIN FUNCTION — uses backend
  const login = async (empIdOrEmail, password) => {
    if (!empIdOrEmail || !password) {
      return { success: false, error: 'Both Emp ID and Password are required' };
    }

    try {
      let empId = empIdOrEmail.trim();

      // 🔍 if the user entered an email instead of empId, resolve it to empId
      if (empId.includes('@')) {
        console.log('🔍 Resolving email to empId...');
        const res = await apiGet('/employees?page=0&size=500');
        if (!res.ok) {
          console.error('❌ Failed to fetch employees:', res.status, res.statusText);
          return { success: false, error: 'Unable to fetch employees' };
        }
        const data = await res.json();
        const found = (data.content || []).find(
          (e) => e.email.toLowerCase() === empId.toLowerCase()
        );
        if (!found) {
          console.error('❌ Email not found in employee list');
          return { success: false, error: 'Email not found' };
        }
        empId = found.empId;
        console.log('✅ Email resolved to empId:', empId);
      }

      // ✅ Backend login request
      console.log('🔐 Attempting login with empId:', empId.toUpperCase());
      const res = await apiPost('/auth/login', { empId: empId.toUpperCase(), password });

      console.log('📡 Login response status:', res.status, res.statusText);

      if (!res.ok) {
        const errText = await res.text();
        console.error('❌ Login failed:', errText);
        return { success: false, error: errText || 'Invalid credentials' };
      }

      const loginResp = await res.json();
      console.log('📦 Login response data:', loginResp);

      // Validate that we have the required fields
      if (!loginResp.id || !loginResp.empId || !loginResp.empRole) {
        console.error('❌ Invalid login response structure:', loginResp);
        return { success: false, error: 'Invalid response from server' };
      }

      const userData = {
        id: loginResp.id,
        empId: loginResp.empId,
        email: loginResp.email,
        role: loginResp.empRole,
        name: `${loginResp.firstName || ""} ${loginResp.lastName || ""}`.trim() || loginResp.empId,
        message: loginResp.message,
      };

      console.log('✅ User data created:', userData);
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      console.log('✅ User saved to localStorage');

      return { success: true, user: userData };
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('Error details:', err.message, err.stack);
      return { success: false, error: 'Server error during login' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) return roles.includes(user.role);
    return user.role === roles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasRole,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
