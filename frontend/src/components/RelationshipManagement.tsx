import React, {useState} from 'react';
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
    Alert,
    Box,
} from '@mui/material';
import {RemoveCircle} from '@mui/icons-material';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';
import DynamicAttributeForm from './DynamicAttributeForm'; // Ensure this component handles attributes

interface RelationshipAttribute {
    name: string;
    data_type: string;
    constraints?: string;
}

interface Relationship {
    id: number;
    name: string;
    from_table: string;
    to_table: string;
    relationship_type: string;
    attributes: RelationshipAttribute[];
}

const RelationshipManagement: React.FC = () => {
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState<string>('');
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [newRelationship, setNewRelationship] = useState<{
        name: string;
        from_table: string;
        to_table: string;
        relationship_type: string;
        attributes: RelationshipAttribute[];
    }>({
        name: '',
        from_table: '',
        to_table: '',
        relationship_type: 'one_to_many',
        attributes: [],
    });
    const [error, setError] = useState<string>('');

    // Fetch relationships
    const {
        data: relationships,
        isLoading,
        isError,
    } = useQuery<Relationship[]>({
        queryKey: ['relationships'],
        queryFn: async () => {
            const response = await axios.get(`/relationships/`);
            return response.data;
        },
    });

    // Fetch tables for selection
    const {data: tables} = useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const response = await axios.get(`/tables/`);
            return response.data;
        },
    });

    const createRelationshipMutation = useMutation({
        mutationFn: (newRel: any) => axios.post(`/relationships/`, newRel),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['relationships']});
            handleCloseDialog();
        },
        onError: (error: any) => {
            setError(error.response?.data?.detail || 'Failed to create relationship.');
        },
    });

    const handleCreateRelationship = () => {
        if (!newRelationship.name || !newRelationship.from_table || !newRelationship.to_table) {
            setError('Please fill out all required fields.');
            return;
        }

        createRelationshipMutation.mutate(newRelationship);
    };

    const handleDeleteRelationship = (relationshipId: number) => {
        if (window.confirm('Are you sure you want to delete this relationship?')) {
            axios
                .delete(`/relationships/${relationshipId}`)
                .then(() => {
                    queryClient.invalidateQueries({queryKey: ['relationships']});
                })
                .catch((error: any) => {
                    setError(error.response?.data?.detail || 'Failed to delete relationship.');
                });
        }
    };

    const handleAttributeChange = (attributes: RelationshipAttribute[]) => {
        setNewRelationship(prev => ({...prev, attributes}));
    };

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewRelationship({
            name: '',
            from_table: '',
            to_table: '',
            relationship_type: 'one_to_many',
            attributes: [],
        });
        setError('');
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Relationship Management
            </Typography>
            <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
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
            </Box>
            {error && (
                <Alert severity="error" sx={{mb: 2}}>
                    {error}
                </Alert>
            )}
            <List>
                {isLoading ? (
                    <Typography>Loading relationships...</Typography>
                ) : isError ? (
                    <Typography>Error loading relationships.</Typography>
                ) : relationships && relationships.length > 0 ? (
                    relationships
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
                                <ListItemText
                                    primary={rel.name}
                                    secondary={`${rel.from_table} ↔ ${rel.to_table} (${rel.relationship_type.replace('_', ' ')})`}
                                />
                            </ListItem>
                        ))
                ) : (
                    <Typography>No relationships found.</Typography>
                )}
            </List>

            {/* Dialog for creating a new relationship */}
            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
                <DialogTitle>Create New Relationship</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Relationship Name"
                                variant="outlined"
                                fullWidth
                                value={newRelationship.name}
                                onChange={e => setNewRelationship(prev => ({...prev, name: e.target.value}))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth variant="outlined" required>
                                <InputLabel>From Table</InputLabel>
                                <Select
                                    label="From Table"
                                    value={newRelationship.from_table}
                                    onChange={e =>
                                        setNewRelationship(prev => ({...prev, from_table: e.target.value as string}))
                                    }>
                                    {tables &&
                                        tables.map((table: any) => (
                                            <MenuItem key={table.id} value={table.name}>
                                                {table.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth variant="outlined" required>
                                <InputLabel>To Table</InputLabel>
                                <Select
                                    label="To Table"
                                    value={newRelationship.to_table}
                                    onChange={e =>
                                        setNewRelationship(prev => ({...prev, to_table: e.target.value as string}))
                                    }>
                                    {tables &&
                                        tables.map((table: any) => (
                                            <MenuItem key={table.id} value={table.name}>
                                                {table.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth variant="outlined" required>
                                <InputLabel>Relationship Type</InputLabel>
                                <Select
                                    label="Relationship Type"
                                    value={newRelationship.relationship_type}
                                    onChange={e =>
                                        setNewRelationship(prev => ({
                                            ...prev,
                                            relationship_type: e.target.value as string,
                                        }))
                                    }>
                                    <MenuItem value="one_to_one">One-to-One</MenuItem>
                                    <MenuItem value="one_to_many">One-to-Many</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                    <Box sx={{mt: 2}}>
                        <Typography variant="subtitle1">Relationship Attributes</Typography>
                        <DynamicAttributeForm
                            attributes={newRelationship.attributes}
                            onChange={handleAttributeChange}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleCreateRelationship} variant="contained" color="primary">
                        Create Relationship
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RelationshipManagement;
