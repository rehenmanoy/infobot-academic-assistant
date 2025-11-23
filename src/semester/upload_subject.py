# Project: backend
# Author: DAK
# Date: 24-03-2025
# Description: 

"""
File: upload_subject
Purpose: 
"""
from fastapi.staticfiles import StaticFiles

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database.db_models import Subject, SubjectType, Users
from schema.schema import SubjectBase, SubjectUpdate
from config.db import get_db
import base64
import os
from uuid import uuid4
from fastapi import Depends

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-semester")
def create_subject(payload: dict, db: Session = Depends(get_db)):
    data = payload.get("subject")
    if not data:
        raise HTTPException(status_code=400, detail="Missing subject data")

    try:
        file_data = base64.b64decode(data["file_content"])
        unique_filename = f"{uuid4().hex}_{data['file_name']}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as f:
            f.write(file_data)

        new_subject = Subject(
            semester=int(payload["semester"]),
            name=data["name"],
            type=data["type_id"],
            filename=unique_filename,
            teacher=data["teacher_id"],
            lecture_time=data["lecture_time"],
            theory_time=data["theory_time"],
            practical_time=data["practical_time"],
            credit=data["credit"],
            code=data["code"],
            notation=data["notation"],
            status=1
        )

        db.add(new_subject)
        db.commit()
        db.refresh(new_subject)
        return {"message": "Subject created", "id": new_subject.id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving subject: {str(e)}")


@router.put("/subject/{subject_id}")
def update_subject(subject_id: int, update_data: SubjectUpdate, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_dict = update_data.dict(exclude_unset=True)

    if "file_content" in update_dict and "file_name" in update_dict:
        try:
            file_data = base64.b64decode(update_dict["file_content"])
            unique_filename = f"{uuid4().hex}_{update_dict['file_name']}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            with open(file_path, "wb") as f:
                f.write(file_data)

            subject.filename = unique_filename
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save updated file: {str(e)}")

    for key, value in update_dict.items():
        if hasattr(subject, key) and key not in ["file_content", "file_name"]:
            setattr(subject, key, value)

    db.commit()
    db.refresh(subject)
    return {"message": "Subject updated", "id": subject.id}


@router.get("/subjects")
def get_subjects_by_semester(
    request: Request,
    semester: int = Query(..., description="Semester number to filter subjects"),
    db: Session = Depends(get_db)
):
    try:
        subjects = db.query(Subject).filter(Subject.semester == semester).all()

        if not subjects:
            raise HTTPException(status_code=404, detail=f"No subjects found for semester {semester}")

        result = []

        for sub in subjects:
            sub_type = db.query(SubjectType).filter(SubjectType.id == sub.type).first()
            type_name = sub_type.type if sub_type else None
            teacher = db.query(Users).filter(Users.id == sub.teacher).first()
            teacher_name = f"{teacher.firstname} {teacher.lastname}" if teacher else None
            file_path = os.path.join(UPLOAD_DIR, sub.filename) if sub.filename else None
            file_content = None
            if file_path and os.path.exists(file_path):
                with open(file_path, "rb") as file:
                    file_content = base64.b64encode(file.read()).decode("utf-8")

            result.append({
                "id": sub.id,
                "name": sub.name,
                "semester": sub.semester,
                "type": type_name,
                "teacher": teacher_name,
                "filename": sub.filename,
                "file_content": file_content,
                "lecture_time": sub.lecture_time,
                "theory_time": sub.theory_time,
                "practical_time": sub.practical_time,
                "credit": sub.credit,
                "code": sub.code,
                "notation": sub.notation,
                "status": sub.status
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving subjects: {str(e)}")
