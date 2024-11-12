import React, {useState, useEffect} from 'react';
import {
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Alert,
    Box,
} from '@mui/material';
import {Add, Delete, Visibility} from '@mui/icons-material';
import axios from '../utils/axiosConfig';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import ColumnListModal from './ColumnListModal';

interface LinkTable {
    id: number;
    name: string;
    from_table: any;
    to_table: any;
    columns: any[]; // Added columns property
}

const LinkTableManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [openCreateDialog, setOpenCreateDialog] = useState<boolean>(false);
    const [linkTables, setLinkTables] = useState<LinkTable[]>([]);
    const [fromTableId, setFromTableId] = useState<number | null>(null);
    const [toTableId, setToTableId] = useState<number | null>(null);
    const [linkTableName, setLinkTableName] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [selectedLinkTable, setSelectedLinkTable] = useState<LinkTable | null>(null);
    const [openColumnList, setOpenColumnList] = useState<boolean>(false);

    const {data: tables} = useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const response = await axios.get(`/tables/`);
            return response.data;
        },
    });

    const fetchLinkTables = async () => {
        try {
            const response = await axios.get(`/link_tables/`);
            setLinkTables(response.data);
        } catch (error) {
            console.error('Error fetching link tables:', error);
        }
    };

    useEffect(() => {
        fetchLinkTables();
    }, []);

    const createLinkTableMutation = useMutation({
        mutationFn: (newLinkTable: any) => axios.post(`/link_tables/`, newLinkTable),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['linkTables']});
            fetchLinkTables();
            handleCloseCreateDialog();
        },
        onError: (error: any) => {
            setError(error.response?.data?.detail || 'Failed to create link table.');
        },
    });

    const handleCreateLinkTable = () => {
        if (!linkTableName || !fromTableId || !toTableId) {
            setError('Please fill out all required fields.');
            return;
        }

        createLinkTableMutation.mutate({
            name: linkTableName,
            from_table_id: fromTableId,
            to_table_id: toTableId,
        });
    };

    const handleDeleteLinkTable = async (linkTableId: number) => {
        if (window.confirm('Are you sure you want to delete this link table?')) {
            try {
                await axios.delete(`/link_tables/${linkTableId}`);
                fetchLinkTables();
            } catch (error: any) {
                setError(error.response?.data?.detail || 'Failed to delete link table.');
            }
        }
    };

    const handleOpenColumnList = (linkTable: LinkTable) => {
        setSelectedLinkTable(linkTable);
        setOpenColumnList(true);
    };

    const handleCloseColumnList = () => {
        setSelectedLinkTable(null);
        setOpenColumnList(false);
    };

    const handleOpenCreateDialog = () => {
        setOpenCreateDialog(true);
    };

    const handleCloseCreateDialog = () => {
        setOpenCreateDialog(false);
        setFromTableId(null);
        setToTableId(null);
        setLinkTableName('');
        setError('');
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Link Table Management
            </Typography>
            <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleOpenCreateDialog}>
                Create New Link Table
            </Button>
            {error && (
                <Alert severity="error" sx={{mt: 2}}>
                    {error}
                </Alert>
            )}
            <List>
                {linkTables.map(linkTable => (
                    <ListItem
                        key={linkTable.id}
                        secondaryAction={
                            <>
                                <IconButton
                                    edge="end"
                                    aria-label="view-columns"
                                    onClick={() => handleOpenColumnList(linkTable)}>
                                    <Visibility />
                                </IconButton>
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => handleDeleteLinkTable(linkTable.id)}>
                                    <Delete />
                                </IconButton>
                            </>
                        }>
                        <ListItemText
                            primary={linkTable.name}
                            secondary={`${linkTable.from_table.name} ↔ ${linkTable.to_table.name}`}
                        />
                    </ListItem>
                ))}
            </List>

            {/* Dialog for creating a new link table */}
            <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} fullWidth maxWidth="sm">
                <DialogTitle>Create New Link Table</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Link Table Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={linkTableName}
                        onChange={e => setLinkTableName(e.target.value)}
                    />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>From Table</InputLabel>
                        <Select
                            value={fromTableId || ''}
                            label="From Table"
                            onChange={e => setFromTableId(Number(e.target.value))}>
                            {tables &&
                                tables.map((table: any) => (
                                    <MenuItem key={table.id} value={table.id}>
                                        {table.name}
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>To Table</InputLabel>
                        <Select
                            value={toTableId || ''}
                            label="To Table"
                            onChange={e => setToTableId(Number(e.target.value))}>
                            {tables &&
                                tables.map((table: any) => (
                                    <MenuItem key={table.id} value={table.id}>
                                        {table.name}
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleCreateLinkTable} variant="contained" color="primary">
                        Create Link Table
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ColumnListModal for link table columns */}
            {selectedLinkTable && (
                <ColumnListModal
                    open={openColumnList}
                    handleClose={handleCloseColumnList}
                    tableName={selectedLinkTable.name}
                    tableId={selectedLinkTable.id}
                    isLinkTable={true}
                />
            )}
        </Box>
    );
};

export default LinkTableManagement;
