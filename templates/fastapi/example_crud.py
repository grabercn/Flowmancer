# Example: templates/fastapi/example_crud.py
from sqlalchemy.orm import Session
from . import models, schemas # Assuming models.py and schemas.py will be generated

# Example CRUD functions for a "User" entity
# def get_user(db: Session, user_id: int):
#     return db.query(models.User).filter(models.User.id == user_id).first()

# def get_user_by_email(db: Session, email: str):
#     return db.query(models.User).filter(models.User.email == email).first()

# def get_users(db: Session, skip: int = 0, limit: int = 100):
#     return db.query(models.User).offset(skip).limit(limit).all()

# def create_user(db: Session, user: schemas.UserCreate):
#     # In a real app, hash the password before saving
#     fake_hashed_password = user.password + "notreallyhashed"
#     db_user = models.User(email=user.email, hashed_password=fake_hashed_password, username=user.username)
#     db.add(db_user)
#     db.commit()
#     db.refresh(db_user)
#     return db_user

# Add similar CRUD functions for other entities the LLM will generate