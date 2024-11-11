import {useQuery, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';
import useWebSocketConnection from './useWebSocket';
import {Column, EnumRead} from '../types';

interface Schema {
    [tableName: string]: {
        columns: Column[];
        relationships: {
            from: {
                relationship: string;
                to_table: string;
                relationship_type: string;
                attributes: any[];
            }[];
            to: {
                relationship: string;
                from_table: string;
                relationship_type: string;
                attributes: any[];
            }[];
        };
    };
}

const useSchema = () => {
    const queryClient = useQueryClient();

    const {
        data: schema,
        isLoading,
        error,
    } = useQuery<Schema, Error>({
        queryKey: ['schema'],
        queryFn: async () => {
            const response = await axios.get(`/current_schema/`);
            return response.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    const {data: enums} = useQuery<EnumRead[], Error>({
        queryKey: ['enums'],
        queryFn: async () => {
            const response = await axios.get(`/enums/`);
            return response.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    const handleWebSocketMessage = (message: any) => {
        if (message.type === 'schema_update') {
            queryClient.invalidateQueries({queryKey: ['schema']});
            if (
                message.action === 'create_enum' ||
                message.action === 'delete_enum' ||
                message.action === 'add_enum_value' ||
                message.action === 'remove_enum_value'
            ) {
                queryClient.invalidateQueries({queryKey: ['enums']});
            }
            // Handle other schema updates like create_column, delete_column, etc.
        }
    };

    useWebSocketConnection(handleWebSocketMessage);

    return {schema, isLoading, error, enums};
};

export default useSchema;
