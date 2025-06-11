# Example: templates/fastapi/example_models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
# For UUID, import it if needed:
# from sqlalchemy.dialects.postgresql import UUID
# import uuid

Base = declarative_base()

# Example of a User model structure (LLM will generate actual models based on schema)
# class User(Base):
#     __tablename__ = "users"
#
#     id = Column(Integer, primary_key=True, index=True)
#     username = Column(String, unique=True, index=True)
#     email = Column(String, unique=True, index=True)
#     hashed_password = Column(String)
#     is_active = Column(Boolean, default=True)
#
#     # Example relationship
#     # posts = relationship("Post", back_populates="owner")

# class Post(Base):
#     __tablename__ = "posts"
#
#     id = Column(Integer, primary_key=True, index=True)
#     title = Column(String, index=True)
#     content = Column(Text)
#     owner_id = Column(Integer, ForeignKey("users.id"))
#
#     # owner = relationship("User", back_populates="posts")