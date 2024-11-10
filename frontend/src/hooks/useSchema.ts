import {useEffect, useState} from 'react';
import axios from '../utils/axiosConfig';
import useWebSocketConnection from './useWebSocket';
import {TableRead, Column} from '../types';

interface Schema {
    [tableName: string]: {
        columns: Column[];
    };
}

const useSchema = () => {
    const [schema, setSchema] = useState<Schema>({});
    const [loading, setLoading] = useState<boolean>(true);

    const fetchSchema = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/tables/`);
            const tables: TableRead[] = response.data;
            const schemaData: Schema = {};

            for (const table of tables) {
                const columnsResponse = await axios.get(`/tables/${table.id}/columns/`);
                schemaData[table.name] = {columns: columnsResponse.data};
            }

            setSchema(schemaData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching schema:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchema();
    }, []);

    const handleWebSocketMessage = (message: any) => {
        if (message.type === 'schema_update') {
            if (message.action === 'add_column') {
                setSchema(prevSchema => {
                    const table = prevSchema[message.table];
                    if (table) {
                        return {
                            ...prevSchema,
                            [message.table]: {
                                columns: [
                                    ...table.columns,
                                    {
                                        id: message.column_id, // Ensure the backend sends `column_id`
                                        name: message.column,
                                        data_type: message.data_type,
                                        constraints: message.constraints,
                                        table_id: message.table_id, // Ensure the backend sends `table_id`
                                    },
                                ],
                            },
                        };
                    }
                    return prevSchema;
                });
            }
            // Handle other schema updates like delete_table if needed
        }
    };

    useWebSocketConnection(handleWebSocketMessage);

    return {schema, loading};
};

export default useSchema;
