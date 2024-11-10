import React, {createContext, useContext, useState, useEffect} from 'react';
import axios from '../utils/axiosConfig';
import {useNavigate} from 'react-router-dom';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Optionally, you can validate the token here by making a request to the backend
            setIsAuthenticated(true);
        }
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const response = await axios.post(`/auth/login`, {
                username,
                password,
            });
            localStorage.setItem('token', response.data.access_token);
            setIsAuthenticated(true);
            navigate('/schema');
        } catch (error) {
            throw new Error('Login failed');
        }
    };

    const register = async (name: string, email: string, password: string) => {
        try {
            const response = await axios.post(`/auth/register`, {
                name,
                email,
                password,
            });
            localStorage.setItem('token', response.data.access_token);
            setIsAuthenticated(true);
            navigate('/schema');
        } catch (error) {
            throw new Error('Registration failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        navigate('/login');
    };

    return <AuthContext.Provider value={{isAuthenticated, login, register, logout}}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
