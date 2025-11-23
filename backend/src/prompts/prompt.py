# Project: backend
# Author: DAK
# Date: 24-03-2025
# Description: 

"""
File: prompt
Purpose: 
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db_models import Prompt
from config.db import get_db
from schema.schema import PromptUpdate, PromptOut

router = APIRouter()

@router.get("/prompts", response_model=list[PromptOut])
def get_all_prompts(db: Session = Depends(get_db)):
    return db.query(Prompt).filter(Prompt.status == 1).all()

@router.post("/prompts", response_model=PromptOut)
def save_or_update_prompt(data: PromptUpdate, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == data.id).first()
    if prompt:
        prompt.prompt_text = data.prompt_text
    else:
        prompt = Prompt(
            prompt_name=data.prompt_name,
            prompt_text=data.prompt_text,
            status=1
        )
        db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt
