import React, {useState} from 'react';
import {Container, TextField, Button, Typography, Box, Alert} from '@mui/material';
import {useAuth} from '../contexts/AuthContext';
import {Link} from 'react-router-dom';

const Login: React.FC = () => {
    const {login} = useAuth();
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(username, password);
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                <Typography component="h1" variant="h5">
                    Login
                </Typography>
                {error && (
                    <Alert severity="error" sx={{mt: 2}}>
                        {error}
                    </Alert>
                )}
                <Box component="form" onSubmit={handleSubmit} sx={{mt: 1}}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <Button type="submit" fullWidth variant="contained" color="primary" sx={{mt: 3, mb: 2}}>
                        Sign In
                    </Button>
                    <Typography variant="body2" align="center">
                        Don't have an account? <Link to="/register">Register</Link>
                    </Typography>
                </Box>
            </Box>
        </Container>
    );
};

export default Login;
