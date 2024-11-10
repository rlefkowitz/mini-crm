import React from 'react';
import {Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography} from '@mui/material';

interface ConfirmDeleteDialogProps {
    open: boolean;
    handleClose: () => void;
    handleConfirm: () => void;
    itemName: string;
    itemType: string;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
    open,
    handleClose,
    handleConfirm,
    itemName,
    itemType,
}) => {
    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent>
                <Typography>
                    Are you sure you want to delete the {itemType} "<strong>{itemName}</strong>"? This action cannot be
                    undone.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleConfirm} color="error" variant="contained">
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDeleteDialog;
