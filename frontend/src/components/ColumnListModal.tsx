import React, {useEffect, useState} from 'react';
import {Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Alert, Box} from '@mui/material';
import {DataGrid, GridColDef} from '@mui/x-data-grid';
import axios from '../utils/axiosConfig';
import AddColumnDialog from './AddColumnDialog';

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
}

const ColumnListModal: React.FC<ColumnListModalProps> = ({open, handleClose, tableName, tableId}) => {
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [openAddColumn, setOpenAddColumn] = useState<boolean>(false);

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

    const columnsDef: GridColDef[] = [
        {field: 'id', headerName: 'ID', width: 70},
        {field: 'name', headerName: 'Name', width: 200},
        {field: 'data_type', headerName: 'Data Type', width: 150},
        {field: 'constraints', headerName: 'Constraints', width: 200},
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
        </Dialog>
    );
};

export default ColumnListModal;
