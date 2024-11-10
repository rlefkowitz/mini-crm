import React, {useEffect, useState} from 'react';
import {
    Button,
    TextField,
    List,
    ListItem,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {Delete, Add} from '@mui/icons-material';
import axios from 'axios';
import {TableRead, Column, RelationshipRead} from '../types';
import DynamicForm from '../components/DynamicForm';
import useSchema from '../hooks/useSchema';
import ObjectSummary from '../components/ObjectSummary';

const SchemaView: React.FC = () => {
    const {schema, loading} = useSchema();
    const [tables, setTables] = useState<TableRead[]>([]);
    const [selectedTable, setSelectedTable] = useState<TableRead | null>(null);
    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [newTableName, setNewTableName] = useState<string>('');
    const [columns, setColumns] = useState<Column[]>([]);

    const fetchTables = async () => {
        try {
            const response = await axios.get(`${process.env.API_BASE_URL}/tables/`);
            setTables(response.data);
        } catch (error) {
            console.error('Error fetching tables:', error);
        }
    };

    useEffect(() => {
        fetchTables();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema]);

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewTableName('');
    };

    const handleCreateTable = async () => {
        try {
            await axios.post(`${process.env.API_BASE_URL}/tables/`, {name: newTableName});
            handleCloseDialog();
            fetchTables();
        } catch (error) {
            console.error('Error creating table:', error);
            // Optionally, display error messages to users
        }
    };

    const handleDeleteTable = async (tableId: number) => {
        try {
            await axios.delete(`${process.env.API_BASE_URL}/tables/${tableId}`);
            fetchTables();
            if (selectedTable?.id === tableId) setSelectedTable(null);
        } catch (error) {
            console.error('Error deleting table:', error);
            // Optionally, display error messages to users
        }
    };

    const handleSelectTable = (table: TableRead) => {
        setSelectedTable(table);
    };

    const handleAddColumn = () => {
        // Optionally, implement adding columns via UI
        // For simplicity, we'll handle columns via DynamicForm when a table is selected
    };

    return (
        <div style={{display: 'flex'}}>
            <div style={{flex: 3}}>
                <Typography variant="h4" gutterBottom>
                    Schema Management
                </Typography>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                    <TextField
                        label="Search Tables"
                        variant="outlined"
                        size="small"
                        // Implement search functionality if needed
                    />
                    <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleOpenDialog}>
                        Add New Table
                    </Button>
                </div>
                <List>
                    {tables.map(table => (
                        <ListItem
                            key={table.id}
                            button
                            selected={selectedTable?.id === table.id}
                            onClick={() => handleSelectTable(table)}
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteTable(table.id)}>
                                    <Delete />
                                </IconButton>
                            }>
                            <ListItemText primary={table.name} />
                        </ListItem>
                    ))}
                </List>

                {/* Dialog for creating a new table */}
                <Dialog open={openDialog} onClose={handleCloseDialog}>
                    <DialogTitle>Create New Table</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Table Name"
                            fullWidth
                            variant="outlined"
                            value={newTableName}
                            onChange={e => setNewTableName(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} color="secondary">
                            Cancel
                        </Button>
                        <Button onClick={handleCreateTable} color="primary" variant="contained">
                            Create
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Display selected table's columns */}
                {selectedTable && (
                    <div style={{marginTop: '2rem'}}>
                        <Typography variant="h5">{selectedTable.name} Columns</Typography>
                        {/* Fetch columns from schema */}
                        {schema[selectedTable.name]?.columns.map(col => (
                            <Typography key={col.id}>
                                - {col.name} ({col.data_type}) {col.constraints ? `| ${col.constraints}` : ''}
                            </Typography>
                        ))}
                        {/* Optionally, implement adding/removing columns */}
                    </div>
                )}
            </div>
            <div style={{flex: 1, paddingLeft: '1rem'}}>
                {selectedTable && (
                    <ObjectSummary tableName={selectedTable.name} recordId={0} />
                    // recordId can be dynamic based on user selection
                )}
            </div>
        </div>
    );
};

export default SchemaView;
