import React, {useEffect, useState, useMemo} from 'react';
import {useFormik} from 'formik';
import {
    Box,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
    Grid,
    FormControlLabel,
    Typography,
} from '@mui/material';
import axios from '../utils/axiosConfig';
import useSchema from '../hooks/useSchema';
import {DatePicker, DateTimePicker} from '@mui/x-date-pickers';
import {AdapterDateFns} from '@mui/x-date-pickers/AdapterDateFns';
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider';
import * as Yup from 'yup';
import {ColumnSchema, LinkColumnSchema, Enum} from '../types';
import ReferenceField from './ReferenceField'; // Existing Complex Component
import LinkDataFields from './LinkDataFields'; // Existing Complex Component

/**
 * Props for the DynamicForm component.
 */
interface DynamicFormProps {
    tableName: string;
    mode: 'create' | 'update';
    initialValues?: any;
    recordId?: number;
    onSuccess?: () => void;
}

/**
 * Props for the DatePickerField component.
 */
interface DatePickerFieldProps {
    name: string;
    label: string;
    formik: any;
    required: boolean;
}

/**
 * Props for the DateTimePickerField component.
 */
interface DateTimePickerFieldProps {
    name: string;
    label: string;
    formik: any;
    required: boolean;
}

/**
 * Props for the ListField component.
 */
interface ListFieldProps {
    name: string;
    dataType: string;
    formik: any;
    required: boolean;
}

