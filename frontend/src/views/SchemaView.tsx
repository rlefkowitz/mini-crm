import React, {useEffect, useState} from 'react';
import {Button, TextField, List, ListItem, ListItemText, IconButton, Typography, Grid, Paper, Box} from '@mui/material';
import {Delete, Add, Visibility} from '@mui/icons-material';
import axios from '../utils/axiosConfig';
import {TableRead} from '../types';
import useSchema from '../hooks/useSchema';
import AddColumnDialog from '../components/AddColumnDialog';
import AddTableDialog from '../components/AddTableDialog';
import ColumnListModal from '../components/ColumnListModal';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';

const SchemaView: React.FC = () => {
    const {schema} = useSchema();
    const [tables, setTables] = useState<TableRead[]>([]);
    const [selectedTable, setSelectedTable] = useState<TableRead | null>(null);
    const [openAddColumn, setOpenAddColumn] = useState<boolean>(false);
    const [openAddTable, setOpenAddTable] = useState<boolean>(false);
    const [openColumnList, setOpenColumnList] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [tableToDelete, setTableToDelete] = useState<TableRead | null>(null);

    const fetchTables = async () => {
        try {
            const response = await axios.get(`/tables/`);
            setTables(response.data);
        } catch (error) {
            console.error('Error fetching tables:', error);
            setError('Failed to load tables.');
        }
    };

    useEffect(() => {
        fetchTables();
    }, [schema]);

    const handleOpenAddColumn = (table: TableRead) => {
        setSelectedTable(table);
        setOpenAddColumn(true);
    };

    const handleCloseAddColumn = () => {
        setOpenAddColumn(false);
    };

    const handleColumnAdded = () => {
        fetchTables();
    };

    const handleOpenAddTable = () => {
        setOpenAddTable(true);
    };

    const handleCloseAddTable = () => {
        setOpenAddTable(false);
    };

    const handleTableAdded = () => {
        fetchTables();
    };

    const handleDeleteTable = (table: TableRead) => {
        setTableToDelete(table);
        setConfirmDelete(true);
    };

    const confirmDeleteTable = async () => {
        if (tableToDelete) {
            try {
                await axios.delete(`/tables/${tableToDelete.id}/`);
                fetchTables();
                setTableToDelete(null);
                setConfirmDelete(false);
                if (selectedTable?.id === tableToDelete.id) {
                    setSelectedTable(null);
                }
            } catch (error) {
                console.error('Error deleting table:', error);
                setError('Failed to delete table.');
                setConfirmDelete(false);
            }
        }
    };

    const handleSelectTable = (table: TableRead) => {
        setSelectedTable(table);
        setOpenColumnList(true);
    };

    return (
        <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
                <Typography variant="h4" gutterBottom>
                    Schema Management
                </Typography>
                {error && (
                    <Typography color="error" variant="body2" gutterBottom>
                        {error}
                    </Typography>
                )}
                <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
                    <TextField
                        label="Search Tables"
                        variant="outlined"
                        size="small"
                        fullWidth
                        // Implement search functionality if needed
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        sx={{ml: 2}}
                        onClick={handleOpenAddTable}>
                        Add Table
                    </Button>
                </Box>
                <Paper elevation={3} sx={{maxHeight: '60vh', overflow: 'auto'}}>
                    <List>
                        {tables.map(table => (
                            <ListItem
                                key={table.id}
                                secondaryAction={
                                    <>
                                        <IconButton
                                            edge="end"
                                            aria-label="view-columns"
                                            onClick={() => handleSelectTable(table)}>
                                            <Visibility />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            aria-label="add-column"
                                            onClick={() => handleOpenAddColumn(table)}>
                                            <Add />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            aria-label="delete-table"
                                            onClick={() => handleDeleteTable(table)}>
                                            <Delete />
                                        </IconButton>
                                    </>
                                }
                                onClick={() => handleSelectTable(table)}>
                                <ListItemText primary={table.name} />
                            </ListItem>
                        ))}
                    </List>
                </Paper>

                {/* AddTableDialog Component */}
                <AddTableDialog open={openAddTable} handleClose={handleCloseAddTable} onTableAdded={handleTableAdded} />

                {/* AddColumnDialog Component */}
                {selectedTable && (
                    <AddColumnDialog
                        open={openAddColumn}
                        handleClose={handleCloseAddColumn}
                        tableName={selectedTable.name}
                        tableId={selectedTable.id}
                        onColumnAdded={handleColumnAdded}
                    />
                )}

                {/* ConfirmDeleteDialog Component */}
                {tableToDelete && (
                    <ConfirmDeleteDialog
                        open={confirmDelete}
                        handleClose={() => setConfirmDelete(false)}
                        handleConfirm={confirmDeleteTable}
                        itemName={tableToDelete.name}
                        itemType="table"
                    />
                )}
            </Grid>
            <Grid item xs={12} md={8}>
                {selectedTable ? (
                    <ColumnListModal
                        open={openColumnList}
                        handleClose={() => setOpenColumnList(false)}
                        tableName={selectedTable.name}
                        tableId={selectedTable.id}
                    />
                ) : (
                    <Typography variant="h6">Select a table to view its columns.</Typography>
                )}
            </Grid>
        </Grid>
    );
};

export default SchemaView;
