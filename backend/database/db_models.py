
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, JSON, Time, BLOB,Text
)
from sqlalchemy.dialects.mysql import LONGTEXT, LONGBLOB
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class BaseModel(Base):
    """Base model with common fields for created, updated, deleted timestamps, and foreign keys."""
    __abstract__ = True

    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    deleted_at = Column(DateTime, nullable=True)


class Users(BaseModel):
    __tablename__ = "tbl_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    firstname = Column(String(254), nullable=False)
    lastname = Column(String(254), nullable=False)
    photo_blob = Column(LONGTEXT, nullable=True)
    email = Column(String(254), nullable=True)
    unique_id = Column(Integer, nullable=True)
    semester = Column(Integer, nullable=True)
    password = Column(String(254), nullable=False)
    role = Column(Integer, ForeignKey('tbl_roles.id'), nullable=True)
    status = Column(Integer, nullable=True)
    jwt_token = Column(String(254), nullable=True)
    last_login = Column(DateTime, nullable=True)
    preference = Column(JSON, nullable=True)
    teacher_type = Column(Integer, nullable=True)


class Roles(Base):
    __tablename__ = 'tbl_roles'

    id = Column(Integer, primary_key=True)
    type = Column(String(254), nullable=True)
    permissions = Column(JSON, nullable=True)
    status = Column(Integer, nullable=True)



class SubjectType(Base):
    __tablename__ = 'tbl_subject_type'

    id = Column(Integer, primary_key=True)
    type = Column(String(254), nullable=True)
    status = Column(Integer, nullable=True)

class Semester(Base):
    __tablename__ = 'tbl_semester'
    id = Column(Integer, primary_key=True)
    document_name =Column(LONGTEXT,nullable=True)



class Subject(BaseModel):
    __tablename__ = 'tbl_subject'

    id = Column(Integer, primary_key=True)
    semester = Column(Integer, nullable=True)
    name = Column(String(254), nullable=True)
    type = Column(Integer,ForeignKey("tbl_subject_type.id"), nullable=True)
    filename = Column(String(254), nullable=True)
    teacher = Column(Integer,ForeignKey("tbl_users.id"), nullable=True)
    lecture_time =Column(Integer,nullable=True)
    theory_time = Column(Integer,nullable=True)
    practical_time = Column(Integer,nullable=True)
    code = Column(String(50),nullable=True)
    notation = Column(String(50),nullable=True)
    credit = Column(String(10),nullable=True)
    modules = Column(JSON, nullable=True)
    status = Column(Integer, nullable=True)


class Notes(BaseModel):
    __tablename__ = 'tbl_notes'

    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey("tbl_subject.id"), nullable=True)
    notes = Column(JSON, nullable=True)
    status = Column(Integer, nullable=True)


class Model(BaseModel):
    __tablename__ = 'tbl_model'
    id = Column(Integer, primary_key=True)
    model_name = Column(String(254), nullable=True)
    max_token = Column(Integer,nullable=True)
    Temperature = Column(Integer,nullable=True)
    API_key = Column(Text, nullable=True)
    status = Column(Integer, nullable=True)

class Prompt(BaseModel):
    __tablename__ = 'tbl_prompt'
    id = Column(Integer, primary_key=True)
    prompt_name = Column(String(254), nullable=True)
    prompt_text = Column(LONGTEXT, nullable=True)
    status = Column(Integer, nullable=True)

class TimeTable(BaseModel):
    __tablename__ = 'tbl_time_table'
    id = Column(Integer, primary_key=True)
    semester = Column(Integer,nullable=True)
    time_table = Column(JSON,nullable=True)
    status = Column(Integer, nullable=True)

class Teacher(Base):
    __tablename__ = 'tbl_teacher'
    id = Column(Integer, primary_key=True)
    type = Column(String(254), nullable=True)







