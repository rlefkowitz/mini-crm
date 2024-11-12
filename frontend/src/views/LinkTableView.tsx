import React from 'react';
import {Typography, Divider, Paper} from '@mui/material';
import LinkTableManagement from '../components/LinkTableManagement';

const LinkTableView: React.FC = () => {
    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Link Table Management
            </Typography>
            <Divider style={{marginBottom: '1rem'}} />
            <Paper elevation={3} style={{padding: '1rem'}}>
                <LinkTableManagement />
            </Paper>
        </div>
    );
};

export default LinkTableView;
