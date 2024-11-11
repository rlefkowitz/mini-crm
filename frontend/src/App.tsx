import React, {useState, useMemo} from 'react';
import {BrowserRouter as Router, Routes, Route, Link, Navigate} from 'react-router-dom';
import {AppBar, Toolbar, Typography, Button, IconButton, CssBaseline, Box} from '@mui/material';
import {Brightness4, Brightness7} from '@mui/icons-material';
import SchemaView from './views/SchemaView';
import DataView from './views/DataView';
import RelationshipView from './views/RelationshipView';
import NodeView from './views/NodeView';
import EnumManagement from './components/EnumManagement';
import Login from './components/Login';
import Register from './components/Register';
import Logout from './components/Logout';
import {AuthProvider} from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import getTheme from './theme';
import {ThemeProvider} from '@mui/material/styles';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

const queryClient = new QueryClient();

const App: React.FC = () => {
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    const theme = useMemo(() => getTheme(mode), [mode]);

    const toggleTheme = () => {
        setMode(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Router>
                    <AuthProvider>
                        <AppBar position="static">
                            <Toolbar>
                                <Typography variant="h6" sx={{flexGrow: 1}}>
                                    Mini CRM
                                </Typography>
                                <IconButton sx={{ml: 1}} onClick={toggleTheme} color="inherit">
                                    {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                                </IconButton>
                                <Button color="inherit" component={Link} to="/schema">
                                    Schema
                                </Button>
                                <Button color="inherit" component={Link} to="/data">
                                    Data
                                </Button>
                                <Button color="inherit" component={Link} to="/relationships">
                                    Relationships
                                </Button>
                                <Button color="inherit" component={Link} to="/enums">
                                    Enums
                                </Button>
                                <Button color="inherit" component={Link} to="/node-view">
                                    Node View
                                </Button>
                                <Button color="inherit" component={Link} to="/logout">
                                    Logout
                                </Button>
                            </Toolbar>
                        </AppBar>
                        <Box sx={{padding: '2rem'}}>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/" element={<Navigate replace to="/schema" />} />
                                <Route
                                    path="/schema"
                                    element={
                                        <ProtectedRoute>
                                            <SchemaView />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/data"
                                    element={
                                        <ProtectedRoute>
                                            <DataView />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/relationships"
                                    element={
                                        <ProtectedRoute>
                                            <RelationshipView />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/enums"
                                    element={
                                        <ProtectedRoute>
                                            <EnumManagement />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/node-view"
                                    element={
                                        <ProtectedRoute>
                                            <NodeView />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="/logout" element={<Logout />} />
                                <Route path="*" element={<Typography>404 Not Found</Typography>} />
                            </Routes>
                        </Box>
                    </AuthProvider>
                </Router>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

export default App;