const DynamicForm: React.FC<DynamicFormProps> = ({tableName, mode, initialValues = {}, recordId, onSuccess}) => {
    const {schema, enums: allEnums} = useSchema();
    const [columns, setColumns] = useState<ColumnSchema[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [generalError, setGeneralError] = useState<string>('');

    useEffect(() => {
        if (schema && schema[tableName]) {
            setColumns(schema[tableName].columns);
            setLoading(false);
        }
    }, [schema, tableName]);

    // Dynamically build validation schema based on columns
    const validationSchema = useMemo(() => {
        const shape: any = {};

        columns.forEach(column => {
            let validator: any = null;
            switch (column.data_type) {
                case 'string':
                    validator = Yup.string();
                    if (column.required) validator = validator.required(`${column.name} is required`);
                    break;
                case 'integer':
                    validator = Yup.number().integer(`${column.name} must be an integer`);
                    if (column.required) validator = validator.required(`${column.name} is required`);
                    break;
                case 'currency':
                    validator = Yup.number().min(0, `${column.name} must be at least 0`);
                    if (column.required) validator = validator.required(`${column.name} is required`);
                    break;
                case 'boolean':
                    validator = Yup.boolean();
                    if (column.required) validator = validator.required(`${column.name} is required`);
                    break;
                case 'date':
                case 'datetime':
                    validator = Yup.date();
                    if (column.required) validator = validator.required(`${column.name} is required`);
                    break;
                case 'enum':
                case 'picklist':
                    const enumData = allEnums?.find((e: Enum) => e.id === column.enum_id);
                    const enumValues = enumData ? enumData.values.map(v => v.value) : [];
                    validator = Yup.string().oneOf(enumValues, `${column.name} must be a valid option`);
                    if (column.required) validator = validator.required(`${column.name} is required`);
                    break;
                case 'reference':
                    validator = Yup.mixed();
                    if (column.required) validator = validator.required(`${column.name} is required`);
                    break;
                default:
                    validator = Yup.mixed();
            }

            if (column.is_list) {
                shape[column.name] = Yup.array()
                    .of(validator)
                    .test('no-duplicates', `${column.name} must not contain duplicates`, (list: any[]) => {
                        if (!list) return true;
                        const uniqueSet = new Set(list);
                        return uniqueSet.size === list.length;
                    });
                if (column.required) {
                    shape[column.name] = shape[column.name].min(1, `${column.name} must have at least one item`);
                }
            } else {
                shape[column.name] = validator;
            }

            // Handle link table columns for reference fields
            if (column.data_type === 'reference' && column.reference_link_table_id) {
                const linkTables = schema?.[tableName]?.link_tables || [];
                const linkTable = linkTables.find((lt: any) => lt.id === column.reference_link_table_id);
                if (linkTable) {
                    linkTable.columns.forEach((linkColumn: LinkColumnSchema) => {
                        let linkValidator: any = null;
                        switch (linkColumn.data_type) {
                            case 'string':
                                linkValidator = Yup.string();
                                if (linkColumn.required)
                                    linkValidator = linkValidator.required(`${linkColumn.name} is required`);
                                break;
                            case 'integer':
                                linkValidator = Yup.number().integer(`${linkColumn.name} must be an integer`);
                                if (linkColumn.required)
                                    linkValidator = linkValidator.required(`${linkColumn.name} is required`);
                                break;
                            case 'currency':
                                linkValidator = Yup.number().min(0, `${linkColumn.name} must be at least 0`);
                                if (linkColumn.required)
                                    linkValidator = linkValidator.required(`${linkColumn.name} is required`);
                                break;
                            case 'boolean':
                                linkValidator = Yup.boolean();
                                if (linkColumn.required)
                                    linkValidator = linkValidator.required(`${linkColumn.name} is required`);
                                break;
                            case 'date':
                            case 'datetime':
                                linkValidator = Yup.date();
                                if (linkColumn.required)
                                    linkValidator = linkValidator.required(`${linkColumn.name} is required`);
                                break;
                            case 'enum':
                            case 'picklist':
                                const linkEnumData = allEnums?.find((e: Enum) => e.id === linkColumn.enum_id);
                                const linkEnumValues = linkEnumData ? linkEnumData.values.map(v => v.value) : [];
                                linkValidator = Yup.string().oneOf(
                                    linkEnumValues,
                                    `${linkColumn.name} must be a valid option`
                                );
                                if (linkColumn.required)
                                    linkValidator = linkValidator.required(`${linkColumn.name} is required`);
                                break;
                            default:
                                linkValidator = Yup.mixed();
                        }

                        const key = `${column.name}_link_data.${linkColumn.name}`;
                        if (linkColumn.is_list) {
                            shape[key] = Yup.array()
                                .of(linkValidator)
                                .test(
                                    'no-duplicates',
                                    `${linkColumn.name} must not contain duplicates`,
                                    (list: any[]) => {
                                        if (!list) return true;
                                        const uniqueSet = new Set(list);
                                        return uniqueSet.size === list.length;
                                    }
                                );
                            if (linkColumn.required) {
                                shape[key] = shape[key].min(1, `${linkColumn.name} must have at least one item`);
                            }
                        } else {
                            shape[key] = linkValidator;
                        }
                    });
                }
            }
        });

        return Yup.object().shape(shape);
    }, [columns, allEnums, schema, tableName]);

    const formik = useFormik({
        initialValues: initialValues || {},
        validationSchema: validationSchema,
        enableReinitialize: true,
        onSubmit: async values => {
            try {
                // Modify the data to include link data appropriately
                const processedValues = {...values};

                // Handle reference fields with link data
                columns.forEach(column => {
                    if (column.data_type === 'reference' && column.reference_link_table_id) {
                        const linkDataKey = `${column.name}_link_data`;
                        if (values[linkDataKey]) {
                            processedValues[linkDataKey] = values[linkDataKey];
                        }
                    }
                });

                if (mode === 'create') {
                    await axios.post(`/records/${tableName}/`, {data: processedValues});
                } else if (mode === 'update' && recordId) {
                    await axios.put(`/records/${tableName}/${recordId}/`, {data: processedValues});
                }
                if (onSuccess) onSuccess();
            } catch (error: any) {
                console.error('Error submitting form:', error);
                setGeneralError(error.response?.data?.detail || 'Failed to submit the form.');
            }
        },
    });

    /**
     * Renders a form field based on the column's data type.
     */
    const renderField = (column: ColumnSchema) => {
        const {name, data_type, is_list, enum_id, required} = column;
        const isError = formik.touched[name] && Boolean(formik.errors[name]);

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
                    recordId={mode === 'update' ? recordId : undefined} // Pass recordId only in update mode
                />
            );
        }

        if (data_type === 'enum' || data_type === 'picklist') {
            const enumData = allEnums?.find((e: Enum) => e.id === enum_id);
            const enumOptions = enumData ? enumData.values.map(v => v.value) : [];
            return (
                <FormControl fullWidth margin="normal" key={name} error={isError}>
                    <InputLabel>
                        {required && <span style={{color: 'red'}}>*</span>} {name}
                    </InputLabel>
                    <Select
                        id={name}
                        name={name}
                        label={`${required ? '*' : ''} ${name}`}
                        multiple={is_list}
                        value={formik.values[name] || (is_list ? [] : '')}
                        onChange={formik.handleChange}
                        renderValue={(selected: any) => (is_list ? selected.join(', ') : selected)}
                        // Prevent selecting duplicate items
                        MenuProps={{
                            PaperProps: {
                                style: {
                                    maxHeight: 48 * 4.5 + 8,
                                    width: 250,
                                },
                            },
                        }}>
                        {enumOptions.map((option: any, idx: number) => (
                            <MenuItem
                                key={idx}
                                value={option}
                                disabled={is_list && formik.values[name]?.includes(option)}>
                                {is_list && <Checkbox checked={formik.values[name]?.includes(option)} />}
                                <ListItemText primary={option} />
                            </MenuItem>
                        ))}
                    </Select>
                    {isError && (
                        <Typography variant="caption" color="error">
                            {formik.errors[name] as string}
                        </Typography>
                    )}
                </FormControl>
            );
        }

        switch (data_type) {
            case 'string':
                if (is_list) {
                    return (
                        <ListField key={name} name={name} dataType={data_type} formik={formik} required={required} />
                    );
                } else {
                    return (
                        <TextField
                            key={name}
                            fullWidth
                            id={name}
                            name={name}
                            label={required ? `${name} *` : name}
                            type="text"
                            value={formik.values[name] || ''}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            margin="normal"
                            error={isError}
                            helperText={isError ? (formik.errors[name] as string) : ''}
                        />
                    );
                }
            case 'integer':
            case 'currency':
                if (is_list) {
                    return (
                        <ListField key={name} name={name} dataType={data_type} formik={formik} required={required} />
                    );
                } else {
                    return (
                        <TextField
                            key={name}
                            fullWidth
                            id={name}
                            name={name}
                            label={required ? `${name} *` : name}
                            type="number"
                            value={formik.values[name] || ''}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            margin="normal"
                            error={isError}
                            helperText={isError ? (formik.errors[name] as string) : ''}
                            InputProps={{
                                inputProps: {
                                    step: data_type === 'currency' ? '0.01' : '1',
                                },
                            }}
                        />
                    );
                }
            case 'boolean':
                return (
                    <FormControlLabel
                        key={name}
                        control={
                            <Checkbox
                                id={name}
                                name={name}
                                checked={formik.values[name] || false}
                                onChange={formik.handleChange}
                            />
                        }
                        label={required ? `${name} *` : name}
                    />
                );
            case 'date':
                return (
                    <DatePickerField
                        key={name}
                        name={name}
                        label={required ? `${name} *` : name}
                        formik={formik}
                        required={required}
                    />
                );
            case 'datetime':
                return (
                    <DateTimePickerField
                        key={name}
                        name={name}
                        label={required ? `${name} *` : name}
                        formik={formik}
                        required={required}
                    />
                );
            default:
                return null;
        }
    };

    if (loading) return <Typography>Loading form...</Typography>;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={2}>
                    {columns.map(column => (
                        <Grid item xs={12} sm={6} key={column.name}>
                            {renderField(column)}
                        </Grid>
                    ))}
                </Grid>
                {generalError && (
                    <Typography color="error" variant="body2" sx={{mt: 2}}>
                        {generalError}
                    </Typography>
                )}
                <Button color="primary" variant="contained" type="submit" sx={{mt: 2}}>
                    {mode === 'create' ? 'Create' : 'Update'}
                </Button>
            </form>
        </LocalizationProvider>
    );
};

