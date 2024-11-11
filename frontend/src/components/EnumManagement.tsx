import React, {useState} from 'react';
import {
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Box,
    Alert,
    Grid,
} from '@mui/material';
import {Add, Delete} from '@mui/icons-material';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';

interface EnumValue {
    id: number;
    value: string;
}

interface Enum {
    id: number;
    name: string;
    values: EnumValue[];
}

const EnumManagement: React.FC = () => {
    const queryClient = useQueryClient();

    const [openCreateDialog, setOpenCreateDialog] = useState<boolean>(false);
    const [enumName, setEnumName] = useState<string>('');
    const [enumValues, setEnumValues] = useState<string[]>(['']);
    const [error, setError] = useState<string>('');

    const {
        data: enums,
        isLoading,
        isError,
    } = useQuery<Enum[]>({
        queryKey: ['enums'],
        queryFn: async () => {
            const response = await axios.get(`/enums/`);
            return response.data;
        },
    });

    const createEnumMutation = useMutation({
        mutationFn: (newEnum: any) => axios.post(`/enums/`, newEnum),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['enums']});
            handleCloseCreateDialog();
        },
        onError: (error: any) => {
            setError(error.response?.data?.detail || 'Failed to create enum.');
        },
    });

    const deleteEnumMutation = useMutation({
        mutationFn: (enumId: number) => axios.delete(`/enums/${enumId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['enums']});
        },
        onError: (error: any) => {
            setError(error.response?.data?.detail || 'Failed to delete enum.');
        },
    });

    const handleAddEnumValue = () => {
        setEnumValues([...enumValues, '']);
    };

    const handleRemoveEnumValue = (index: number) => {
        const values = [...enumValues];
        values.splice(index, 1);
        setEnumValues(values);
    };

    const handleChangeEnumValue = (index: number, value: string) => {
        const values = [...enumValues];
        values[index] = value;
        setEnumValues(values);
    };

    const handleCreateEnum = () => {
        if (!enumName.trim()) {
            setError('Enum name is required.');
            return;
        }
        if (enumValues.some(val => !val.trim())) {
            setError('All enum values must be non-empty.');
            return;
        }

        const payload = {
            name: enumName.trim(),
            values: enumValues.map(val => ({value: val.trim()})),
        };

        createEnumMutation.mutate(payload);
    };

    const handleDeleteEnum = (enumId: number) => {
        if (window.confirm('Are you sure you want to delete this enum?')) {
            deleteEnumMutation.mutate(enumId);
        }
    };

    const handleOpenCreateDialog = () => {
        setOpenCreateDialog(true);
    };

    const handleCloseCreateDialog = () => {
        setOpenCreateDialog(false);
        setEnumName('');
        setEnumValues(['']);
        setError('');
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Enum Management
            </Typography>
            <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleOpenCreateDialog}>
                Create New Enum
            </Button>
            {error && (
                <Alert severity="error" sx={{mt: 2}}>
                    {error}
                </Alert>
            )}
            <List>
                {isLoading ? (
                    <Typography>Loading enums...</Typography>
                ) : isError ? (
                    <Typography>Error loading enums.</Typography>
                ) : enums && enums.length > 0 ? (
                    enums.map(enumItem => (
                        <ListItem
                            key={enumItem.id}
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => handleDeleteEnum(enumItem.id)}>
                                    <Delete />
                                </IconButton>
                            }>
                            <ListItemText
                                primary={enumItem.name}
                                secondary={enumItem.values.map(val => val.value).join(', ')}
                            />
                        </ListItem>
                    ))
                ) : (
                    <Typography>No enums found.</Typography>
                )}
            </List>

            {/* Create Enum Dialog */}
            <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} fullWidth maxWidth="sm">
                <DialogTitle>Create New Enum</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Enum Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={enumName}
                        onChange={e => setEnumName(e.target.value)}
                    />
                    <Typography variant="subtitle1" sx={{mt: 2}}>
                        Enum Values
                    </Typography>
                    {enumValues.map((val, index) => (
                        <Grid container spacing={1} alignItems="center" key={index} sx={{mb: 1}}>
                            <Grid item xs={10}>
                                <TextField
                                    label={`Value ${index + 1}`}
                                    variant="outlined"
                                    fullWidth
                                    value={val}
                                    onChange={e => handleChangeEnumValue(index, e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={2}>
                                <IconButton
                                    color="secondary"
                                    onClick={() => handleRemoveEnumValue(index)}
                                    disabled={enumValues.length === 1}>
                                    <Delete />
                                </IconButton>
                            </Grid>
                        </Grid>
                    ))}
                    <Button variant="outlined" startIcon={<Add />} onClick={handleAddEnumValue} sx={{mt: 1}}>
                        Add Value
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleCreateEnum} variant="contained" color="primary">
                        Create Enum
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnumManagement;
