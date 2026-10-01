import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Safe initial placeholder state
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('policylens_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    // Clean demo / placeholder authentication
    const mockUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      role: 'Compliance Lead',
      organization: 'Acme Enterprise Corp',
    };
    setUser(mockUser);
    try {
      localStorage.setItem('policylens_user', JSON.stringify(mockUser));
    } catch (e) {
      console.warn('Could not persist auth to localStorage', e);
    }
    return mockUser;
  };

  const signup = async ({ name, email, password }) => {
    const mockUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      role: 'Compliance Lead',
      organization: 'Acme Enterprise Corp',
    };
    setUser(mockUser);
    try {
      localStorage.setItem('policylens_user', JSON.stringify(mockUser));
    } catch (e) {
      console.warn('Could not persist auth to localStorage', e);
    }
    return mockUser;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('policylens_user');
    } catch (e) {
      console.warn('Could not clear auth from localStorage', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      login: async () => {},
      signup: async () => {},
      logout: () => {},
    };
  }
  return context;
}

export default AuthContext;
