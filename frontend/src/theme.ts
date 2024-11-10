import {createTheme} from '@mui/material/styles';

const getTheme = (mode: 'light' | 'dark') =>
    createTheme({
        palette: {
            mode,
            primary: {
                main: '#1976d2', // Customize as needed
            },
            secondary: {
                main: '#dc004e', // Customize as needed
            },
            background: {
                default: mode === 'dark' ? '#121212' : '#ffffff',
                paper: mode === 'dark' ? '#1d1d1d' : '#f5f5f5',
            },
            text: {
                primary: mode === 'dark' ? '#ffffff' : '#000000',
            },
        },
        typography: {
            h4: {
                marginBottom: '1rem',
            },
            h5: {
                marginTop: '1rem',
                marginBottom: '0.5rem',
            },
            // Add more typography customizations as needed
        },
        // Add more theme customizations as needed
    });

export default getTheme;
