# Project: backend
# Author: DAK
# Date: 28-01-2025
# Description: 

"""
File: user_preference
Purpose: used the update user preference like  color theme in database
"""


import json
from fastapi.responses import JSONResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schema.schema import user_preferences,get_user_preferences
from fastapi.encoders import jsonable_encoder
from config.db import get_db
from utils.jwt_utils import JWTManager
from database.db_models import Users

router = APIRouter()
jwt_manager = JWTManager()


@router.post('/setup_user_preference')
async def setup_user_preference(
    user_pref: user_preferences,
    db: Session = Depends(get_db)
):
    try:
        dict_data = jsonable_encoder(user_pref)
        _theme = dict_data.get('theme')
        _color = dict_data.get('color')
        _access_token = dict_data.get('access_token')

        if not _theme or not _color or not _access_token:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Invalid input: Missing required fields"}
            )

        user = db.query(Users).filter(Users.jwt_token == _access_token).first()
        if user:
            user.preference = json.dumps({'theme': _theme, 'color': _color})
            db.commit()
            return JSONResponse(
                status_code=200,
                content={"status": "success", "message": "Successfully updated your theme preference"}
            )
        else:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "User not found or invalid access token"}
            )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "An error occurred while updating preferences"}
        )

@router.post('/get_user_preference')
def get_user_preference(    user_pref: get_user_preferences,
    db: Session = Depends(get_db)):
    try:
        dict_data = jsonable_encoder(user_pref)
        _access_token = dict_data.get('access_token')
        user_pref = db.query(Users).filter(Users.jwt_token == _access_token).first()

        if user_pref:
            pref_json = json.loads(user_pref.preference)
            return pref_json
        else:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "User has no such valid preferences"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "An error occurred while getting preferences"}
        )

