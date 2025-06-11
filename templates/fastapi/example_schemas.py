# Example: templates/fastapi/example_schemas.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date # Ensure date is also imported if used
import uuid # For UUID type

# Base model for common attributes, if any (optional)
# class ItemBase(BaseModel):
#     description: Optional[str] = None

# --- User Schemas Example ---
# Schema for creating a User (request body for POST)
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    # Add other fields that are common to User creation and reading, but not password

class UserCreate(UserBase):
    password: str # Password only for creation

# Schema for updating a User (request body for PUT)
# All fields are optional for partial updates
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None # Optional if password change is allowed here
    is_active: Optional[bool] = None

# Schema for reading/returning a User (response body for GET)
class User(UserBase): # Inherits username, email from UserBase
    id: int # Or uuid.UUID if that's your PK type
    is_active: bool
    # posts: List['Post'] = [] # Example of a relationship, forward reference with quotes

    model_config = {
        "from_attributes": True  # For Pydantic V2 (replaces orm_mode = True)
    }


# --- Post Schemas Example (assuming a Post entity related to User) ---
class PostBase(BaseModel):
    title: str
    content: Optional[str] = None

class PostCreate(PostBase):
    # owner_id: int # If you pass owner_id directly during creation
    pass # Add other fields specific to Post creation if any

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class Post(PostBase):
    id: int # Or uuid.UUID
    owner_id: int # The foreign key
    # owner: Optional[User] = None # To include the owner details when returning a Post

    model_config = {
        "from_attributes": True
    }
