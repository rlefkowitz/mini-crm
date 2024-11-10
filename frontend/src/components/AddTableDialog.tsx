import React, {useState} from 'react';
import {Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert} from '@mui/material';
import axios from '../utils/axiosConfig';

interface AddTableDialogProps {
    open: boolean;
    handleClose: () => void;
    onTableAdded: () => void;
}

const AddTableDialog: React.FC<AddTableDialogProps> = ({open, handleClose, onTableAdded}) => {
    const [tableName, setTableName] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleAddTable = async () => {
        if (!tableName.trim()) {
            setError('Table name is required.');
            return;
        }

        try {
            await axios.post(`/tables/`, {
                name: tableName.trim(),
            });
            setTableName('');
            setError('');
            onTableAdded();
            handleClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add table.');
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Add New Table</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Table Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={tableName}
                    onChange={e => setTableName(e.target.value)}
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
                <Button onClick={handleAddTable} variant="contained" color="primary">
                    Add Table
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddTableDialog;
