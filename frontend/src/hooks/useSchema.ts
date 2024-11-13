import {useQuery, useQueryClient} from '@tanstack/react-query';
import axios from '../utils/axiosConfig';
import useWebSocketConnection from './useWebSocket';
import {Schema, Enum} from '../types';
import {useAuth} from '../contexts/AuthContext';

/**
 * Custom hook to fetch and manage the CRM schema and enums.
 */
const useSchema = () => {
    const queryClient = useQueryClient();
    const {isAuthenticated} = useAuth();

    /**
     * Fetches the current schema from the backend.
     */
    const {
        data: schema,
        isLoading,
        error,
    } = useQuery<Schema, Error>({
        queryKey: ['schema'],
        queryFn: async () => {
            const response = await axios.get(`/current_schema/`);
            return response.data.data_schema; // Ensure this matches the Schema interface
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: isAuthenticated,
    });

    /**
     * Fetches enums from the backend.
     */
    const {data: enums} = useQuery<EnumRead[], Error>({
        queryKey: ['enums'],
        queryFn: async () => {
            const response = await axios.get(`/enums/`);
            return response.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: isAuthenticated,
    });

    /**
     * Handles incoming WebSocket messages to invalidate queries as needed.
     */
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

    // Establish WebSocket connection and listen for messages
    useWebSocketConnection(handleWebSocketMessage);

    return {schema, isLoading, error, enums};
};

export default useSchema;
