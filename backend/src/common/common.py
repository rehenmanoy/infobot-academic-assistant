# Project: backend
# Author: DAK
# Date: 24-03-2025
# Description: 

"""
File: common
Purpose: 
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.db import get_db
from database.db_models import Users, SubjectType


from utils.password_utils import Password_Encoder

encoder = Password_Encoder()
router = APIRouter()

@router.get("/subject-types")
def get_subject_types(db: Session = Depends(get_db)):
    types = db.query(SubjectType).filter(SubjectType.status == 1).all()
    return [{"id": t.id, "type": t.type} for t in types]


@router.get("/teachers-data")
def get_teachers(db: Session = Depends(get_db)):
    teachers = (
        db.query(Users)
        .filter(Users.role.in_([2, 4]), Users.status == 1)
        .all()
    )
    return [{"id": t.id, "name": f"{t.firstname} {t.lastname}"} for t in teachers]