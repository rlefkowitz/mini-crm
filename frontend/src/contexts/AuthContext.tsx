import React, {createContext, useContext, useState, useEffect} from 'react';
import axios from '../utils/axiosConfig';
import {useNavigate} from 'react-router-dom';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        setToken(storedToken);
        setIsAuthenticated(!!storedToken);
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const response = await axios.post(
                `/auth/login`,
                new URLSearchParams({
                    username,
                    password,
                }),
                {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
            );
            const accessToken = response.data.access_token;
            localStorage.setItem('token', accessToken);
            setToken(accessToken);
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
            const accessToken = response.data.access_token;
            localStorage.setItem('token', accessToken);
            setToken(accessToken);
            setIsAuthenticated(true);
            navigate('/schema');
        } catch (error) {
            throw new Error('Registration failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{isAuthenticated, token, login, register, logout}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
