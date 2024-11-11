import React, {useEffect, useState} from 'react';
import axios from '../utils/axiosConfig';
import {
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Paper,
    Grid,
} from '@mui/material';
import DynamicForm from '../components/DynamicForm';
import useSchema from '../hooks/useSchema';
import {TableRead, Record} from '../types';
import ObjectSummary from '../components/ObjectSummary';

const DataView: React.FC = () => {
    const {schema, isLoading: loading} = useSchema();
    const [tables, setTables] = useState<TableRead[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [records, setRecords] = useState<Record[]>([]);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [editRecord, setEditRecord] = useState<Record | null>(null);

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
            setRecords(response.data);
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTable]);

    const handleOpenDialog = () => {
        setEditRecord(null);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setEditRecord(null);
        setOpenDialog(false);
    };

    const handleEdit = (record: Record) => {
        setEditRecord(record);
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

    if (loading) return <Typography>Loading schema...</Typography>;

    return (
        <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
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
                {selectedTable && (
                    <Paper elevation={3}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    {schema?.[selectedTable]?.columns.map(col => (
                                        <TableCell key={col.id}>{col.name}</TableCell>
                                    ))}
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {records.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell>{record.id}</TableCell>
                                        {schema?.[selectedTable]?.columns.map(col => (
                                            <TableCell key={col.id}>{record[col.name]}</TableCell>
                                        ))}
                                        <TableCell>
                                            <Button
                                                variant="outlined"
                                                onClick={() => handleEdit(record)}
                                                style={{marginRight: '0.5rem'}}>
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="secondary"
                                                onClick={() => handleDelete(record.id)}>
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {records.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={(schema?.[selectedTable]?.columns.length || 0) + 2}
                                            align="center">
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                {/* Dialog for adding/editing records */}
                <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>{editRecord ? 'Edit Record' : 'Add New Record'}</DialogTitle>
                    <DialogContent>
                        {selectedTable && (
                            <DynamicForm
                                tableName={selectedTable}
                                mode={editRecord ? 'update' : 'create'}
                                initialValues={editRecord || undefined}
                                recordId={editRecord?.id}
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
            <Grid item xs={12} md={4}>
                {selectedTable && records.length > 0 && (
                    <ObjectSummary tableName={selectedTable} recordId={records[0].id} />
                    // You can enhance this by allowing users to select specific records
                )}
            </Grid>
        </Grid>
    );
};

export default DataView;
