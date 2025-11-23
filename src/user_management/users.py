# Project: backend
# Author: DAK
# Date: 23-03-2025
# Description: 

"""
File: users
Purpose: 
"""
import base64

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

import utils.password_utils
from config.db import get_db
from database.db_models import Users, Roles
# from schema.schema import UserSchema
import json

from schema.schema import EmployeeSchema, StudentCreate, EmployeeUpdateSchema, StudentUpdate
from utils.password_utils import Password_Encoder

encoder = Password_Encoder()
router = APIRouter()


@router.get("/students")
async def read_students(db: Session = Depends(get_db)):
    try:
        users = db.query(Users).filter(Users.role == 3).all()
        if not users:
            return {"status_code":"400", "detail":"No Students found"}

        for user in users:
            user.preference = json.dumps(user.preference)

        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")


@router.get("/teachers")
async def read_teachers(db: Session = Depends(get_db)):
    try:
        users = db.query(Users).filter(Users.role.in_([2, 4])).all()
        if not users:
            return {"status_code": "400", "detail": "No teachers found"}

        result = []
        for user in users:
            # Get role name from Roles table
            role = db.query(Roles).filter(Roles.id == user.role).first()
            role_name = role.type if role else "Unknown"

            # Convert preference to JSON string if it's a dict
            preference = user.preference
            if isinstance(preference, dict):
                preference = json.dumps(preference)

            result.append({
                "id": user.id,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "username": user.email,
                "empId": user.unique_id,
                "profilePhoto": user.photo_blob,
                "role": role_name,
                "preference": preference
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")



@router.post("/create_teacher")
def create_user(user: EmployeeSchema, db: Session = Depends(get_db)):
    existing_user = db.query(Users).filter(Users.email == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    passwordEncoder = Password_Encoder()
    hash_password = passwordEncoder.create_password_hash(user.password)

    photo_data = user.profilePhoto
    if photo_data and photo_data.startswith("data:image"):
        photo_data = photo_data.split(",")[1]

    try:
        base64.b64decode(photo_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    new_user = Users(
        firstname=user.firstname,
        lastname=user.lastname,
        photo_blob=photo_data,
        unique_id=user.empId,
        email=user.username,
        preference= json.dumps({"dark_theme": "true", "color": "green"}),
        password=hash_password,
        role=int(user.role),
        status=int(user.status),
        created_at=datetime.utcnow(),
        teacher_type=int(user.teacher_type),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully", "user_id": new_user.id}


@router.put("/update-teacher")
async def update_teacher(payload: EmployeeUpdateSchema, db: Session = Depends(get_db)):
    try:
        user = db.query(Users).filter(Users.unique_id == int(payload.empId)).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.firstname = payload.firstname
        user.lastname = payload.lastname
        user.email = payload.username
        user.role = int(payload.role)
        user.status = int(payload.status)
        user.photo_blob = payload.profilePhoto or user.photo_blob
        if user.password:
            passwordEncoder = Password_Encoder()
            hash_password = passwordEncoder.create_password_hash(payload.password)
            user.password = hash_password


        db.commit()
        db.refresh(user)

        return {"status_code": 200, "message": "User updated successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")


@router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    try:
        teacher = db.query(Users).filter(Users.id == teacher_id, Users.role.in_([2, 4])).first()

        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")

        db.delete(teacher)
        db.commit()

        return {"message": "Teacher deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting teacher: {str(e)}")



@router.post("/create-students")
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    existing_user = db.query(Users).filter(Users.email == student.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Student already exists")

    password_encoder = Password_Encoder()
    hashed_password = password_encoder.create_password_hash(student.password)

    new_student = Users(
        firstname=student.firstname,
        lastname=student.lastname,
        email=student.username,
        unique_id=student.regNo,
        semester=student.semester,
        password=hashed_password,
        role=3,
        status=student.status,
        preference=json.dumps({"dark_theme": "true", "color": "blue"}),
        created_at=datetime.utcnow(),
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return {"message": "Student created successfully", "student_id": new_student.id}


@router.put("/students/update")
def update_student(data: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Users).filter(Users.id == data.id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.firstname = data.firstname
    student.lastname = data.lastname
    student.email = data.username
    student.unique_id = data.empId
    student.semester = data.semester
    student.status = data.status

    if data.password:
        encoder = Password_Encoder()
        student.password = encoder.create_password_hash(data.password)

    student.last_login = datetime.utcnow()

    db.commit()
    db.refresh(student)

    return {"message": "Student updated successfully", "student_id": student.id}


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Users).filter(Users.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(student)
    db.commit()

    return {"message": "Student deleted successfully"}