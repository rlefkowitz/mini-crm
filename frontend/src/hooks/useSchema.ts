import {useQuery, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';
import useWebSocketConnection from './useWebSocket';
import {Column, EnumRead, RelationshipRead} from '../types';

interface Schema {
    [tableName: string]: {
        columns: Column[];
        relationships: {
            from: RelationshipRead[]; // Relationships originating from this table
            to: RelationshipRead[]; // Relationships pointing to this table
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
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const {data: enums} = useQuery<EnumRead[], Error>({
        queryKey: ['enums'],
        queryFn: async () => {
            const response = await axios.get(`/enums/`);
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const handleWebSocketMessage = (message: any) => {
        if (message.type === 'schema_update') {
            const action = message.action;

            switch (action) {
                // Enum-related actions
                case 'create_enum':
                case 'delete_enum':
                case 'add_enum_value':
                case 'remove_enum_value':
                    queryClient.invalidateQueries({queryKey: ['enums']});
                    break;

                // Table-related actions
                case 'create_table':
                case 'update_table':
                case 'delete_table':
                    queryClient.invalidateQueries({queryKey: ['schema']});
                    break;

                // Column-related actions
                case 'create_column':
                case 'update_column':
                case 'delete_column':
                    queryClient.invalidateQueries({queryKey: ['schema']});
                    break;

                // Relationship-related actions
                case 'create_relationship':
                case 'update_relationship':
                case 'delete_relationship':
                    queryClient.invalidateQueries({queryKey: ['schema']});
                    break;

                default:
                    console.warn(`Unhandled schema update action: ${action}`);
            }
        }
    };

    useWebSocketConnection(handleWebSocketMessage);

    return {schema, isLoading, error, enums};
};

export default useSchema;
