
"""
File: timetable
Purpose:
"""
import base64
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db_models import Prompt, Subject, SubjectType, Users
from config.db import get_db
from dotenv import load_dotenv
import anthropic
from pydantic import BaseModel
class SemesterRequest(BaseModel):
    semester: str

load_dotenv()
UPLOAD_DIR = "uploads"

anthropic_api_key = os.getenv("anthropic_api_key")
if anthropic_api_key is None:
    raise ValueError("Anthropic API key not found in environment variables")

# Initialize the Anthropic client
client = anthropic.Anthropic(api_key=anthropic_api_key)
router = APIRouter()
async def GenerateTimeTable(request):
    try:
        message = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=18000,
            temperature=1,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": request
                        }
                    ]
                }
            ]
        )

        return {"response": message.content[0].text}

    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timetable")
async def timetable(db: Session = Depends(get_db)):
    try:
        # Fetch prompt for timetable generation
        prompt = db.query(Prompt).filter(Prompt.prompt_name == "timetable").first()
        if not prompt:
            return {"status_code": 304, "details": "Please add a prompt in timetable prompt."}

        even_semesters = [2, 4, 6, 8]  # Now includes Semester 2
        semester_data = {}

        for sem in even_semesters:
            subjects = db.query(Subject).filter(Subject.semester == sem).all()
            if not subjects:
                continue

            result = []
            for sub in subjects:
                sub_type = db.query(SubjectType).filter(SubjectType.id == sub.type).first()
                type_name = sub_type.type if sub_type else None

                teacher = db.query(Users).filter(Users.id == sub.teacher).first()

                # Only include departmental teachers in their personal timetable
                teacher_name = None
                if teacher and teacher.teacher_type == 1:
                    teacher_name = f"{teacher.firstname} {teacher.lastname}"

                result.append({
                    "id": sub.id,
                    "name": sub.name,
                    "semester": sub.semester,
                    "type": type_name,
                    "teacher": teacher_name,  # Non-departmental teachers will be None
                    "lecture_time": sub.lecture_time,
                    "theory_time": sub.theory_time,
                    "practical_time": sub.practical_time,
                    "credit": sub.credit,
                    "code": sub.code,
                    "notation": sub.notation,
                    "status": sub.status
                })

            semester_data[sem] = result

        if not semester_data:
            return {"status_code": 304, "details": "No subjects found for even semesters."}

        # Generate timetable request with updated prompt
        request = prompt.prompt_text + "\n" + str(semester_data)
        data = await GenerateTimeTable(request)

        return {"status_code": 200, "details": "Timetable generated successfully.", "data": data}

    except Exception as e:
        return {"error": str(e)}, 500