/**
 * Renders a date picker field.
 */
const DatePickerField: React.FC<DatePickerFieldProps> = ({name, label, formik, required}) => {
    const handleChange = (value: Date | null) => {
        formik.setFieldValue(name, value);
    };

    return (
        <DatePicker
            label={label}
            value={formik.values[name] || null}
            onChange={handleChange}
            renderInput={params => (
                <TextField
                    {...params}
                    fullWidth
                    required={required}
                    error={formik.touched[name] && Boolean(formik.errors[name])}
                    helperText={formik.touched[name] && formik.errors[name] ? (formik.errors[name] as string) : ''}
                    margin="normal"
                />
            )}
        />
    );
};

/**
 * Renders a datetime picker field.
 */
const DateTimePickerField: React.FC<DateTimePickerFieldProps> = ({name, label, formik, required}) => {
    const handleChange = (value: Date | null) => {
        formik.setFieldValue(name, value);
    };

    return (
        <DateTimePicker
            label={label}
            value={formik.values[name] || null}
            onChange={handleChange}
            renderInput={params => (
                <TextField
                    {...params}
                    fullWidth
                    required={required}
                    error={formik.touched[name] && Boolean(formik.errors[name])}
                    helperText={formik.touched[name] && formik.errors[name] ? (formik.errors[name] as string) : ''}
                    margin="normal"
                />
            )}
        />
    );
};

/**
 * Renders a list field with add/remove functionality.
 */
const ListField: React.FC<ListFieldProps> = ({name, dataType, formik, required}) => {
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

    const isError = formik.touched[name] && Boolean(formik.errors[name]);

    return (
        <div>
            <Typography variant="subtitle1" sx={{mb: 1}}>
                {required && <span style={{color: 'red'}}>*</span>} {name}
            </Typography>
            {values.map((value, index) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                    <TextField
                        fullWidth
                        name={`${name}[${index}]`}
                        value={value}
                        onChange={e => handleChange(index, e)}
                        type={dataType === 'integer' || dataType === 'currency' ? 'number' : 'text'}
                        InputProps={{
                            inputProps: {
                                step: dataType === 'currency' ? '0.01' : '1',
                            },
                        }}
                        onBlur={formik.handleBlur}
                        error={isError && Boolean(value)}
                        helperText={
                            isError && formik.errors[name] && typeof formik.errors[name] === 'string'
                                ? (formik.errors[name] as string)
                                : ''
                        }
                    />
                    <Button onClick={() => handleRemove(index)} color="secondary" sx={{ml: 1}}>
                        Remove
                    </Button>
                </Box>
            ))}
            <Button onClick={handleAdd} variant="outlined" size="small">
                Add {name}
            </Button>
            {isError && typeof formik.errors[name] === 'string' && (
                <Typography variant="caption" color="error" sx={{display: 'block', mt: 1}}>
                    {formik.errors[name]}
                </Typography>
            )}
        </div>
    );
};

export default DynamicForm;
