import React, {useEffect, useState} from 'react';
import {Button, TextField, IconButton, Typography, Grid, Box} from '@mui/material';
import {Delete, Add, Visibility, Settings} from '@mui/icons-material';
import axios from '../utils/axiosConfig';
import {TableRead} from '../types';
import useSchema from '../hooks/useSchema';
import AddColumnDialog from '../components/AddColumnDialog';
import AddTableDialog from '../components/AddTableDialog';
import ColumnListModal from '../components/ColumnListModal';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import TableSettingsDialog from '../components/TableSettingsDialog';
import {DataGrid, GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';

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

    const [openTableSettings, setOpenTableSettings] = useState<boolean>(false);
    const [tableForSettings, setTableForSettings] = useState<TableRead | null>(null);

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

    const handleOpenTableSettings = (table: TableRead) => {
        setTableForSettings(table);
        setOpenTableSettings(true);
    };

    const handleCloseTableSettings = () => {
        setOpenTableSettings(false);
        setTableForSettings(null);
    };

    const handleTableSettingsSaved = () => {
        fetchTables();
        setOpenTableSettings(false);
    };

    // Setup columns for displaying tables in SchemaView using DataGrid
    const [schemaColumns, setSchemaColumns] = useState<GridColDef[]>([]);

    useEffect(() => {
        if (tables.length > 0) {
            const cols: GridColDef[] = [
                {
                    field: 'name',
                    headerName: 'Table Name',
                    flex: 1,
                },
                {
                    field: 'actions',
                    headerName: 'Actions',
                    sortable: false,
                    filterable: false,
                    width: 300,
                    renderCell: (params: GridRenderCellParams) => (
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <IconButton
                                color="primary"
                                onClick={() => handleSelectTable(params.row as TableRead)}
                                aria-label="view-columns">
                                <Visibility />
                            </IconButton>
                            <IconButton
                                color="primary"
                                onClick={() => handleOpenTableSettings(params.row as TableRead)}
                                aria-label="settings">
                                <Settings />
                            </IconButton>
                            <IconButton
                                color="secondary"
                                onClick={() => handleDeleteTable(params.row as TableRead)}
                                aria-label="delete-table">
                                <Delete />
                            </IconButton>
                            <IconButton
                                color="success"
                                onClick={() => handleOpenAddColumn(params.row as TableRead)}
                                aria-label="add-column">
                                <Add />
                            </IconButton>
                        </div>
                    ),
                },
            ];

            setSchemaColumns(cols);
        }
    }, [tables]);

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
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
                        startIcon={<AddIcon />}
                        sx={{ml: 2}}
                        onClick={handleOpenAddTable}>
                        Add Table
                    </Button>
                </Box>
                {tables.length > 0 ? (
                    <Box style={{height: 600, width: '100%'}}>
                        <DataGrid rows={tables} columns={schemaColumns} autoHeight />
                    </Box>
                ) : (
                    <Typography variant="h6" align="center">
                        No tables found. Please add a new table to get started.
                    </Typography>
                )}

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

                {/* TableSettingsDialog Component */}
                {tableForSettings && (
                    <TableSettingsDialog
                        open={openTableSettings}
                        handleClose={handleCloseTableSettings}
                        table={tableForSettings}
                        onSettingsSaved={handleTableSettingsSaved}
                    />
                )}
            </Grid>
            <Grid item xs={12}>
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
                {/* Example usage of display_format */}
                {selectedTable && selectedTable.display_format && (
                    <Box mt={2}>
                        <Typography variant="subtitle1">Display Format: {selectedTable.display_format}</Typography>
                        {selectedTable.display_format_secondary && (
                            <Typography variant="subtitle2">
                                Secondary Display Format: {selectedTable.display_format_secondary}
                            </Typography>
                        )}
                    </Box>
                )}
            </Grid>
        </Grid>
    );
};

export default SchemaView;
