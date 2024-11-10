from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.user import User
from app.routers.auth import ALGORITHM, SECRET_KEY

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("WebSocket connected")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print("WebSocket disconnected")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


def decode_token(token: str, session: Session) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials for WebSocket connection",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = session.exec(select(User).where(User.name == username)).first()
    if user is None:
        raise credentials_exception
    return user


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    session = next(get_session())
    try:
        user = decode_token(token, session)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming data if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        session.close()
