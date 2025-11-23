
import json
from datetime import datetime

from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from schema.schema import login_data
from fastapi.encoders import jsonable_encoder
from database.db_models import Users,Roles
from config.db import get_db
from utils.bcrypt_utils import Password_Encoder
from utils.jwt_utils import JWTManager

router = APIRouter()
pw_generator = Password_Encoder()
jwt_manager = JWTManager()

@router.post('/user_login')
async def login(data: login_data, db: Session = Depends(get_db)):
    try:
        dict_data = jsonable_encoder(data)
        _username = dict_data['username']
        _password = dict_data['password']
        user = db.query(Users).filter(Users.email == _username).first()
        if pw_generator.validate_password_hash(_password,user.password):
            data = jwt_manager.generate_token(_username)
            user.jwt_token = data
            role = db.query(Roles).filter(Roles.id == user.role).first()
            user.last_login = datetime.now()
            db.commit()

            return {"access_token": data, "token_type": "bearer","permission":json.loads(role.permissions), "Role": role.type}
        else:
            return {"message": "Invalid username or password"}

    except Exception as e:
        return {"error": "Invalid input data"}