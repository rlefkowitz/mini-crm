import React, {useEffect, useState} from 'react';
import {useFormik} from 'formik';
import * as Yup from 'yup';
import {TableSchema, Column, Record, EnumRead, RelationshipRead, SelectOption} from '../types';
import {TextField, Button, MenuItem, FormControl, InputLabel, Select, FormHelperText} from '@mui/material';
import axios from '../utils/axiosConfig';
import {useQuery} from '@tanstack/react-query';

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
    const [options, setOptions] = useState<{[key: string]: SelectOption[]}>({});
    const [relationships, setRelationships] = useState<RelationshipRead[]>([]);

    const {
        data: fetchedSchema,
        isLoading,
        error,
    } = useQuery<TableSchema, Error>({
        queryKey: ['schema'],
        queryFn: async () => {
            const response = await axios.get(`/current_schema/`);
            return response.data;
        },
    });

    const {data: enums} = useQuery<EnumRead[], Error>({
        queryKey: ['enums'],
        queryFn: async () => {
            const response = await axios.get(`/enums/`);
            return response.data;
        },
    });

    useEffect(() => {
        if (fetchedSchema) {
            setSchema(fetchedSchema);
            const tableSchema = fetchedSchema[tableName];
            if (tableSchema) {
                setRelationships(tableSchema.relationships.from);
                // Build Yup validation schema dynamically
                const shape: any = {};
                tableSchema.columns.forEach(column => {
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

                // Add validation for relationships
                relationships.forEach(rel => {
                    if (rel.relationship_type === 'one_to_one' || rel.relationship_type === 'many_to_many') {
                        shape[rel.name] = Yup.array().of(Yup.number());
                    } else if (rel.relationship_type === 'one_to_many') {
                        shape[rel.name] = Yup.array().of(Yup.number());
                    }
                });

                setValidationSchema(Yup.object().shape(shape));

                // Fetch options for enum and picklist fields
                tableSchema.columns.forEach(column => {
                    if (column.data_type === 'enum' && column.enum_id) {
                        const enumItem = enums?.find(e => e.id === column.enum_id);
                        if (enumItem) {
                            setOptions(prev => ({
                                ...prev,
                                [column.name]: enumItem.values.map(val => ({label: val.value, value: val.value})),
                            }));
                        }
                    } else if (column.data_type === 'picklist') {
                        // Define picklist options if applicable
                        // For example purposes, using static options
                        setOptions(prev => ({
                            ...prev,
                            [column.name]: [
                                {label: 'Option 1', value: 'option1'},
                                {label: 'Option 2', value: 'option2'},
                            ],
                        }));
                    }
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchedSchema, tableName, enums]);

    const formik = useFormik({
        initialValues: initialValues,
        enableReinitialize: true,
        validationSchema: validationSchema,
        onSubmit: async values => {
            try {
                if (mode === 'create') {
                    const response = await axios.post(`/records/${tableName}/`, values);
                    // Handle relationships if any
                    handleRelationships(response.data.id, values);
                } else if (mode === 'update' && recordId) {
                    const response = await axios.put(`/records/${tableName}/${recordId}/`, values);
                    // Handle relationships if any
                    handleRelationships(recordId, values);
                }
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error('Error submitting form:', error);
                // Optionally, display error messages to users
            }
        },
    });

    const handleRelationships = async (recordId: number, values: any) => {
        // Iterate over relationships and update accordingly
        for (const rel of relationships) {
            const relatedRecords = values[rel.name];
            if (relatedRecords) {
                try {
                    if (rel.relationship_type === 'many_to_many' || rel.relationship_type === 'one_to_many') {
                        await axios.post(`/relationships/${rel.id}/records/`, {
                            record_id: recordId,
                            related_ids: relatedRecords,
                        });
                    } else if (rel.relationship_type === 'one_to_one') {
                        await axios.put(`/relationships/${rel.id}/records/`, {
                            record_id: recordId,
                            related_id: relatedRecords[0], // Assuming single related_id
                        });
                    }
                } catch (error) {
                    console.error(`Error handling relationship ${rel.name}:`, error);
                }
            }
        }
    };

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
                            <FormHelperText error>{formik.errors[name]}</FormHelperText>
                        )}
                    </FormControl>
                );
            default:
                return null;
        }
    };

    const renderRelationshipField = (relationship: RelationshipRead) => {
        const {name, relationship_type} = relationship;
        const isMultiple = relationship_type === 'many_to_many' || relationship_type === 'one_to_many';
        const [relatedOptions, setRelatedOptions] = useState<SelectOption[]>([]);

        useEffect(() => {
            const fetchRelatedOptions = async () => {
                try {
                    const response = await axios.get(`/records/${relationship.to_table}/`);
                    const options = response.data.map((record: Record) => ({
                        label: `ID: ${record.id} - ${record.name || 'N/A'}`,
                        value: record.id,
                    }));
                    setRelatedOptions(options);
                } catch (error) {
                    console.error(`Error fetching related records for ${name}:`, error);
                }
            };
            fetchRelatedOptions();
        }, [relationship.to_table, name]);

        return (
            <FormControl fullWidth margin="normal" key={name}>
                <InputLabel>{name}</InputLabel>
                <Select
                    label={name}
                    name={name}
                    multiple={isMultiple}
                    value={formik.values[name] || (isMultiple ? [] : '')}
                    onChange={formik.handleChange}
                    renderValue={selected =>
                        isMultiple
                            ? selected
                                  .map((id: number) => relatedOptions.find(opt => opt.value === id)?.label)
                                  .join(', ')
                            : relatedOptions.find(opt => opt.value === selected)?.label
                    }>
                    {relatedOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
                {formik.touched[name] && formik.errors[name] && (
                    <FormHelperText error>{formik.errors[name]}</FormHelperText>
                )}
            </FormControl>
        );
    };

    return (
        <form onSubmit={formik.handleSubmit}>
            {schema[tableName]?.columns.map(column => renderField(column))}
            {relationships.map(rel => renderRelationshipField(rel))}
            <Button color="primary" variant="contained" type="submit" style={{marginTop: '1rem'}}>
                {mode === 'create' ? 'Create' : 'Update'}
            </Button>
        </form>
    );
};

export default DynamicForm;
