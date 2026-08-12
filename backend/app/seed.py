"""
Populate the database with demo data so the app isn't empty on first look.

Run after the backend has started at least once (or it'll create tables itself):
    python -m app.seed

Creates:
  - 4 users: alice / bob / carol / dave  (password for all: "password123")
  - alice <-> bob as contacts + a DM with a short conversation
  - a "Weekend Trip" group (alice=admin, bob, carol, dave) with a few messages
Safe to re-run: it skips creation if the users already exist.
"""

from datetime import datetime, timedelta, timezone

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import hash_password
from app import models

Base.metadata.create_all(bind=engine)

DEMO_USERS = [
    {"phone_number": "+15550000001", "username": "alice", "display_name": "Alice Chen"},
    {"phone_number": "+15550000002", "username": "bob", "display_name": "Bob Martinez"},
    {"phone_number": "+15550000003", "username": "carol", "display_name": "Carol Nguyen"},
    {"phone_number": "+15550000004", "username": "dave", "display_name": "Dave Okafor"},
]
DEMO_PASSWORD = "password123"


def get_or_create_user(db, data: dict) -> models.User:
    existing = db.query(models.User).filter(models.User.username == data["username"]).first()
    if existing:
        return existing
    user = models.User(
        phone_number=data["phone_number"],
        username=data["username"],
        display_name=data["display_name"],
        password_hash=hash_password(DEMO_PASSWORD),
    )
    db.add(user)
    db.flush()
    return user


def main():
    db = SessionLocal()
    try:
        users = {d["username"]: get_or_create_user(db, d) for d in DEMO_USERS}
        db.commit()
        alice, bob, carol, dave = users["alice"], users["bob"], users["carol"], users["dave"]

        # --- contacts: alice <-> bob ---
        if not db.query(models.Contact).filter(
            models.Contact.owner_id == alice.id, models.Contact.contact_user_id == bob.id
        ).first():
            db.add(models.Contact(owner_id=alice.id, contact_user_id=bob.id))
            db.add(models.Contact(owner_id=bob.id, contact_user_id=alice.id))
            db.commit()

        # --- DM: alice <-> bob ---
        existing_dm = None
        direct_convs = db.query(models.Conversation).filter(
            models.Conversation.type == models.ConversationType.direct
        ).all()
        for c in direct_convs:
            ids = {p.user_id for p in c.participants}
            if ids == {alice.id, bob.id}:
                existing_dm = c
                break

        if not existing_dm:
            dm = models.Conversation(type=models.ConversationType.direct, created_by=alice.id)
            db.add(dm)
            db.flush()
            db.add(models.ConversationParticipant(conversation_id=dm.id, user_id=alice.id))
            db.add(models.ConversationParticipant(conversation_id=dm.id, user_id=bob.id))
            db.flush()

            base_time = datetime.now(timezone.utc) - timedelta(hours=2)
            dm_messages = [
                (alice.id, "hey bob! are we still on for the weekend trip?"),
                (bob.id, "yeah! just gotta sort out who's driving"),
                (alice.id, "I can drive, just let me know what time works"),
                (bob.id, "let's do 9am saturday, I'll check with carol and dave"),
            ]
            last_msg = None
            for i, (sender_id, content) in enumerate(dm_messages):
                msg = models.Message(
                    conversation_id=dm.id,
                    sender_id=sender_id,
                    content_ciphertext=content,
                    created_at=base_time + timedelta(minutes=i * 4),
                )
                db.add(msg)
                db.flush()
                last_msg = msg
                other_id = bob.id if sender_id == alice.id else alice.id
                db.add(models.MessageStatus(message_id=msg.id, user_id=other_id, status=models.MessageStatusEnum.read))

            db.commit()

        # --- group: Weekend Trip ---
        existing_group = db.query(models.Conversation).filter(
            models.Conversation.type == models.ConversationType.group,
            models.Conversation.name == "Weekend Trip",
        ).first()

        if not existing_group:
            group = models.Conversation(type=models.ConversationType.group, name="Weekend Trip", created_by=alice.id)
            db.add(group)
            db.flush()
            db.add(models.ConversationParticipant(conversation_id=group.id, user_id=alice.id, role=models.ParticipantRole.admin))
            for u in (bob, carol, dave):
                db.add(models.ConversationParticipant(conversation_id=group.id, user_id=u.id))
            db.flush()

            base_time = datetime.now(timezone.utc) - timedelta(hours=1)
            db.add(models.Message(
                conversation_id=group.id, sender_id=alice.id,
                content_ciphertext="Alice created the group", content_type=models.ContentType.system,
                created_at=base_time,
            ))
            group_messages = [
                (alice.id, "welcome to the trip planning group!"),
                (carol.id, "excited!! what should I bring"),
                (dave.id, "I've got a cooler and folding chairs covered"),
                (bob.id, "9am saturday pickup, I'll message the address"),
            ]
            for i, (sender_id, content) in enumerate(group_messages):
                db.add(models.Message(
                    conversation_id=group.id,
                    sender_id=sender_id,
                    content_ciphertext=content,
                    created_at=base_time + timedelta(minutes=(i + 1) * 5),
                ))
            db.commit()

        print("Seed complete. Demo accounts (password for all: 'password123'):")
        for d in DEMO_USERS:
            print(f"  - username: {d['username']:<8} phone: {d['phone_number']}")

    finally:
        db.close()


if __name__ == "__main__":
    main()