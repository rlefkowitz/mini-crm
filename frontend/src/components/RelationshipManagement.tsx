import React, {useEffect, useState} from 'react';
import {
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    IconButton,
    Typography,
} from '@mui/material';
import {AddCircle, RemoveCircle} from '@mui/icons-material';
import axios from 'axios';
import {RelationshipRead, TableRead} from '../types';
import DynamicAttributeForm from './DynamicAttributeForm';

const RelationshipManagement: React.FC = () => {
    const [relationships, setRelationships] = useState<RelationshipRead[]>([]);
    const [tables, setTables] = useState<TableRead[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [newRelationship, setNewRelationship] = useState({
        name: '',
        from_table: '',
        to_table: '',
        attributes: [] as {name: string; data_type: string; constraints?: string}[],
    });

    const fetchRelationships = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/relationships/`);
            setRelationships(response.data);
        } catch (error) {
            console.error('Error fetching relationships:', error);
        }
    };

    const fetchTables = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/tables/`);
            setTables(response.data);
        } catch (error) {
            console.error('Error fetching tables:', error);
        }
    };

    useEffect(() => {
        fetchRelationships();
        fetchTables();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewRelationship({
            name: '',
            from_table: '',
            to_table: '',
            attributes: [],
        });
    };

    const handleCreateRelationship = async () => {
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/relationships/`, newRelationship);
            handleCloseDialog();
            fetchRelationships();
        } catch (error) {
            console.error('Error creating relationship:', error);
            // Optionally, display error messages to users
        }
    };

    const handleDeleteRelationship = async (relationshipId: number) => {
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/relationships/${relationshipId}`);
            fetchRelationships();
        } catch (error) {
            console.error('Error deleting relationship:', error);
            // Optionally, display error messages to users
        }
    };

    const handleAttributeChange = (attributes: {name: string; data_type: string; constraints?: string}[]) => {
        setNewRelationship({...newRelationship, attributes});
    };

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Relationship Management
            </Typography>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                <TextField
                    label="Search Relationships"
                    variant="outlined"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    size="small"
                />
                <Button variant="contained" color="primary" onClick={handleOpenDialog}>
                    Add New Relationship
                </Button>
            </div>
            <List>
                {relationships
                    .filter(rel => rel.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(rel => (
                        <ListItem
                            key={rel.id}
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => handleDeleteRelationship(rel.id)}>
                                    <RemoveCircle color="secondary" />
                                </IconButton>
                            }>
                            <ListItemText primary={rel.name} secondary={`${rel.from_table} ↔ ${rel.to_table}`} />
                        </ListItem>
                    ))}
            </List>

            {/* Dialog for creating a new relationship */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>Create New Relationship</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Relationship Name"
                                variant="outlined"
                                fullWidth
                                value={newRelationship.name}
                                onChange={e => setNewRelationship({...newRelationship, name: e.target.value})}
                                margin="normal"
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth variant="outlined" margin="normal">
                                <InputLabel>From Table</InputLabel>
                                <Select
                                    label="From Table"
                                    value={newRelationship.from_table}
                                    onChange={e =>
                                        setNewRelationship({...newRelationship, from_table: e.target.value as string})
                                    }>
                                    {tables.map(table => (
                                        <MenuItem key={table.id} value={table.name}>
                                            {table.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth variant="outlined" margin="normal">
                                <InputLabel>To Table</InputLabel>
                                <Select
                                    label="To Table"
                                    value={newRelationship.to_table}
                                    onChange={e =>
                                        setNewRelationship({...newRelationship, to_table: e.target.value as string})
                                    }>
                                    {tables.map(table => (
                                        <MenuItem key={table.id} value={table.name}>
                                            {table.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                    {/* Dynamic Attributes */}
                    <DynamicAttributeForm attributes={newRelationship.attributes} onChange={handleAttributeChange} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleCreateRelationship} color="primary" variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default RelationshipManagement;
