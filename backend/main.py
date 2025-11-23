from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.all_preference import user_preference
from src.authentication import login
from src.chatbot import bot
from src.user_management import users
from src.common import common
from src.semester import upload_subject
from src.prompts import prompt
from src.timetable import timetable

origins = ["*"]
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(login.router,prefix="/api", tags=["login"])
app.include_router(user_preference.router,prefix="/api",tags=["Color and themes preferences"])
app.include_router(bot.router,prefix="/api",tags=["InfoBot"])
app.include_router(users.router, prefix="/api", tags=["User Management"])
app.include_router(common.router, prefix="/api", tags=["Common"])
app.include_router(upload_subject.router, prefix="/api", tags=["Semester Management"])
app.include_router(prompt.router, prefix="/api", tags=["Prompt Management"])
app.include_router(timetable.router, prefix="/api", tags=["Timetable Management"])