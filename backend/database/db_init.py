import json

from sqlalchemy import create_engine,text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime

from database.db_models import Teacher
from seeds.admin import admin_permissions
from seeds.hod import hod_permissions
from seeds.students import student_permissions
from seeds.teachers import  teachers_permissions

from db_models import Base, Roles, Users, SubjectType,Subject

DB_USER = "root"
DB_PASSWORD = ""
DB_HOST = "localhost"
DB_NAME = "db_infobot"

engine_temp = create_engine(f"mysql+pymysql://{DB_USER}@{DB_HOST}:3306")

with engine_temp.connect() as conn:
    conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {DB_NAME};"))

DATABASE_URL = f"mysql+pymysql://{DB_USER}@{DB_HOST}:3306/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=True)

Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)
session = Session()

try:
    user_types = [
        Roles(id=1, type="Admin",permissions=admin_permissions, status=1),
        Roles(id=2, type="HOD",permissions=hod_permissions, status=1),
        Roles(id=3, type="Student",permissions=student_permissions, status=1),
        Roles(id=4, type="Teacher",permissions=teachers_permissions, status=1)
    ]
    session.add_all(user_types)
    session.commit()

    admin_user = Users(
        id=1,
        firstname="Admin",
        lastname="User",
        email="admin",
        photo_blob="",
        semester=None,
        unique_id=0000,
        password="$2b$12$/9qKhc6Ip73JQAG070Xd5.Z2DP9X1ZMN1GSCQqc3jTvM0nzYIQ7ZO",
        role=1,
        status=1,
        jwt_token="",
        last_login=datetime.now(),
        preference= json.dumps({"dark_theme": "true", "color": "green"}),
        created_at=datetime.now(),
        created_by=1
    )

    session.add(admin_user)
    session.commit()

    subject_types = [
        SubjectType(id=1, type="Core", status=1),
        SubjectType(id=2, type="NonCredit", status=1),
        SubjectType(id=3, type="Elective", status=1),
        SubjectType(id=4, type="Lab", status=1),
        SubjectType(id=5, type="Minor", status=1)
    ]
    session.add_all(subject_types)
    session.commit()

    teacher_types = [
        Teacher(id=1, type="Departmental"),
        Teacher(id=2, type="Non-Departmental"),
    ]
    session.add_all(teacher_types)
    session.commit()



    print("Database created and sample data inserted successfully!")

except SQLAlchemyError as e:
    print("Error:", e)
    session.rollback()
finally:
    session.close()
