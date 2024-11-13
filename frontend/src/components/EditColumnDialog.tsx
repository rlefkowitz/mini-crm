import React, {useState, useEffect} from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
} from '@mui/material';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';
import EnumManagement from './EnumManagement';
import useSchema from '../hooks/useSchema';
import {ColumnSchema, Enum} from '../types';

interface EditColumnDialogProps {
    open: boolean;
    handleClose: () => void;
    tableName: string;
    tableId: number;
    column: ColumnSchema; // The column to edit
    isLinkTable?: boolean; // Indicates if editing a link table column
    onColumnUpdated: () => void; // Callback after successful update
}

const EditColumnDialog: React.FC<EditColumnDialogProps> = ({
    open,
    handleClose,
    tableName,
    tableId,
    column,
    isLinkTable = false,
    onColumnUpdated,
}) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState<string>(column.name);
    const [dataType, setDataType] = useState<string>(column.data_type);
    const [constraints, setConstraints] = useState<string>(column.constraints || '');
    const [required, setRequired] = useState<boolean>(column.required || false);
    const [unique, setUnique] = useState<boolean>(column.unique || false);
    const [enumId, setEnumId] = useState<number | null>(column.enum_id || null);
    const [error, setError] = useState<string>('');
    const [showCreateEnum, setShowCreateEnum] = useState<boolean>(false);
    const [referenceLinkTableId, setReferenceLinkTableId] = useState<number | null>(
        column.reference_link_table_id || null
    );
    const [isList, setIsList] = useState<boolean>(column.is_list || false);
    const [searchable, setSearchable] = useState<boolean>(column.searchable || false);

    const {enums: allEnums} = useSchema();

    // Fetch link tables only if dataType is 'reference'
    const {data: linkTables, isLoading: linkTablesLoading} = useMutation({
        mutationFn: async () => {
            if (isLinkTable || dataType === 'reference') {
                const response = await axios.get(`/link_tables/`);
                return response.data;
            } else {
                return [];
            }
        },
        enabled: open && (isLinkTable || dataType === 'reference'),
        onError: error => {
            console.error('Error fetching link tables:', error);
        },
    });

    const mutation = useMutation({
        mutationFn: (updatedColumn: any) => {
            let endpoint = '';
            if (isLinkTable) {
                endpoint = `/link_tables/${tableId}/columns/${column.id}/`; // Endpoint for link table columns
            } else {
                endpoint = `/tables/${tableId}/columns/${column.id}/`; // Endpoint for main table columns
            }
            return axios.put(endpoint, updatedColumn); // Using PUT for full update; use PATCH if partial
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['columns', tableId]});
            onColumnUpdated();
            handleClose();
        },
        onError: (error: any) => {
            setError(error.response?.data?.detail || 'Failed to update column.');
        },
    });

    const handleUpdateColumn = () => {
        if (!name.trim()) {
            setError('Column name is required.');
            return;
        }

        if (dataType === 'enum' && !enumId) {
            setError('Please select an enum or create a new one.');
            return;
        }

        if (dataType === 'reference' && !referenceLinkTableId) {
            setError('Please select a link table to reference.');
            return;
        }

        const updatedColumn: any = {
            name: name.trim(),
            data_type: dataType,
            constraints: constraints.trim() || undefined,
            required,
            unique,
            enum_id: enumId || undefined,
            reference_link_table_id: referenceLinkTableId || undefined,
            is_list: isList,
            searchable,
        };

        mutation.mutate(updatedColumn);
    };

    useEffect(() => {
        setName(column.name);
        setDataType(column.data_type);
        setConstraints(column.constraints || '');
        setRequired(column.required || false);
        setUnique(column.unique || false);
        setEnumId(column.enum_id || null);
        setReferenceLinkTableId(column.reference_link_table_id || null);
        setIsList(column.is_list || false);
        setSearchable(column.searchable || false);
    }, [column]);

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Edit Column "{column.name}"</DialogTitle>
                <DialogContent>
                    <Box component="form" noValidate autoComplete="off">
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Column Name"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Data Type</InputLabel>
                            <Select
                                value={dataType}
                                label="Data Type"
                                onChange={e => setDataType(e.target.value as string)}>
                                <MenuItem value="string">String</MenuItem>
                                <MenuItem value="integer">Integer</MenuItem>
                                <MenuItem value="currency">Currency</MenuItem>
                                <MenuItem value="enum">Enum</MenuItem>
                                <MenuItem value="reference">Reference</MenuItem>
                                <MenuItem value="boolean">Boolean</MenuItem>
                                <MenuItem value="date">Date</MenuItem>
                                <MenuItem value="datetime">Datetime</MenuItem>
                                {/* Add more data types as needed */}
                            </Select>
                        </FormControl>

                        {dataType === 'enum' && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Enum</InputLabel>
                                <Select
                                    value={enumId || ''}
                                    label="Enum"
                                    onChange={e => setEnumId(Number(e.target.value))}>
                                    {allEnums &&
                                        allEnums.map((enumItem: Enum) => (
                                            <MenuItem key={enumItem.id} value={enumItem.id}>
                                                {enumItem.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                                <Button
                                    variant="text"
                                    onClick={() => setShowCreateEnum(true)}
                                    style={{marginTop: '0.5rem'}}>
                                    Create New Enum
                                </Button>
                            </FormControl>
                        )}

                        {dataType === 'reference' && (
                            <FormControl fullWidth margin="dense" required>
                                <InputLabel>Reference Link Table</InputLabel>
                                <Select
                                    value={referenceLinkTableId || ''}
                                    label="Reference Link Table"
                                    onChange={e => setReferenceLinkTableId(Number(e.target.value))}
                                    disabled={linkTablesLoading || !linkTables || linkTables.length === 0}>
                                    {linkTables &&
                                        linkTables.map((linkTable: any) => (
                                            <MenuItem key={linkTable.id} value={linkTable.id}>
                                                {linkTable.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                                {linkTablesLoading && (
                                    <Typography variant="caption" color="textSecondary">
                                        Loading link tables...
                                    </Typography>
                                )}
                                {!linkTablesLoading && linkTables && linkTables.length === 0 && (
                                    <Typography variant="caption" color="textSecondary">
                                        No link tables available.
                                    </Typography>
                                )}
                            </FormControl>
                        )}

                        {/* Allow making any data type a list */}
                        <FormControlLabel
                            control={<Checkbox checked={isList} onChange={e => setIsList(e.target.checked)} />}
                            label="Allow multiple values (List)"
                            sx={{mt: 1}}
                        />

                        <TextField
                            margin="dense"
                            label="Constraints"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={constraints}
                            onChange={e => setConstraints(e.target.value)}
                            helperText='e.g., "CHECK (value > 0)"'
                        />
                        <FormControlLabel
                            control={<Checkbox checked={required} onChange={e => setRequired(e.target.checked)} />}
                            label="Required"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={unique} onChange={e => setUnique(e.target.checked)} />}
                            label="Unique"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={searchable} onChange={e => setSearchable(e.target.checked)} />}
                            label="Searchable"
                        />
                        {error && (
                            <Alert severity="error" sx={{mt: 2}}>
                                {error}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            handleClose();
                            // Optionally reset form or state here
                        }}
                        color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleUpdateColumn} variant="contained" color="primary">
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal for Enum Management */}
            <Dialog open={showCreateEnum} onClose={() => setShowCreateEnum(false)} fullWidth maxWidth="sm">
                <DialogTitle>Create New Enum</DialogTitle>
                <DialogContent>
                    <EnumManagement
                        onEnumCreated={() => {
                            queryClient.invalidateQueries({queryKey: ['enums']});
                            setShowCreateEnum(false);
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCreateEnum(false)} color="secondary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default EditColumnDialog;
