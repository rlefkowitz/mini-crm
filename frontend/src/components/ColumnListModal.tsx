import React, {useEffect, useState} from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Alert,
    Box,
    FormControlLabel,
    Checkbox,
    TextField,
    FormControl,
    Select,
    InputLabel,
    MenuItem,
} from '@mui/material';
import {DataGrid, GridColDef, GridActionsCellItem} from '@mui/x-data-grid';
import axios from '../utils/axiosConfig';
import AddColumnDialog from './AddColumnDialog';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';

interface ColumnListModalProps {
    open: boolean;
    handleClose: () => void;
    tableName: string;
    tableId: number;
}

interface Column {
    id: number;
    name: string;
    data_type: string;
    constraints?: string;
    table_id: number;
    required: boolean;
    unique: boolean;
    enum_id?: number;
}

const ColumnListModal: React.FC<ColumnListModalProps> = ({open, handleClose, tableName, tableId}) => {
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [openAddColumn, setOpenAddColumn] = useState<boolean>(false);
    const [editColumn, setEditColumn] = useState<Column | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [columnToDelete, setColumnToDelete] = useState<Column | null>(null);

    const fetchColumns = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/tables/${tableId}/columns/`);
            setColumns(response.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch columns.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchColumns();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleOpenAddColumn = () => {
        setOpenAddColumn(true);
    };

    const handleCloseAddColumn = () => {
        setOpenAddColumn(false);
    };

    const handleColumnAdded = () => {
        fetchColumns();
    };

    const handleEdit = (column: Column) => {
        setEditColumn(column);
    };

    const handleCloseEdit = () => {
        setEditColumn(null);
    };

    const handleUpdateColumn = async () => {
        if (!editColumn) return;
        try {
            await axios.put(`/columns/${editColumn.id}/`, editColumn);
            setEditColumn(null);
            fetchColumns();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update column.');
        }
    };

    const handleDeleteColumn = (column: Column) => {
        setColumnToDelete(column);
        setConfirmDelete(true);
    };

    const confirmDeleteColumn = async () => {
        if (columnToDelete) {
            try {
                await axios.delete(`/columns/${columnToDelete.id}`);
                fetchColumns();
                setColumnToDelete(null);
                setConfirmDelete(false);
            } catch (err: any) {
                setError(err.response?.data?.detail || 'Failed to delete column.');
                setConfirmDelete(false);
            }
        }
    };

    const columnsDef: GridColDef[] = [
        {field: 'id', headerName: 'ID', width: 70},
        {field: 'name', headerName: 'Name', width: 200, editable: false},
        {field: 'data_type', headerName: 'Data Type', width: 150, editable: false},
        {field: 'constraints', headerName: 'Constraints', width: 200, editable: false},
        {field: 'required', headerName: 'Required', width: 100, type: 'boolean'},
        {field: 'unique', headerName: 'Unique', width: 100, type: 'boolean'},
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 150,
            getActions: params => [
                <GridActionsCellItem
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={() => handleEdit(params.row)}
                    color="inherit"
                />,
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={() => handleDeleteColumn(params.row)}
                    color="inherit"
                />,
            ],
        },
    ];

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle>Columns in "{tableName}"</DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', mt: 2}}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : columns.length === 0 ? (
                    <Alert severity="info">No columns found in this table.</Alert>
                ) : (
                    <Box sx={{height: 400, width: '100%', mb: 2}}>
                        <DataGrid rows={columns} columns={columnsDef} getRowId={row => row.id} />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Close
                </Button>
                <Button onClick={handleOpenAddColumn} variant="contained" color="primary">
                    Add Column
                </Button>
            </DialogActions>

            {/* AddColumnDialog Component */}
            <AddColumnDialog
                open={openAddColumn}
                handleClose={handleCloseAddColumn}
                tableName={tableName}
                tableId={tableId}
                onColumnAdded={handleColumnAdded}
            />

            {/* Edit Column Dialog */}
            {editColumn && (
                <Dialog open={Boolean(editColumn)} onClose={handleCloseEdit} fullWidth maxWidth="sm">
                    <DialogTitle>Edit Column "{editColumn.name}"</DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            label="Column Name"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={editColumn.name}
                            onChange={e => setEditColumn({...editColumn, name: e.target.value})}
                        />
                        <FormControl fullWidth margin="dense">
                            <InputLabel>Data Type</InputLabel>
                            <Select
                                value={editColumn.data_type}
                                label="Data Type"
                                onChange={e => setEditColumn({...editColumn, data_type: e.target.value as string})}>
                                <MenuItem value="string">String</MenuItem>
                                <MenuItem value="integer">Integer</MenuItem>
                                <MenuItem value="currency">Currency</MenuItem>
                                <MenuItem value="enum">Enum</MenuItem>
                                <MenuItem value="picklist">Picklist</MenuItem>
                                {/* Add more data types as needed */}
                            </Select>
                        </FormControl>
                        {editColumn.data_type === 'enum' && (
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Enum</InputLabel>
                                <Select
                                    value={editColumn.enum_id || ''}
                                    label="Enum"
                                    onChange={e => setEditColumn({...editColumn, enum_id: e.target.value as number})}>
                                    {/* Fetch and map enums */}
                                    {/* Assuming enums are fetched globally or passed as props */}
                                </Select>
                            </FormControl>
                        )}
                        <TextField
                            margin="dense"
                            label="Constraints"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={editColumn.constraints || ''}
                            onChange={e => setEditColumn({...editColumn, constraints: e.target.value})}
                            helperText='e.g., "CHECK (value > 0)"'
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={editColumn.required}
                                    onChange={e => setEditColumn({...editColumn, required: e.target.checked})}
                                />
                            }
                            label="Required"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={editColumn.unique}
                                    onChange={e => setEditColumn({...editColumn, unique: e.target.checked})}
                                />
                            }
                            label="Unique"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseEdit} color="secondary">
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateColumn} variant="contained" color="primary">
                            Update Column
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* ConfirmDeleteDialog Component */}
            {columnToDelete && (
                <ConfirmDeleteDialog
                    open={confirmDelete}
                    handleClose={() => setConfirmDelete(false)}
                    handleConfirm={confirmDeleteColumn}
                    itemName={columnToDelete.name}
                    itemType="column"
                />
            )}
        </Dialog>
    );
};

export default ColumnListModal;
