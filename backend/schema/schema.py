from typing import Optional

from pydantic import BaseModel


class login_data(BaseModel):
    username: str
    password: str


class user_preferences(BaseModel):
    theme: str
    color: str
    access_token:str

class get_user_preferences(BaseModel):
    access_token: str


class EmployeeSchema(BaseModel):
    firstname: str
    lastname: str
    empId: int
    username: str
    password: str
    role: str
    status: str
    profilePhoto: Optional[str] = None
    teacher_type: Optional[int] = None

class EmployeeUpdateSchema(BaseModel):
    firstname: str
    lastname: str
    empId: int
    username: str
    password: Optional[str] = None
    role: str
    status: str
    profilePhoto: Optional[str] = None
    type: Optional[int] = None



class StudentCreate(BaseModel):
    firstname: str
    lastname: str
    username: str
    password: str
    regNo: int
    semester: int
    status: int


class StudentUpdate(BaseModel):
    id: int
    firstname: str
    lastname: str
    empId: int
    username: str
    semester: int
    status: int
    password: Optional[str] = None



class SubjectBase(BaseModel):
    semester: int
    name: str
    type_id: int
    teacher_id: int
    lecture_time: int
    theory_time: int
    practical_time: int
    credit: int
    code: str
    notation: str
    file_name: str
    file_content: str


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    type_id: Optional[int] = None
    teacher_id: Optional[int] = None
    lecture_time: Optional[int] = None
    theory_time: Optional[int] = None
    practical_time: Optional[int] = None
    credit: Optional[int] = None
    code: Optional[str] = None
    notation: Optional[str] = None
    file_name: Optional[str] = None
    file_content: Optional[str] = None



class PromptBase(BaseModel):
    prompt_name: str
    prompt_text: str

class PromptCreate(PromptBase):
    pass

class PromptUpdate(PromptBase):
    id: int

class PromptOut(PromptBase):
    id: int
    status: Optional[int]
