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
    Checkbox,
    ListItemText,
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
        const {name, data_type, is_list, enum_id} = column;

        if (data_type === 'reference') {
            return (
                <ReferenceField
                    key={name}
                    name={name}
                    column={column}
                    isList={is_list}
                    formik={formik}
                    schema={schema}
                    parentTableName={tableName}
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
                        multiple={is_list}
                        value={formik.values[name] || (is_list ? [] : '')}
                        onChange={formik.handleChange}
                        renderValue={(selected: any) => (is_list ? selected.join(', ') : selected)}>
                        {enumOptions.map((option: any) => (
                            <MenuItem key={option.id} value={option.value}>
                                {is_list && <Checkbox checked={formik.values[name]?.includes(option.value)} />}
                                <ListItemText primary={option.value} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );
        }

        if (data_type === 'string' || data_type === 'integer' || data_type === 'currency') {
            if (is_list) {
                return <ListField key={name} name={name} dataType={data_type} formik={formik} />;
            } else {
                return (
                    <TextField
                        key={name}
                        fullWidth
                        id={name}
                        name={name}
                        label={name}
                        type={data_type === 'string' ? 'text' : 'number'}
                        value={formik.values[name] || ''}
                        onChange={formik.handleChange}
                        margin="normal"
                    />
                );
            }
        }

        return null;
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
    column: any;
    isList: boolean;
    formik: any;
    schema: any;
    parentTableName: string;
}

const ReferenceField: React.FC<ReferenceFieldProps> = ({name, column, isList, formik, schema, parentTableName}) => {
    const [options, setOptions] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const loading = open && options.length === 0;

    const linkTables = schema[parentTableName]?.link_tables || [];
    const linkTable = linkTables.find((lt: any) => lt.id === column.reference_link_table_id);

    const otherTableName = linkTable?.from_table === parentTableName ? linkTable.to_table : linkTable?.from_table;

    const fetchOptions = async (search: string) => {
        try {
            const response = await axios.get(`/records/${otherTableName}/search/`, {
                params: {query: search},
            });
            setOptions(response.data);
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    // Debounce the fetchOptions function
    const debouncedFetchOptions = useMemo(() => debounce(fetchOptions, 300), [otherTableName]);

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

    const renderLinkTableFields = () => {
        if (!linkTable || !linkTable.columns) return null;

        return linkTable.columns.map((col: any) => {
            const fieldName = `${name}_link_data.${col.name}`;
            return (
                <TextField
                    key={fieldName}
                    fullWidth
                    id={fieldName}
                    name={fieldName}
                    label={`${name} - ${col.name}`}
                    value={formik.values[name + '_link_data']?.[col.name] || ''}
                    onChange={formik.handleChange}
                    margin="normal"
                />
            );
        });
    };

    return (
        <>
            <Autocomplete
                multiple={isList}
                id={name}
                options={options}
                getOptionLabel={option => {
                    console.log('option', option);
                    return option.data?.name || option.data?.Name || `Record ${option.id}`;
                }}
                onInputChange={(event, value) => setInputValue(value)}
                onChange={(event, value) => {
                    if (isList) {
                        const ids = (value as any[]).map((item: any) => item.id);
                        formik.setFieldValue(name, ids);
                    } else {
                        formik.setFieldValue(name, (value as any)?.id || null);
                    }
                }}
                value={
                    isList
                        ? options.filter(option => formik.values[name]?.includes(option.id))
                        : options.find(option => option.id === formik.values[name]) || null
                }
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
            {renderLinkTableFields()}
        </>
    );
};

interface ListFieldProps {
    name: string;
    dataType: string;
    formik: any;
}

const ListField: React.FC<ListFieldProps> = ({name, dataType, formik}) => {
    const [values, setValues] = useState<any[]>(formik.values[name] || ['']);

    useEffect(() => {
        formik.setFieldValue(name, values);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values]);

    const handleChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const newValues = [...values];
        newValues[index] = event.target.value;
        setValues(newValues);
    };

    const handleAdd = () => {
        setValues([...values, '']);
    };

    const handleRemove = (index: number) => {
        const newValues = values.filter((_, i) => i !== index);
        setValues(newValues);
    };

    return (
        <div>
            <label>{name}</label>
            {values.map((value, index) => (
                <div key={index} style={{display: 'flex', alignItems: 'center', marginBottom: '8px'}}>
                    <TextField
                        fullWidth
                        name={`${name}[${index}]`}
                        value={value}
                        onChange={event => handleChange(index, event)}
                        type={dataType === 'integer' || dataType === 'currency' ? 'number' : 'text'}
                        InputProps={{
                            inputProps: {
                                step: dataType === 'currency' ? '0.01' : '1',
                            },
                        }}
                        margin="normal"
                    />
                    <Button onClick={() => handleRemove(index)}>Remove</Button>
                </div>
            ))}
            <Button onClick={handleAdd}>Add {name}</Button>
        </div>
    );
};

export default DynamicForm;
