import { useEffect } from 'react';

type MessageHandler = (message: any) => void;

const useWebSocket = (onMessage: MessageHandler) => {
    useEffect(() => {
        const ws = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws');

        ws.onopen = () => {
            console.log('WebSocket connected');
            // If your backend requires authentication tokens, send them here
            // ws.send(JSON.stringify({ type: 'authenticate', token: 'your_token' }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                onMessage(message);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Optionally implement reconnection logic here
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            ws.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};

export default useWebSocket;
