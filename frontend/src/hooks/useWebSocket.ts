import {useEffect} from 'react';
import {useAuth} from '../contexts/AuthContext';

type MessageHandler = (message: any) => void;

const useWebSocket = (onMessage: MessageHandler) => {
    const {token} = useAuth();

    useEffect(() => {
        if (!token) {
            console.error('WebSocket connection failed: No authentication token found.');
            return;
        }

        const wsUrl = `${process.env.WS_URL || 'ws://localhost:8888/ws'}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            // No need to send the token here, as it's included in the URL
        };

        ws.onmessage = event => {
            try {
                const message = JSON.parse(event.data);
                onMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Optionally implement reconnection logic here
        };

        ws.onerror = error => {
            console.error('WebSocket error:', error);
        };

        return () => {
            ws.close();
        };
    }, [token, onMessage]); // Added token and onMessage to the dependency array
};

export default useWebSocket;
