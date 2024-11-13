import React from 'react';
import {
    Typography,
    TextField,
    Grid,
    Checkbox,
    FormControlLabel,
    Select,
    MenuItem,
    ListItemText,
    FormControl,
    InputLabel,
} from '@mui/material';
import {LinkColumnSchema, Enum} from '../types';
import useSchema from '../hooks/useSchema';

/**
 * Props for the LinkDataFields component.
 */
interface LinkDataFieldsProps {
    parentName: string;
    referenceId: number;
    linkTableColumns: LinkColumnSchema[];
    formik: any;
}

const LinkDataFields: React.FC<LinkDataFieldsProps> = ({parentName, referenceId, linkTableColumns, formik}) => {
    const {enums: allEnums} = useSchema();

    return (
        <Grid container spacing={2}>
            {linkTableColumns.map(linkCol => {
                const fieldName = `${parentName}.${referenceId}.${linkCol.name}`;
                const value = formik.values[parentName]?.[referenceId]?.[linkCol.name] || '';
                const error =
                    formik.touched[parentName]?.[referenceId]?.[linkCol.name] &&
                    Boolean(formik.errors[parentName]?.[referenceId]?.[linkCol.name]);
                const helperText =
                    formik.touched[parentName]?.[referenceId]?.[linkCol.name] &&
                    formik.errors[parentName]?.[referenceId]?.[linkCol.name];

                // Determine input type based on data_type
                let inputType = 'text';
                let isCheckbox = false;
                switch (linkCol.data_type) {
                    case 'integer':
                        inputType = 'number';
                        break;
                    case 'currency':
                        inputType = 'number';
                        break;
                    case 'boolean':
                        isCheckbox = true;
                        break;
                    case 'date':
                        inputType = 'date';
                        break;
                    case 'datetime':
                        inputType = 'datetime-local';
                        break;
                    case 'enum':
                    case 'picklist':
                        inputType = 'select';
                        break;
                    default:
                        inputType = 'text';
                }

                // If the field is an enum, fetch its specific enum data
                let enumOptions: string[] = [];
                if (linkCol.data_type === 'enum' || linkCol.data_type === 'picklist') {
                    const enumData: Enum | undefined = allEnums?.find(e => e.id === linkCol.enum_id);
                    enumOptions = enumData ? enumData.values.map(v => v.value) : [];
                }

                if (isCheckbox) {
                    return (
                        <Grid item xs={12} sm={6} key={linkCol.name}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={value}
                                        onChange={e => {
                                            formik.setFieldValue(fieldName, e.target.checked);
                                        }}
                                        name={fieldName}
                                    />
                                }
                                label={linkCol.required ? `${linkCol.name} *` : linkCol.name}
                            />
                            {error && <span style={{color: 'red', fontSize: '0.8rem'}}>{helperText}</span>}
                        </Grid>
                    );
                }

                if (inputType === 'select') {
                    return (
                        <Grid item xs={12} sm={6} key={linkCol.name}>
                            <FormControl fullWidth margin="dense" error={error}>
                                <InputLabel>
                                    {linkCol.required && <span style={{color: 'red'}}>*</span>} {linkCol.name}
                                </InputLabel>
                                <Select
                                    multiple={linkCol.is_list}
                                    name={fieldName}
                                    value={value || (linkCol.is_list ? [] : '')}
                                    onChange={formik.handleChange}
                                    renderValue={(selected: any) => (linkCol.is_list ? selected.join(', ') : selected)}
                                    // Prevent selecting duplicate items
                                    MenuProps={{
                                        PaperProps: {
                                            style: {
                                                maxHeight: 48 * 4.5 + 8,
                                                width: 250,
                                            },
                                        },
                                    }}>
                                    {enumOptions.map((option: string, idx: number) => (
                                        <MenuItem
                                            key={idx}
                                            value={option}
                                            disabled={
                                                linkCol.is_list &&
                                                formik.values[parentName]?.[referenceId]?.[linkCol.name]?.includes(
                                                    option
                                                )
                                            }>
                                            {linkCol.is_list && (
                                                <Checkbox
                                                    checked={formik.values[parentName]?.[referenceId]?.[
                                                        linkCol.name
                                                    ]?.includes(option)}
                                                />
                                            )}
                                            <ListItemText primary={option} />
                                        </MenuItem>
                                    ))}
                                </Select>
                                {error && (
                                    <Typography variant="caption" color="error">
                                        {helperText}
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>
                    );
                }

                return (
                    <Grid item xs={12} sm={6} key={linkCol.name}>
                        <TextField
                            fullWidth
                            type={inputType}
                            name={fieldName}
                            label={linkCol.required ? `${linkCol.name} *` : linkCol.name}
                            value={value}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            required={linkCol.required}
                            error={error}
                            helperText={helperText}
                            InputLabelProps={
                                inputType === 'date' || inputType === 'datetime-local' ? {shrink: true} : {}
                            }
                        />
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default LinkDataFields;
