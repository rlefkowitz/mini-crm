import React from 'react';
import {BrowserRouter as Router, Routes, Route, Link, Navigate} from 'react-router-dom';
import {AppBar, Toolbar, Typography, Button} from '@mui/material';
import SchemaView from './views/SchemaView';
import DataView from './views/DataView';
import RelationshipView from './views/RelationshipView';
import NodeView from './views/NodeView';
import {ThemeProvider} from '@mui/material/styles';
import theme from './theme';

const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <Router>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" style={{flexGrow: 1}}>
                            Mini CRM
                        </Typography>
                        <Button color="inherit" component={Link} to="/schema">
                            Schema
                        </Button>
                        <Button color="inherit" component={Link} to="/data">
                            Data
                        </Button>
                        <Button color="inherit" component={Link} to="/relationships">
                            Relationships
                        </Button>
                        <Button color="inherit" component={Link} to="/node-view">
                            Node View
                        </Button>
                    </Toolbar>
                </AppBar>
                <div style={{padding: '2rem'}}>
                    <Routes>
                        <Route path="/" element={<Navigate replace to="/schema" />} />
                        <Route path="/schema" element={<SchemaView />} />
                        <Route path="/data" element={<DataView />} />
                        <Route path="/relationships" element={<RelationshipView />} />
                        <Route path="/node-view" element={<NodeView />} />
                        <Route path="*" element={<Typography>404 Not Found</Typography>} />
                    </Routes>
                </div>
            </Router>
        </ThemeProvider>
    );
};

export default App;
