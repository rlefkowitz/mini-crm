import React, {useEffect, useState} from 'react';
import {useFormik} from 'formik';
import * as Yup from 'yup';
import {TableSchema, Column, Record} from '../types';
import {TextField, Button, MenuItem, FormControl, InputLabel, Select} from '@mui/material';
import axios from 'axios';

interface DynamicFormProps {
    tableName: string;
    mode: 'create' | 'update';
    initialValues?: Record;
    recordId?: number;
    onSuccess?: () => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({tableName, mode, initialValues = {}, recordId, onSuccess}) => {
    const [schema, setSchema] = useState<TableSchema>({});
    const [validationSchema, setValidationSchema] = useState<any>({});
    const [options, setOptions] = useState<{[key: string]: {label: string; value: any}[]}>({});

    const fetchSchema = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/current_schema/`);
            setSchema(response.data);
        } catch (error) {
            console.error('Error fetching schema:', error);
        }
    };

    const fetchOptions = async (column: Column) => {
        // If the column is a picklist or enum, fetch or define options
        // This is a placeholder; implement based on your backend
        if (column.data_type === 'enum' || column.data_type === 'picklist') {
            // Example: Fetch options from backend or define statically
            // Here, we'll define statically for demonstration
            const predefinedOptions = [
                {label: 'Option 1', value: 'option1'},
                {label: 'Option 2', value: 'option2'},
            ];
            setOptions(prev => ({...prev, [column.name]: predefinedOptions}));
        }
    };

    useEffect(() => {
        fetchSchema();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableName]);

    useEffect(() => {
        if (schema[tableName]?.columns) {
            // Build Yup validation schema dynamically
            const shape: any = {};
            schema[tableName].columns.forEach(column => {
                let validator = Yup.mixed();
                if (column.constraints) {
                    try {
                        const constraints = JSON.parse(column.constraints);
                        if (constraints.required) {
                            validator = validator.required('Required');
                        }
                        // Add more constraints as needed
                    } catch (error) {
                        console.error('Error parsing constraints:', error);
                    }
                }
                switch (column.data_type) {
                    case 'string':
                        validator = Yup.string();
                        break;
                    case 'integer':
                        validator = Yup.number().integer('Must be an integer');
                        break;
                    case 'currency':
                        validator = Yup.number().positive('Must be positive');
                        break;
                    case 'enum':
                    case 'picklist':
                        validator = Yup.string();
                        break;
                    default:
                        validator = Yup.string();
                }
                shape[column.name] = validator;
            });
            setValidationSchema(Yup.object().shape(shape));
        }
    }, [schema, tableName]);

    useEffect(() => {
        if (schema[tableName]?.columns) {
            schema[tableName].columns.forEach(column => {
                if (column.data_type === 'enum' || column.data_type === 'picklist') {
                    fetchOptions(column);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, tableName]);

    const formik = useFormik({
        initialValues: initialValues,
        enableReinitialize: true,
        validationSchema: validationSchema,
        onSubmit: async values => {
            try {
                if (mode === 'create') {
                    await axios.post(`${process.env.REACT_APP_API_BASE_URL}/records/${tableName}/`, values);
                } else if (mode === 'update' && recordId) {
                    await axios.put(`${process.env.REACT_APP_API_BASE_URL}/records/${tableName}/${recordId}/`, values);
                }
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error('Error submitting form:', error);
                // Optionally, display error messages to users
            }
        },
    });

    const renderField = (column: Column) => {
        const {name, data_type} = column;
        switch (data_type) {
            case 'string':
                return (
                    <TextField
                        key={name}
                        fullWidth
                        id={name}
                        name={name}
                        label={name}
                        value={formik.values[name] || ''}
                        onChange={formik.handleChange}
                        error={formik.touched[name] && Boolean(formik.errors[name])}
                        helperText={formik.touched[name] && formik.errors[name]}
                        margin="normal"
                    />
                );
            case 'integer':
            case 'currency':
                return (
                    <TextField
                        key={name}
                        fullWidth
                        id={name}
                        name={name}
                        label={name}
                        type="number"
                        value={formik.values[name] || ''}
                        onChange={formik.handleChange}
                        error={formik.touched[name] && Boolean(formik.errors[name])}
                        helperText={formik.touched[name] && formik.errors[name]}
                        margin="normal"
                    />
                );
            case 'enum':
            case 'picklist':
                return (
                    <FormControl fullWidth margin="normal" key={name}>
                        <InputLabel>{name}</InputLabel>
                        <Select
                            id={name}
                            name={name}
                            label={name}
                            value={formik.values[name] || ''}
                            onChange={formik.handleChange}
                            error={formik.touched[name] && Boolean(formik.errors[name])}>
                            {options[name]?.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                        {formik.touched[name] && formik.errors[name] && (
                            <div style={{color: 'red', fontSize: '0.8em'}}>{formik.errors[name]}</div>
                        )}
                    </FormControl>
                );
            default:
                return null;
        }
    };

    return (
        <form onSubmit={formik.handleSubmit}>
            {schema[tableName]?.columns.map(column => renderField(column))}
            <Button color="primary" variant="contained" type="submit" style={{marginTop: '1rem'}}>
                {mode === 'create' ? 'Create' : 'Update'}
            </Button>
        </form>
    );
};

export default DynamicForm;
