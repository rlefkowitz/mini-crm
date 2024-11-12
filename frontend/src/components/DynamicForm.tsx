import React, {useEffect, useState, useMemo} from 'react';
import {useFormik} from 'formik';
import {
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    CircularProgress,
} from '@mui/material';
import axios from '../utils/axiosConfig';
import debounce from 'lodash.debounce';
import useSchema from '../hooks/useSchema';

interface DynamicFormProps {
    tableName: string;
    mode: 'create' | 'update';
    initialValues?: any;
    recordId?: number;
    onSuccess?: () => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({tableName, mode, initialValues = {}, recordId, onSuccess}) => {
    const {schema, enums} = useSchema();
    const [columns, setColumns] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (schema && schema[tableName]) {
            setColumns(schema[tableName].columns);
            setLoading(false);
        }
    }, [schema, tableName]);

    const formik = useFormik({
        initialValues: initialValues.data || {},
        enableReinitialize: true,
        onSubmit: async values => {
            try {
                if (mode === 'create') {
                    await axios.post(`/records/${tableName}/`, {data: values});
                } else if (mode === 'update' && recordId) {
                    await axios.put(`/records/${tableName}/${recordId}/`, {data: values});
                }
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error('Error submitting form:', error);
            }
        },
    });

    const renderField = (column: any) => {
        const {name, data_type, is_list, enum_id, reference_table} = column;

        if (data_type === 'reference' && reference_table) {
            return (
                <ReferenceField
                    key={name}
                    name={name}
                    referenceTableName={reference_table.name}
                    isList={is_list}
                    formik={formik}
                />
            );
        }

        if (data_type === 'enum' && enum_id) {
            const enumOptions = enums?.find(e => e.id === enum_id)?.values || [];
            return (
                <FormControl fullWidth margin="normal" key={name}>
                    <InputLabel>{name}</InputLabel>
                    <Select
                        id={name}
                        name={name}
                        label={name}
                        value={formik.values[name] || ''}
                        onChange={formik.handleChange}>
                        {enumOptions.map((option: any) => (
                            <MenuItem key={option.id} value={option.value}>
                                {option.value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );
        }

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
                        margin="normal"
                    />
                );
            default:
                return null;
        }
    };

    if (loading) return <div>Loading form...</div>;

    return (
        <form onSubmit={formik.handleSubmit}>
            {columns.map(column => renderField(column))}
            <Button color="primary" variant="contained" type="submit" style={{marginTop: '1rem'}}>
                {mode === 'create' ? 'Create' : 'Update'}
            </Button>
        </form>
    );
};

interface ReferenceFieldProps {
    name: string;
    referenceTableName: string;
    isList: boolean;
    formik: any;
}

const ReferenceField: React.FC<ReferenceFieldProps> = ({name, referenceTableName, isList, formik}) => {
    const [options, setOptions] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const loading = open && options.length === 0;

    const fetchOptions = async (search: string) => {
        try {
            const response = await axios.get(`/records/${referenceTableName}/search/`, {
                params: {query: search},
            });
            setOptions(response.data);
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    // Debounce the fetchOptions function
    const debouncedFetchOptions = useMemo(() => debounce(fetchOptions, 300), [referenceTableName]);

    useEffect(() => {
        if (inputValue && open) {
            debouncedFetchOptions(inputValue);
        } else {
            setOptions([]);
        }

        return () => {
            debouncedFetchOptions.cancel();
        };
    }, [inputValue, open, debouncedFetchOptions]);

    return (
        <Autocomplete
            multiple={isList}
            id={name}
            options={options}
            getOptionLabel={option => option.data?.name || `Record ${option.id}`}
            onInputChange={(event, value) => setInputValue(value)}
            onChange={(event, value) => {
                const ids = isList ? (value as any[]).map((item: any) => item.id) : (value as any)?.id;
                formik.setFieldValue(name, ids);
            }}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            loading={loading}
            renderInput={params => (
                <TextField
                    {...params}
                    label={name}
                    margin="normal"
                    variant="outlined"
                    fullWidth
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
};

export default DynamicForm;
