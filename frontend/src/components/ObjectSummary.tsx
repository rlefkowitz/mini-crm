import React, {useEffect, useState} from 'react';
import axios from '../utils/axiosConfig';
import {Typography, Divider, Paper} from '@mui/material';
import {Record, LinkTableSchema, ColumnSchema} from '../types';
import useSchema from '../hooks/useSchema';
import {DataGrid, GridColDef} from '@mui/x-data-grid';

/**
 * Props for the ObjectSummary component.
 */
interface ObjectSummaryProps {
    tableName: string;
    recordId: number;
}

const ObjectSummary: React.FC<ObjectSummaryProps> = ({tableName, recordId}) => {
    const [relatedData, setRelatedData] = useState<{
        [key: string]: Record[];
    }>({});
    const {schema} = useSchema();

    /**
     * Fetch related records based on link tables.
     */
    const fetchRelatedData = async () => {
        if (!schema || !schema[tableName]) return;
        const linkTables = schema[tableName].link_tables;
        for (const linkTable of linkTables) {
            try {
                const response = await axios.get(`/records/${linkTable.name}/`, {
                    params: {
                        [`${tableName}_id`]: recordId,
                    },
                });
                const flattenedRecords = response.data.map((record: Record) => ({
                    id: record.id,
                    ...record.data,
                }));
                setRelatedData(prev => ({
                    ...prev,
                    [linkTable.name]: flattenedRecords,
                }));
            } catch (error) {
                console.error(`Error fetching related data for ${linkTable.name}:`, error);
            }
        }
    };

    useEffect(() => {
        fetchRelatedData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, tableName, recordId]);

    /**
     * Generates column definitions for the DataGrid based on link table schema.
     */
    const getColumnDefsForLinkTable = (linkTable: LinkTableSchema): GridColDef[] => {
        const relatedTableName = linkTable.from_table === tableName ? linkTable.to_table : linkTable.from_table;
        const relatedTableSchema = schema?.[relatedTableName];

        if (!relatedTableSchema) {
            console.error(`Schema for table ${relatedTableName} not found.`);
            return [];
        }

        const relatedColumns = relatedTableSchema.columns;

        const cols: GridColDef[] = relatedColumns.map((col: ColumnSchema) => ({
            headerName: col.name,
            field: col.name,
            sortable: true,
            flex: 1,
            renderCell: params => {
                const value = params.value;
                if (col.data_type === 'reference') {
                    const referenceTableName = col.reference_table;
                    const referenceTableSchema = schema?.[referenceTableName || ''];
                    if (referenceTableSchema && value && typeof value === 'object') {
                        // Use the display_format to format the display value
                        return formatDisplayValue(referenceTableSchema.display_format || '{id}', value);
                    }
                    // If value is not an object or display_format not available
                    return value?.display_value || value || '';
                }

                if (col.is_list) {
                    if (Array.isArray(value)) {
                        return value.join(', ');
                    }
                    return '';
                }

                return value;
            },
        }));

        return cols;
    };

    /**
     * Formats the display value based on the provided format string.
     */
    const formatDisplayValue = (format: string, data: any): string => {
        return format.replace(/{(.*?)}/g, (match, key) => {
            return data?.data?.[key.trim()] || '';
        });
    };

    return (
        <Paper elevation={3} style={{padding: '1rem', marginTop: '1rem'}}>
            <Typography variant="h6">Related Objects</Typography>
            <Divider style={{margin: '0.5rem 0'}} />
            {Object.keys(relatedData).length === 0 && (
                <Typography variant="body1">No related objects found.</Typography>
            )}
            {Object.entries(relatedData).map(([linkTableName, records]) => {
                const linkTable = schema?.[tableName]?.link_tables.find(lt => lt.name === linkTableName);
                if (!linkTable) return null;

                return (
                    <div key={linkTableName} style={{marginBottom: '1rem'}}>
                        <Typography variant="subtitle1">{linkTableName}</Typography>
                        <div style={{height: 300, width: '100%'}}>
                            <DataGrid rows={records} columns={getColumnDefsForLinkTable(linkTable)} autoHeight />
                        </div>
                    </div>
                );
            })}
        </Paper>
    );
};

export default ObjectSummary;
