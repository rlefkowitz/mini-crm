import React, {useState} from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    IconButton,
} from '@mui/material';
import {AddCircle, RemoveCircle} from '@mui/icons-material';

interface Attribute {
    name: string;
    data_type: string;
    constraints?: string;
    required: boolean;
    unique: boolean;
}

interface Props {
    open: boolean;
    handleClose: () => void;
    onSave: (attributes: Attribute[]) => void;
}

const dataTypes = ['string', 'integer', 'currency', 'enum', 'picklist'];

const DynamicFormEditor: React.FC<Props> = ({open, handleClose, onSave}) => {
    const [attributes, setAttributes] = useState<Attribute[]>([
        {name: '', data_type: 'string', constraints: '', required: false, unique: false},
    ]);

    const handleAttributeChange = (index: number, field: keyof Attribute, value: any) => {
        const newAttributes = [...attributes];
        newAttributes[index] = {...newAttributes[index], [field]: value};
        setAttributes(newAttributes);
    };

    const handleAddAttribute = () => {
        setAttributes([
            ...attributes,
            {name: '', data_type: 'string', constraints: '', required: false, unique: false},
        ]);
    };

    const handleRemoveAttribute = (index: number) => {
        const newAttributes = attributes.filter((_, i) => i !== index);
        setAttributes(newAttributes);
    };

    const handleSave = () => {
        // Validate that required fields are filled
        for (const attr of attributes) {
            if (!attr.name || !attr.data_type) {
                alert('Please fill out all required fields.');
                return;
            }
        }
        onSave(attributes);
        handleClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle>Dynamic Form Editor</DialogTitle>
            <DialogContent>
                {attributes.map((attr, index) => (
                    <Grid container spacing={2} alignItems="center" key={index} style={{marginBottom: '0.5rem'}}>
                        <Grid item xs={3}>
                            <TextField
                                label="Attribute Name"
                                variant="outlined"
                                fullWidth
                                value={attr.name}
                                onChange={e => handleAttributeChange(index, 'name', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={2}>
                            <FormControl fullWidth variant="outlined" required>
                                <InputLabel>Data Type</InputLabel>
                                <Select
                                    value={attr.data_type}
                                    label="Data Type"
                                    onChange={e => handleAttributeChange(index, 'data_type', e.target.value as string)}>
                                    {dataTypes.map(type => (
                                        <MenuItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={3}>
                            <TextField
                                label="Constraints"
                                variant="outlined"
                                fullWidth
                                value={attr.constraints}
                                onChange={e => handleAttributeChange(index, 'constraints', e.target.value)}
                                helperText='e.g., "CHECK (value > 0)"'
                            />
                        </Grid>
                        <Grid item xs={1}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={attr.required}
                                        onChange={e => handleAttributeChange(index, 'required', e.target.checked)}
                                    />
                                }
                                label="Required"
                            />
                        </Grid>
                        <Grid item xs={1}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={attr.unique}
                                        onChange={e => handleAttributeChange(index, 'unique', e.target.checked)}
                                    />
                                }
                                label="Unique"
                            />
                        </Grid>
                        <Grid item xs={2}>
                            <IconButton color="secondary" onClick={() => handleRemoveAttribute(index)}>
                                <RemoveCircle />
                            </IconButton>
                        </Grid>
                    </Grid>
                ))}
                <Button variant="outlined" startIcon={<AddCircle />} onClick={handleAddAttribute}>
                    Add Attribute
                </Button>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">
                    Cancel
                </Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DynamicFormEditor;
