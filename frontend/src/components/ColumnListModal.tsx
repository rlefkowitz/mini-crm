import React, {useEffect, useState} from 'react';
import {Dialog, DialogTitle, DialogContent, Typography, Button, Box, IconButton} from '@mui/material';
import axios from '../utils/axiosConfig';
import {ColumnSchema} from '../types';
import {DataGrid, GridColDef, GridRenderCellParams} from '@mui/x-data-grid';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit'; // Import EditIcon
import DeleteIcon from '@mui/icons-material/Delete'; // Import DeleteIcon
import AddColumnDialog from './AddColumnDialog';
import EditColumnDialog from './EditColumnDialog'; // New component for editing
import useSchema from '../hooks/useSchema';

interface ColumnListModalProps {
    open: boolean;
    handleClose: () => void;
    tableName: string;
    tableId: number;
    isLinkTable?: boolean; // Optional prop to indicate if it's a link table
}

const ColumnListModal: React.FC<ColumnListModalProps> = ({
    open,
    handleClose,
    tableName,
    tableId,
    isLinkTable = false,
}) => {
    const [columns, setColumns] = useState<ColumnSchema[]>([]);
    const [error, setError] = useState<string>('');
    const [openAddColumn, setOpenAddColumn] = useState<boolean>(false);
    const [openEditColumn, setOpenEditColumn] = useState<boolean>(false);
    const [selectedColumn, setSelectedColumn] = useState<ColumnSchema | null>(null); // Track the column to edit

    const {enums: allEnums} = useSchema();

    const fetchColumns = async () => {
        try {
            if (isLinkTable) {
                const response = await axios.get(`/link_tables/${tableId}/columns/`); // Fetch link table columns
                setColumns(response.data);
            } else {
                const response = await axios.get(`/tables/${tableId}/columns/`); // Fetch main table columns
                setColumns(response.data);
            }
        } catch (error) {
            console.error('Error fetching columns:', error);
            setError('Failed to load columns.');
        }
    };

    useEffect(() => {
        if (open) {
            fetchColumns();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tableId, isLinkTable]);

    const dataGridColumns: GridColDef[] = [
        {field: 'name', headerName: 'Name', flex: 1},
        {field: 'data_type', headerName: 'Data Type', flex: 1},
        {field: 'is_list', headerName: 'Is List', flex: 0.5, type: 'boolean'},
        {field: 'required', headerName: 'Required', flex: 0.5, type: 'boolean'},
        {field: 'unique', headerName: 'Unique', flex: 0.5, type: 'boolean'},
        {field: 'searchable', headerName: 'Searchable', flex: 0.7, type: 'boolean'},
        {
            field: 'enum_values',
            headerName: 'Enum Values',
            flex: 2,
            renderCell: (params: GridRenderCellParams) => getEnumValues(params.row as ColumnSchema),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => (
                <>
                    <IconButton
                        aria-label="edit"
                        color="primary"
                        onClick={() => handleEditColumn(params.row as ColumnSchema)}>
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        aria-label="delete"
                        color="secondary"
                        onClick={() => handleDeleteColumn(params.row as ColumnSchema)}>
                        <DeleteIcon />
                    </IconButton>
                </>
            ),
        },
    ];

    /**
     * Retrieves enum values for a given column using the globally fetched enums.
     */
    const getEnumValues = (column: ColumnSchema) => {
        if (column.data_type === 'enum' && column.enum_id) {
            const enumData = allEnums?.find(e => e.id === column.enum_id);
            if (enumData) {
                return (
                    <Box display="flex" flexWrap="wrap">
                        {enumData.values.map((val, index) => (
                            <Chip key={index} label={val.value} size="small" style={{margin: '2px'}} />
                        ))}
                    </Box>
                );
            }
            return <Typography color="error">Enum not found</Typography>;
        }
        return null;
    };

    /**
     * Handle the edit button click
     */
    const handleEditColumn = (column: ColumnSchema) => {
        setSelectedColumn(column);
        setOpenEditColumn(true);
    };

    /**
     * Handle the delete button click
     */
    const handleDeleteColumn = async (column: ColumnSchema) => {
        if (window.confirm(`Are you sure you want to delete the column "${column.name}"?`)) {
            try {
                let endpoint = '';
                if (isLinkTable) {
                    endpoint = `/link_tables/${tableId}/columns/${column.id}/`;
                } else {
                    endpoint = `/tables/${tableId}/columns/${column.id}/`;
                }
                await axios.delete(endpoint);
                fetchColumns();
            } catch (error: any) {
                setError(error.response?.data?.detail || 'Failed to delete column.');
            }
        }
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
                <DialogTitle>Columns of {tableName}</DialogTitle>
                <DialogContent>
                    {error ? (
                        <Typography color="error">{error}</Typography>
                    ) : (
                        <>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={() => setOpenAddColumn(true)}
                                sx={{mb: 2}}>
                                Add Column
                            </Button>
                            <div style={{height: 400, width: '100%'}}>
                                <DataGrid
                                    rows={columns}
                                    columns={dataGridColumns}
                                    autoHeight
                                    getRowId={row => row.id}
                                />
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* AddColumnDialog Component */}
            <AddColumnDialog
                open={openAddColumn}
                handleClose={() => setOpenAddColumn(false)}
                tableName={tableName}
                tableId={tableId}
                isLinkTable={isLinkTable} // Pass isLinkTable prop
                onColumnAdded={fetchColumns}
            />

            {/* EditColumnDialog Component */}
            {selectedColumn && (
                <EditColumnDialog
                    open={openEditColumn}
                    handleClose={() => setOpenEditColumn(false)}
                    tableName={tableName}
                    tableId={tableId}
                    column={selectedColumn}
                    isLinkTable={isLinkTable}
                    onColumnUpdated={fetchColumns}
                />
            )}
        </>
    );
};

export default ColumnListModal;
