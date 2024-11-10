import React from 'react';
import {Typography, Divider, Paper} from '@mui/material';
import RelationshipManagement from '../components/RelationshipManagement';

const RelationshipView: React.FC = () => {
    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Relationship Management
            </Typography>
            <Divider style={{marginBottom: '1rem'}} />
            <Paper elevation={3} style={{padding: '1rem'}}>
                <RelationshipManagement />
            </Paper>
        </div>
    );
};

export default RelationshipView;
