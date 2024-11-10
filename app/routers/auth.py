from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.user import User
from app.schemas.auth import Token, UserLogin, UserRegister

router = APIRouter()

# Secret key generation (should be stored securely in environment variables)
SECRET_KEY = "your_secret_key_here"  # Replace with a strong secret key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def authenticate_user(session: Session, username: str, password: str):
    user = session.exec(select(User).where(User.name == username)).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
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


@router.post("/auth/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.name})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/register", response_model=Token)
def register_user(user: UserRegister, session: Session = Depends(get_session)):
    existing_user = session.exec(
        select(User).where((User.name == user.name) | (User.email == user.email))
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400, detail="Username or email already registered"
        )
    hashed_password = get_password_hash(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password,
        company_id=None,  # Set to a default company if applicable
    )
    session.add(db_user)
    try:
        session.commit()
        session.refresh(db_user)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="User registration failed") from e
    access_token = create_access_token(data={"sub": db_user.name})
    return {"access_token": access_token, "token_type": "bearer"}
