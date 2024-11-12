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
    isLinkTable?: boolean;
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
    reference_table?: any;
    is_list: boolean;
    searchable: boolean; // Added searchable property
}

const ColumnListModal: React.FC<ColumnListModalProps> = ({
    open,
    handleClose,
    tableName,
    tableId,
    isLinkTable = false,
}) => {
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
            const endpoint = isLinkTable ? `/link_tables/${tableId}/columns/` : `/tables/${tableId}/columns/`;
            const response = await axios.get(endpoint);
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
            const endpoint = isLinkTable ? `/link_columns/${editColumn.id}/` : `/columns/${editColumn.id}/`;
            await axios.put(endpoint, editColumn);
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
                const endpoint = isLinkTable ? `/link_columns/${columnToDelete.id}` : `/columns/${columnToDelete.id}`;
                await axios.delete(endpoint);
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
        {field: 'name', headerName: 'Name', width: 150},
        {field: 'data_type', headerName: 'Data Type', width: 100},
        {field: 'is_list', headerName: 'Is List', width: 80, type: 'boolean'},
        {field: 'searchable', headerName: 'Searchable', width: 100, type: 'boolean'},
        {field: 'constraints', headerName: 'Constraints', width: 150},
        {field: 'required', headerName: 'Required', width: 80, type: 'boolean'},
        {field: 'unique', headerName: 'Unique', width: 80, type: 'boolean'},
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
                isLinkTable={isLinkTable}
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
                                <MenuItem value="reference">Reference</MenuItem>
                            </Select>
                        </FormControl>
                        {editColumn.data_type === 'reference' && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={editColumn.is_list}
                                        onChange={e => setEditColumn({...editColumn, is_list: e.target.checked})}
                                    />
                                }
                                label="Allow multiple selections"
                            />
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
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={editColumn.searchable}
                                    onChange={e => setEditColumn({...editColumn, searchable: e.target.checked})}
                                />
                            }
                            label="Searchable"
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
