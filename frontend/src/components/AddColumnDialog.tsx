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
} from '@mui/material';
import axios from '../utils/axiosConfig';

interface AddColumnDialogProps {
    open: boolean;
    handleClose: () => void;
    tableName: string;
    tableId: number;
    onColumnAdded: () => void;
}

const AddColumnDialog: React.FC<AddColumnDialogProps> = ({open, handleClose, tableName, tableId, onColumnAdded}) => {
    const [name, setName] = useState<string>('');
    const [dataType, setDataType] = useState<string>('string');
    const [constraints, setConstraints] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleAddColumn = async () => {
        if (!name) {
            setError('Column name is required.');
            return;
        }

        try {
            await axios.post(`/tables/${tableId}/columns/`, {
                name,
                data_type: dataType,
                constraints: constraints || undefined,
            });
            setName('');
            setDataType('string');
            setConstraints('');
            setError('');
            onColumnAdded();
            handleClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add column.');
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Add New Column to "{tableName}"</DialogTitle>
            <DialogContent>
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
                    <Select value={dataType} label="Data Type" onChange={e => setDataType(e.target.value as string)}>
                        <MenuItem value="string">String</MenuItem>
                        <MenuItem value="integer">Integer</MenuItem>
                        <MenuItem value="currency">Currency</MenuItem>
                        <MenuItem value="enum">Enum</MenuItem>
                        <MenuItem value="picklist">Picklist</MenuItem>
                        {/* Add more data types as needed */}
                    </Select>
                </FormControl>
                <TextField
                    margin="dense"
                    label="Constraints"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={constraints}
                    onChange={e => setConstraints(e.target.value)}
                    helperText='e.g., "NOT NULL", "UNIQUE"'
                />
                {error && (
                    <Alert severity="error" sx={{mt: 2}}>
                        {error}
                    </Alert>
                )}
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
    );
};

export default AddColumnDialog;
