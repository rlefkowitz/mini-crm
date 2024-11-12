import {createTheme} from '@mui/material/styles';

const getTheme = (mode: 'light' | 'dark') =>
    createTheme({
        palette: {
            mode,
            primary: {
                main: '#1976d2',
            },
            secondary: {
                main: '#dc004e',
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
        },
    });

export default getTheme;
