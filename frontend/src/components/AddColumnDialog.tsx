import React, {useState} from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Checkbox,
    FormControlLabel,
    Box,
} from '@mui/material';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';
import EnumManagement from './EnumManagement';

interface AddColumnDialogProps {
    open: boolean;
    handleClose: () => void;
    tableName: string;
    tableId: number;
    onColumnAdded: () => void;
}

const AddColumnDialog: React.FC<AddColumnDialogProps> = ({open, handleClose, tableName, tableId, onColumnAdded}) => {
    const queryClient = useQueryClient();

    const [name, setName] = useState<string>('');
    const [dataType, setDataType] = useState<string>('string');
    const [constraints, setConstraints] = useState<string>('');
    const [required, setRequired] = useState<boolean>(false);
    const [unique, setUnique] = useState<boolean>(false);
    const [enumId, setEnumId] = useState<number | null>(null);
    const [error, setError] = useState<string>('');
    const [showCreateEnum, setShowCreateEnum] = useState<boolean>(false);
    const [referenceTableId, setReferenceTableId] = useState<number | null>(null);
    const [isList, setIsList] = useState<boolean>(false);

    // Fetch enums
    const {data: enums} = useQuery({
        queryKey: ['enums'],
        queryFn: async () => {
            const response = await axios.get(`/enums/`);
            return response.data;
        },
    });

    // Fetch tables for reference fields
    const {data: tables} = useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const response = await axios.get(`/tables/`);
            return response.data;
        },
    });

    const mutation = useMutation({
        mutationFn: (newColumn: any) => axios.post(`/tables/${tableId}/columns/`, newColumn),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['columns', tableId]});
            onColumnAdded();
            handleClose();
        },
        onError: (error: any) => {
            setError(error.response?.data?.detail || 'Failed to add column.');
        },
    });

    const handleAddColumn = () => {
        if (!name) {
            setError('Column name is required.');
            return;
        }

        if (dataType === 'enum' && !enumId) {
            setError('Please select an enum or create a new one.');
            return;
        }

        if (dataType === 'reference' && !referenceTableId) {
            setError('Please select a table to reference.');
            return;
        }

        mutation.mutate({
            name,
            data_type: dataType,
            constraints: constraints || undefined,
            required,
            unique,
            enum_id: enumId || undefined,
            reference_table_id: referenceTableId || undefined,
            is_list: isList,
        });
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Add New Column to "{tableName}"</DialogTitle>
                <DialogContent>
                    <Box component="form" noValidate autoComplete="off">
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Column Name"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Data Type</InputLabel>
                            <Select
                                value={dataType}
                                label="Data Type"
                                onChange={e => setDataType(e.target.value as string)}>
                                <MenuItem value="string">String</MenuItem>
                                <MenuItem value="integer">Integer</MenuItem>
                                <MenuItem value="currency">Currency</MenuItem>
                                <MenuItem value="enum">Enum</MenuItem>
                                <MenuItem value="reference">Reference</MenuItem>
                                {/* Add more data types as needed */}
                            </Select>
                        </FormControl>
                        {dataType === 'enum' && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Enum</InputLabel>
                                <Select
                                    value={enumId || ''}
                                    label="Enum"
                                    onChange={e => setEnumId(Number(e.target.value))}>
                                    {enums &&
                                        enums.map((enumItem: any) => (
                                            <MenuItem key={enumItem.id} value={enumItem.id}>
                                                {enumItem.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                                <Button
                                    variant="text"
                                    onClick={() => setShowCreateEnum(true)}
                                    style={{marginTop: '0.5rem'}}>
                                    Create New Enum
                                </Button>
                            </FormControl>
                        )}
                        {dataType === 'reference' && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Reference Table</InputLabel>
                                <Select
                                    value={referenceTableId || ''}
                                    label="Reference Table"
                                    onChange={e => setReferenceTableId(Number(e.target.value))}>
                                    {tables &&
                                        tables
                                            .filter((table: any) => table.id !== tableId)
                                            .map((table: any) => (
                                                <MenuItem key={table.id} value={table.id}>
                                                    {table.name}
                                                </MenuItem>
                                            ))}
                                </Select>
                                <FormControlLabel
                                    control={<Checkbox checked={isList} onChange={e => setIsList(e.target.checked)} />}
                                    label="Allow multiple selections"
                                />
                            </FormControl>
                        )}
                        <TextField
                            margin="dense"
                            label="Constraints"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={constraints}
                            onChange={e => setConstraints(e.target.value)}
                            helperText='e.g., "CHECK (value > 0)"'
                        />
                        <FormControlLabel
                            control={<Checkbox checked={required} onChange={e => setRequired(e.target.checked)} />}
                            label="Required"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={unique} onChange={e => setUnique(e.target.checked)} />}
                            label="Unique"
                        />
                        {error && (
                            <Alert severity="error" sx={{mt: 2}}>
                                {error}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleAddColumn} variant="contained" color="primary">
                        Add Column
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal for Enum Management */}
            <Dialog open={showCreateEnum} onClose={() => setShowCreateEnum(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create New Enum</DialogTitle>
                <DialogContent>
                    <EnumManagement
                        onEnumCreated={() => {
                            queryClient.invalidateQueries({queryKey: ['enums']});
                            setShowCreateEnum(false);
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCreateEnum(false)} color="secondary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AddColumnDialog;
