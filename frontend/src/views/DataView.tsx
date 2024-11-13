import React, {useEffect, useState} from 'react';
import axios from '../utils/axiosConfig';
import {
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Grid,
} from '@mui/material';
import DynamicForm from '../components/DynamicForm';
import useSchema from '../hooks/useSchema';
import {TableRead, Record, ColumnSchema} from '../types';
import ObjectSummary from '../components/ObjectSummary';
import {DataGrid, GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import Chip from '@mui/material/Chip';

const DataView: React.FC = () => {
    const {schema, enums} = useSchema();
    const [tables, setTables] = useState<TableRead[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [records, setRecords] = useState<any[]>([]);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [editRecord, setEditRecord] = useState<any | null>(null); // Holds data fields only
    const [editRecordId, setEditRecordId] = useState<number | null>(null);
    const [columns, setColumns] = useState<GridColDef[]>([]);

    const fetchTables = async () => {
        try {
            const response = await axios.get(`/tables/`);
            setTables(response.data);
        } catch (error) {
            console.error('Error fetching tables:', error);
        }
    };

    const fetchRecords = async () => {
        try {
            const response = await axios.get(`/records/${selectedTable}/`);
            const flattenedRecords = response.data.map((record: Record) => ({
                id: record.id,
                ...record.data,
            }));
            setRecords(flattenedRecords);
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };

    useEffect(() => {
        fetchTables();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema]);

    useEffect(() => {
        if (selectedTable) {
            fetchRecords();
            setupColumns();
        } else {
            setColumns([]);
            setRecords([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTable, schema]);

    const setupColumns = () => {
        if (schema && selectedTable) {
            const cols: GridColDef[] = schema[selectedTable].columns
                .filter((col: ColumnSchema) => col.name !== 'id') // Exclude 'id' field
                .map((col: ColumnSchema) => ({
                    headerName: col.name,
                    field: col.name,
                    sortable: true,
                    flex: 1,
                    renderCell: (params: GridRenderCellParams) => {
                        const value = params.value;

                        // Handle reference fields
                        if (col.data_type === 'reference') {
                            return value?.display_value || value || '';
                        }

                        // Handle enum lists with chips
                        if ((col.data_type === 'enum' || col.data_type === 'picklist') && col.is_list) {
                            if (Array.isArray(value)) {
                                return (
                                    <div>
                                        {value.map((val: string, index: number) => (
                                            <Chip key={index} label={val} size="small" style={{margin: '2px'}} />
                                        ))}
                                    </div>
                                );
                            }
                            return '';
                        }

                        // Handle other list fields with chips
                        if (col.is_list) {
                            if (Array.isArray(value)) {
                                return (
                                    <div>
                                        {value.map((val: any, index: number) => (
                                            <Chip key={index} label={val} size="small" style={{margin: '2px'}} />
                                        ))}
                                    </div>
                                );
                            }
                            return '';
                        }

                        return value;
                    },
                }));

            // Add actions column with increased width
            cols.push({
                headerName: 'Actions',
                field: 'actions',
                sortable: false,
                filterable: false,
                width: 200, // Increased width for better spacing
                renderCell: (params: GridRenderCellParams) => (
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                        <Button variant="outlined" size="small" onClick={() => handleEdit(params.row)}>
                            Edit
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            color="secondary"
                            onClick={() => handleDelete(params.row.id)}>
                            Delete
                        </Button>
                    </div>
                ),
            });

            setColumns(cols);
        }
    };

    const handleOpenDialog = () => {
        setEditRecord(null);
        setEditRecordId(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setEditRecord(null);
        setEditRecordId(null);
        setOpenDialog(false);
    };

    const handleEdit = (record: any) => {
        // 'record' contains id and data fields
        const {id, ...data} = record;
        setEditRecord(data); // Pass only data fields
        setEditRecordId(id); // Pass the record ID
        setOpenDialog(true);
    };

    const handleDelete = async (recordId: number) => {
        try {
            await axios.delete(`/records/${selectedTable}/${recordId}/`);
            fetchRecords();
        } catch (error) {
            console.error('Error deleting record:', error);
        }
    };

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h4" gutterBottom>
                    Data Management
                </Typography>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                    <FormControl variant="outlined" style={{minWidth: 200}}>
                        <InputLabel>Select a table</InputLabel>
                        <Select
                            value={selectedTable}
                            onChange={e => setSelectedTable(e.target.value as string)}
                            label="Select a table">
                            {tables.map(table => (
                                <MenuItem key={table.id} value={table.name}>
                                    {table.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button variant="contained" color="primary" onClick={handleOpenDialog} disabled={!selectedTable}>
                        Add New Record
                    </Button>
                </div>
                {selectedTable && columns.length > 0 && (
                    <div style={{height: 600, width: '100%'}}>
                        <DataGrid rows={records} columns={columns} autoHeight />
                    </div>
                )}

                {/* Dialog for adding/editing records */}
                <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>{editRecord ? 'Edit Record' : 'Add New Record'}</DialogTitle>
                    <DialogContent>
                        {selectedTable && (
                            <DynamicForm
                                tableName={selectedTable}
                                mode={editRecord ? 'update' : 'create'}
                                initialValues={editRecord ? editRecord : undefined}
                                recordId={editRecordId}
                                onSuccess={() => {
                                    fetchRecords();
                                    handleCloseDialog();
                                }}
                            />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} color="secondary">
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            </Grid>
            <Grid item xs={12}>
                {selectedTable && editRecord && editRecordId && (
                    <ObjectSummary tableName={selectedTable} recordId={editRecordId} />
                )}
            </Grid>
        </Grid>
    );
};

export default DataView;
