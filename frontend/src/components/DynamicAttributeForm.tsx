import React from 'react';
import {Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, IconButton} from '@mui/material';
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
    const handleAttributeChange = (index: number, field: keyof Attribute, value: any) => {
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
        <div>
            {attributes.map((attr, index) => (
                <Grid container spacing={2} alignItems="center" key={index} sx={{mt: 1}}>
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
                    <Grid item xs={3}>
                        <FormControl fullWidth variant="outlined" required>
                            <InputLabel>Data Type</InputLabel>
                            <Select
                                label="Data Type"
                                value={attr.data_type}
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
                            helperText='e.g., "CHECK (value > 0)"'
                        />
                    </Grid>
                    <Grid item xs={2}>
                        <IconButton
                            color="secondary"
                            onClick={() => handleRemoveAttribute(index)}
                            disabled={attributes.length === 1}>
                            <RemoveCircle />
                        </IconButton>
                    </Grid>
                </Grid>
            ))}
            <Button variant="outlined" startIcon={<AddCircle />} onClick={handleAddAttribute} sx={{mt: 2}}>
                Add Attribute
            </Button>
        </div>
    );
};

export default DynamicAttributeForm;
