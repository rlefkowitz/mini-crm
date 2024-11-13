import React, {useEffect, useState, useMemo} from 'react';
import {Autocomplete, TextField, CircularProgress, Chip, Typography, Box} from '@mui/material';
import debounce from 'lodash.debounce';
import axios from '../utils/axiosConfig';
import {ColumnSchema, LinkColumnSchema} from '../types';
import LinkDataFields from './LinkDataFields';

/**
 * Props for the ReferenceField component.
 */
interface ReferenceFieldProps {
    name: string;
    column: ColumnSchema;
    isList: boolean;
    formik: any;
    schema: any;
    parentTableName: string;
    recordId?: number; // Added this line
}

const ReferenceField: React.FC<ReferenceFieldProps> = ({
    name,
    column,
    isList,
    formik,
    schema,
    parentTableName,
    recordId, // Added this line
}) => {
    const [options, setOptions] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const loading = open && options.length === 0;

    // Determine the other table name based on the link table
    const linkTables = schema[parentTableName]?.link_tables || [];
    const linkTable = linkTables.find((lt: any) => lt.id === column.reference_link_table_id);

    let otherTableName: string | undefined;

    if (linkTable) {
        otherTableName = linkTable.from_table === parentTableName ? linkTable.to_table : linkTable.from_table;
    }

    // Get display format from schema
    const otherTableSchema = schema?.[otherTableName || ''];
    const displayFormat = otherTableSchema?.display_format || '{id}';
    const displayFormatSecondary = otherTableSchema?.display_format_secondary || '';

    // Function to generate display value
    const formatDisplayValue = (format: string, data: any) => {
        return format.replace(/{(.*?)}/g, (match, key) => {
            return data?.data?.[key.trim()] || '';
        });
    };

    const generateDisplayValue = (option: any) => {
        return formatDisplayValue(displayFormat, option);
    };

    const generateDisplayValueSecondary = (option: any) => {
        return option.display_value_secondary || formatDisplayValue(displayFormatSecondary, option);
    };

    // Fetch selected options to ensure they are present in the options list
    useEffect(() => {
        if (!otherTableName) return;

        const fetchSelectedOptions = async () => {
            try {
                if (isList) {
                    const selectedIds: number[] = formik.values[name] || [];
                    const missingIds = selectedIds.filter(id => !options.some(option => option.id === id));
                    if (missingIds.length > 0) {
                        const response = await axios.get(`/records/${otherTableName}/`, {
                            params: {ids: missingIds.join(',')},
                        });
                        setOptions(prev => [...prev, ...response.data]);
                    }
                } else {
                    const selectedId: number | null = formik.values[name] || null;
                    if (selectedId && !options.some(option => option.id === selectedId)) {
                        const response = await axios.get(`/records/${otherTableName}/${selectedId}/`);
                        setOptions(prev => [...prev, response.data]);
                    }
                }
            } catch (error) {
                console.error('Error fetching selected reference options:', error);
            }
        };

        fetchSelectedOptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otherTableName, isList, formik.values[name]]);

    // Fetch options based on user input
    const fetchOptions = async (search: string) => {
        if (!otherTableName) return;
        try {
            const response = await axios.get(`/records/${otherTableName}/search/`, {
                params: {query: search},
            });
            setOptions(response.data);
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    // Debounce the fetchOptions function to limit API calls
    const debouncedFetchOptions = useMemo(() => debounce(fetchOptions, 300), [otherTableName]);

    useEffect(() => {
        if (open) {
            debouncedFetchOptions(inputValue);
        }

        return () => {
            debouncedFetchOptions.cancel();
        };
    }, [inputValue, open, debouncedFetchOptions]);

    // Handle changes in selection
    const handleChange = (event: any, value: any) => {
        if (isList) {
            const ids = value.map((item: any) => item.id);
            formik.setFieldValue(name, ids);

            // Update link data for each selected reference
            const linkData: {[key: number]: any} = {};
            value.forEach((item: any) => {
                linkData[item.id] = {};
                // Initialize link data if not present
                column.link_table_columns?.forEach((linkCol: LinkColumnSchema) => {
                    linkData[item.id][linkCol.name] =
                        formik.values[`${name}_link_data`]?.[item.id]?.[linkCol.name] || '';
                });
            });
            formik.setFieldValue(`${name}_link_data`, linkData);
        } else {
            formik.setFieldValue(name, value ? value.id : null);

            // Initialize or reset link data
            if (value) {
                const linkData: {[key: string]: any} = {};
                column.link_table_columns?.forEach((linkCol: LinkColumnSchema) => {
                    linkData[linkCol.name] = formik.values[`${name}_link_data`]?.[linkCol.name] || '';
                });
                formik.setFieldValue(`${name}_link_data`, linkData);
            } else {
                formik.setFieldValue(`${name}_link_data`, {});
            }
        }
        formik.setFieldTouched(name, true, true);
    };

    // Handle input value changes
    const handleInputChange = (event: any, value: string) => {
        setInputValue(value);
    };

    // Map Formik's values to the Autocomplete's value prop
    const selectedOptions = useMemo(() => {
        if (isList) {
            const selectedIds: number[] = formik.values[name] || [];
            const selectedItems = selectedIds
                .map(id => options.find(option => option.id === id))
                .filter(item => item !== undefined);
            return selectedItems;
        } else {
            const selectedId: number | null = formik.values[name] || null;
            return options.find(option => option.id === selectedId) || null;
        }
    }, [formik.values[name], isList, options]);

    // Fetch link table columns if reference_link_table_id is set
    let linkTableColumns: LinkColumnSchema[] = [];
    if (column.reference_link_table_id && linkTable) {
        linkTableColumns = linkTable.columns || [];
    }

    return (
        <>
            <Autocomplete
                multiple={isList}
                id={name}
                options={options}
                getOptionLabel={(option: any) => generateDisplayValue(option)}
                isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                onInputChange={handleInputChange}
                onChange={handleChange}
                value={selectedOptions}
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                loading={loading}
                renderOption={(props, option) => {
                    return (
                        <li {...props}>
                            <Box sx={{display: 'flex', flexDirection: 'row'}}>
                                <Typography>{generateDisplayValue(option)}</Typography>
                                {displayFormatSecondary && (
                                    <Typography
                                        style={{
                                            fontSize: 'small',
                                            color: 'gray',
                                            marginLeft: '0.5rem',
                                        }}>
                                        {generateDisplayValueSecondary(option)}
                                    </Typography>
                                )}
                            </Box>
                            {/* <div>
                                <div>{generateDisplayValue(option)}</div>
                                {displayFormatSecondary && (
                                    <div
                                        style={{
                                            fontSize: 'small',
                                            color: 'gray',
                                        }}>
                                        {generateDisplayValueSecondary(option)}
                                    </div>
                                )}
                            </div> */}
                        </li>
                    );
                }}
                renderInput={params => (
                    <TextField
                        {...params}
                        label={column.required ? `${name} *` : name}
                        margin="normal"
                        variant="outlined"
                        fullWidth
                        required={column.required}
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                        error={formik.touched[name] && Boolean(formik.errors[name])}
                        helperText={
                            formik.touched[name] && formik.errors[name]
                                ? typeof formik.errors[name] === 'string'
                                    ? formik.errors[name]
                                    : ''
                                : ''
                        }
                    />
                )}
                renderTags={(value: any[], getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            label={generateDisplayValue(option)}
                            {...getTagProps({index})}
                            onDelete={() => {
                                const newValues = value.filter((_, i) => i !== index);
                                if (isList) {
                                    const newIds = newValues.map((item: any) => item.id);
                                    formik.setFieldValue(name, newIds);

                                    // Remove corresponding link data
                                    const updatedLinkData = {
                                        ...formik.values[`${name}_link_data`],
                                    };
                                    delete updatedLinkData[option.id];
                                    formik.setFieldValue(`${name}_link_data`, updatedLinkData);
                                } else {
                                    formik.setFieldValue(name, null);
                                    formik.setFieldValue(`${name}_link_data`, {});
                                }
                            }}
                        />
                    ))
                }
            />

            {/* Render link table columns inputs */}
            {linkTableColumns.length > 0 && (
                <div style={{marginTop: '1rem'}}>
                    <Typography variant="subtitle1">Additional Information:</Typography>
                    {isList ? (
                        selectedOptions.map((option: any) => (
                            <div
                                key={option.id}
                                style={{
                                    border: '1px solid #ccc',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    borderRadius: '8px',
                                }}>
                                <Typography variant="subtitle2">{generateDisplayValue(option)}</Typography>
                                <LinkDataFields
                                    parentName={`${name}_link_data`}
                                    referenceId={option.id}
                                    linkTableColumns={linkTableColumns}
                                    formik={formik}
                                />
                            </div>
                        ))
                    ) : (
                        <LinkDataFields
                            parentName={`${name}_link_data`}
                            referenceId={recordId || 0} // Use recordId passed as prop
                            linkTableColumns={linkTableColumns}
                            formik={formik}
                        />
                    )}
                </div>
            )}
        </>
    );
};

export default ReferenceField;
