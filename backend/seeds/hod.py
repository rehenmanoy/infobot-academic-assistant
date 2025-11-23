# Project: backend
# Author: DAK
# Date: 23-03-2025
# Description: 

"""
File: hod
Purpose: 
"""

hod_permissions = """{
  "navMain": [
    {
      "title": "Users",
      "url": "#",
      "icon": "Users",
      "items": [
        { "title": "Manage Teachers", "url": "/manage_teachers" },
        { "title": "Manage Students", "url": "/manage_students" }
      ]
    },
    {
      "title": "Semester",
      "url": "#",
      "icon": "BookOpen",
      "items": [
        { "title": "Manage Semesters", "url": "/manage_semester" }
      ]
    },
    {
      "title": "Class Management",
      "url": "#",
      "icon": "TableIcon",
      "items": [
        { "title": "Time Table", "url": "/time_table" }
      ]
    },
    {
      "title": "InfoBot",
      "url": "#",
      "icon": "Sparkles",
      "items": [
        { "title": "Chat with Me", "url": "/chat_with_me" }
      ]
    }
  ]
}"""
