from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app import models, schemas

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[schemas.ContactOut])
def list_contacts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    contacts = db.query(models.Contact).filter(models.Contact.owner_id == current_user.id).all()
    out = []
    for c in contacts:
        user = db.get(models.User, c.contact_user_id)
        out.append(schemas.ContactOut(id=c.id, nickname=c.nickname, user=schemas.UserOut.model_validate(user)))
    return out


@router.post("", response_model=schemas.ContactOut)
def add_contact(
    payload: schemas.ContactCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.contact_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    target = db.get(models.User, payload.contact_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(models.Contact).filter(
        models.Contact.owner_id == current_user.id,
        models.Contact.contact_user_id == payload.contact_user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a contact")

    contact = models.Contact(
        owner_id=current_user.id,
        contact_user_id=payload.contact_user_id,
        nickname=payload.nickname,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return schemas.ContactOut(id=contact.id, nickname=contact.nickname, user=schemas.UserOut.model_validate(target))


@router.delete("/{contact_id}")
def remove_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    contact = db.get(models.Contact, contact_id)
    if not contact or contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"ok": True}
