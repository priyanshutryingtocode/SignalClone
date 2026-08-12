from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app import models, schemas

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if payload.otp != settings.MOCK_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    exists = db.query(models.User).filter(
        or_(models.User.phone_number == payload.phone_number, models.User.username == payload.username)
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Phone number or username already registered")

    user = models.User(
        phone_number=payload.phone_number,
        username=payload.username,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        or_(models.User.phone_number == payload.identifier, models.User.username == payload.identifier)
    ).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
