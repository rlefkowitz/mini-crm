import React from 'react';
import {Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography} from '@mui/material';
import axios from '../utils/axiosConfig';
import {TableRead} from '../types';
import {useFormik} from 'formik';
import * as Yup from 'yup';

interface TableSettingsDialogProps {
    open: boolean;
    handleClose: () => void;
    table: TableRead;
    onSettingsSaved: () => void;
}

const TableSettingsDialog: React.FC<TableSettingsDialogProps> = ({open, handleClose, table, onSettingsSaved}) => {
    const [error, setError] = React.useState<string>('');

    const formik = useFormik({
        initialValues: {
            display_format: table.display_format || '',
            display_format_secondary: table.display_format_secondary || '',
        },
        validationSchema: Yup.object({
            display_format: Yup.string(),
            display_format_secondary: Yup.string(),
        }),
        onSubmit: async values => {
            try {
                await axios.put(`/tables/${table.id}/`, {
                    name: table.name, // Assuming the name is required for PUT
                    display_format: values.display_format.trim() || null,
                    display_format_secondary: values.display_format_secondary.trim() || null,
                });
                onSettingsSaved();
                handleClose();
            } catch (error: any) {
                console.error('Error updating table settings:', error);
                setError(error.response?.data?.detail || 'Failed to update table settings.');
            }
        },
    });

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Table Settings - {table.name}</DialogTitle>
            <DialogContent>
                {error && (
                    <Typography color="error" variant="body2" gutterBottom>
                        {error}
                    </Typography>
                )}
                <form onSubmit={formik.handleSubmit}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Display Format"
                        type="text"
                        fullWidth
                        variant="outlined"
                        name="display_format"
                        value={formik.values.display_format}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.display_format && Boolean(formik.errors.display_format)}
                        helperText={formik.touched.display_format && formik.errors.display_format}
                    />
                    <TextField
                        margin="dense"
                        label="Display Format Secondary"
                        type="text"
                        fullWidth
                        variant="outlined"
                        name="display_format_secondary"
                        value={formik.values.display_format_secondary}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={
                            formik.touched.display_format_secondary && Boolean(formik.errors.display_format_secondary)
                        }
                        helperText={formik.touched.display_format_secondary && formik.errors.display_format_secondary}
                    />
                    <DialogActions>
                        <Button onClick={handleClose} color="secondary">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" color="primary">
                            Save
                        </Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TableSettingsDialog;
