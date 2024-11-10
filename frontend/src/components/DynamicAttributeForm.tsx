import React from 'react';
import {
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    IconButton,
    Typography,
} from '@mui/material';
import {AddCircle, RemoveCircle} from '@mui/icons-material';

interface Attribute {
    name: string;
    data_type: string;
    constraints?: string;
}

interface Props {
    attributes: Attribute[];
    onChange: (attributes: Attribute[]) => void;
}

const dataTypes = ['string', 'integer', 'currency', 'enum', 'picklist'];

const DynamicAttributeForm: React.FC<Props> = ({attributes, onChange}) => {
    const handleAttributeChange = (index: number, field: string, value: string) => {
        const newAttributes = [...attributes];
        newAttributes[index] = {...newAttributes[index], [field]: value};
        onChange(newAttributes);
    };

    const handleAddAttribute = () => {
        onChange([...attributes, {name: '', data_type: 'string', constraints: ''}]);
    };

    const handleRemoveAttribute = (index: number) => {
        const newAttributes = attributes.filter((_, i) => i !== index);
        onChange(newAttributes);
    };

    return (
        <div style={{marginTop: '1rem'}}>
            <Typography variant="h6">Relationship Attributes</Typography>
            {attributes.map((attr, index) => (
                <Grid container spacing={2} alignItems="center" key={index} style={{marginBottom: '0.5rem'}}>
                    <Grid item xs={4}>
                        <TextField
                            label="Attribute Name"
                            variant="outlined"
                            fullWidth
                            value={attr.name}
                            onChange={e => handleAttributeChange(index, 'name', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={3}>
                        <FormControl fullWidth variant="outlined">
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
                    <Grid item xs={4}>
                        <TextField
                            label="Constraints"
                            variant="outlined"
                            fullWidth
                            value={attr.constraints}
                            onChange={e => handleAttributeChange(index, 'constraints', e.target.value)}
                            helperText='JSON format, e.g., {"required": true}'
                        />
                    </Grid>
                    <Grid item xs={1}>
                        <IconButton color="secondary" onClick={() => handleRemoveAttribute(index)}>
                            <RemoveCircle />
                        </IconButton>
                    </Grid>
                </Grid>
            ))}
            <Button variant="outlined" startIcon={<AddCircle />} onClick={handleAddAttribute}>
                Add Attribute
            </Button>
        </div>
    );
};

export default DynamicAttributeForm;
