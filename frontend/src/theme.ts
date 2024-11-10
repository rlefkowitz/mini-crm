import {createTheme} from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2', // Customize as needed
        },
        secondary: {
            main: '#dc004e', // Customize as needed
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

export default theme;
