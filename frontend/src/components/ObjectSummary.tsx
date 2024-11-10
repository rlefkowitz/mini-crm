import React, {useEffect, useState} from 'react';
import axios from '../utils/axiosConfig';
import {List, ListItem, ListItemText, Typography, Divider, Paper} from '@mui/material';
import {RelationshipRead, Record} from '../types';

interface ObjectSummaryProps {
    tableName: string;
    recordId: number;
}

const ObjectSummary: React.FC<ObjectSummaryProps> = ({tableName, recordId}) => {
    const [relationships, setRelationships] = useState<RelationshipRead[]>([]);
    const [relatedData, setRelatedData] = useState<{[key: string]: Record[]}>({});

    const fetchRelationships = async () => {
        try {
            const response = await axios.get(`${process.env.API_BASE_URL}/relationships/`);
            setRelationships(response.data);
        } catch (error) {
            console.error('Error fetching relationships:', error);
        }
    };

    const fetchRelatedData = async (relationship: RelationshipRead) => {
        try {
            // const relTable = relationship.name.toLowerCase();
            const fromField = `${relationship.from_table.toLowerCase()}_id`;
            const toField = `${relationship.to_table.toLowerCase()}_id`;
            const isFrom = relationship.from_table === tableName;
            const queryParam = isFrom ? fromField : toField;
            // const relatedTable = isFrom ? relationship.to_table : relationship.from_table;

            const response = await axios.get(`${process.env.API_BASE_URL}/records/${relationship.name}/`, {
                params: {[queryParam]: recordId},
            });

            setRelatedData(prev => ({
                ...prev,
                [relationship.name]: response.data,
            }));
        } catch (error) {
            console.error('Error fetching related data:', error);
        }
    };

    useEffect(() => {
        fetchRelationships();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableName, recordId]);

    useEffect(() => {
        relationships.forEach(rel => {
            fetchRelatedData(rel);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [relationships]);

    return (
        <Paper elevation={3} style={{padding: '1rem', marginLeft: '1rem'}}>
            <Typography variant="h6">Related Objects</Typography>
            <Divider style={{margin: '0.5rem 0'}} />
            {relationships
                .filter(rel => rel.from_table === tableName || rel.to_table === tableName)
                .map(rel => (
                    <div key={rel.id} style={{marginBottom: '1rem'}}>
                        <Typography variant="subtitle1">{rel.name}</Typography>
                        <List dense>
                            {relatedData[rel.name]?.map(record => (
                                <ListItem key={record.id}>
                                    <ListItemText primary={`ID: ${record.id}`} secondary={JSON.stringify(record)} />
                                </ListItem>
                            ))}
                            {(!relatedData[rel.name] || relatedData[rel.name].length === 0) && (
                                <ListItem>
                                    <ListItemText primary="No related records found." />
                                </ListItem>
                            )}
                        </List>
                    </div>
                ))}
        </Paper>
    );
};

export default ObjectSummary;
