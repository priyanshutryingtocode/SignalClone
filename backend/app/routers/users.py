from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.core.deps import get_current_user
from app import models, schemas

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[schemas.UserOut])
def search_users(
    q: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    results = (
        db.query(models.User)
        .filter(
            models.User.id != current_user.id,
            or_(
                models.User.username.ilike(f"%{q}%"),
                models.User.phone_number.ilike(f"%{q}%"),
                models.User.display_name.ilike(f"%{q}%"),
            ),
        )
        .limit(20)
        .all()
    )
    return results
