import React, {useEffect} from 'react';
import {useAuth} from '../contexts/AuthContext';
import {Navigate} from 'react-router-dom';

const Logout: React.FC = () => {
    const {logout} = useAuth();

    useEffect(() => {
        logout();
    }, [logout]);

    return <Navigate to="/login" replace />;
};

export default Logout;
