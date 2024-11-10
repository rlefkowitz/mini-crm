import { useEffect, useState } from 'react';
import axios from 'axios';
import { TableSchema } from '../types';
import useWebSocket from './useWebSocket';

const useSchema = () => {
    const [schema, setSchema] = useState<TableSchema>({});
    const [loading, setLoading] = useState<boolean>(true);

    const fetchSchema = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/current_schema/`);
            setSchema(response.data);
        } catch (error) {
            console.error("Error fetching schema:", error);
        } finally {
            setLoading(false);
        }
    };

    useWebSocket((message) => {
        if (message.type === 'schema_update') {
            fetchSchema();
        }
        // Handle other message types if necessary
    });

    useEffect(() => {
        fetchSchema();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { schema, loading };
};

export default useSchema;
