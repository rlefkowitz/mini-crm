import React from 'react';
import {Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography} from '@mui/material';
import {useFormik} from 'formik';
import * as Yup from 'yup';
import axios from '../utils/axiosConfig';

interface AddTableDialogProps {
    open: boolean;
    handleClose: () => void;
    onTableAdded: () => void;
}

const AddTableDialog: React.FC<AddTableDialogProps> = ({open, handleClose, onTableAdded}) => {
    const [error, setError] = React.useState<string>('');

    const formik = useFormik({
        initialValues: {
            name: '',
            display_format: '',
            display_format_secondary: '',
        },
        validationSchema: Yup.object({
            name: Yup.string().required('Table name is required'),
            display_format: Yup.string(), // Made optional
            display_format_secondary: Yup.string(),
        }),
        onSubmit: async (values, {resetForm, setSubmitting, setErrors}) => {
            try {
                await axios.post('/tables/', {
                    name: values.name.trim(),
                    display_format: values.display_format.trim() || null,
                    display_format_secondary: values.display_format_secondary.trim() || null,
                });
                resetForm();
                onTableAdded();
                handleClose();
            } catch (error: any) {
                console.error('Error adding table:', error);
                setError(error.response?.data?.detail || 'Failed to add table.');
                setSubmitting(false);
            }
        },
    });

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Add New Table</DialogTitle>
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
                        label="Table Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        name="name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.name && Boolean(formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                        required
                    />
                    <TextField
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
                        <Button type="submit" variant="contained" color="primary" disabled={formik.isSubmitting}>
                            Add Table
                        </Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddTableDialog;
