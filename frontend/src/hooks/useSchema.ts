import {useQuery, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';
import useWebSocketConnection from './useWebSocket';
import {Column, EnumRead} from '../types';
import {useAuth} from '../contexts/AuthContext';

interface Schema {
    [tableName: string]: {
        columns: Column[];
        link_tables: any[];
    };
}

const useSchema = () => {
    const queryClient = useQueryClient();
    const {isAuthenticated} = useAuth();

    const {
        data: schema,
        isLoading,
        error,
    } = useQuery<Schema, Error>({
        queryKey: ['schema'],
        queryFn: async () => {
            const response = await axios.get(`/current_schema/`);
            return response.data.data_schema;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: isAuthenticated,
    });

    const {data: enums} = useQuery<EnumRead[], Error>({
        queryKey: ['enums'],
        queryFn: async () => {
            const response = await axios.get(`/enums/`);
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: isAuthenticated,
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

                // Schema-related actions
                default:
                    queryClient.invalidateQueries({queryKey: ['schema']});
                    break;
            }
        }
    };

    useWebSocketConnection(handleWebSocketMessage);

    return {schema, isLoading, error, enums};
};

export default useSchema;
