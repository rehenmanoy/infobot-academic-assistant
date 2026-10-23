import base64

import pytest

from app.models import Role
from tests.conftest import PASSWORD

PNG = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"\0" * 32).decode()


def new_user(role="teacher", **extra):
    body = {
        "username": f"new.{role}",
        "password": "Str0ng-pass",
        "first_name": "New",
        "last_name": role.title(),
        "role": role,
    }
    if role == "student":
        body["semester"] = 3
    return body | extra


@pytest.mark.parametrize("role", [Role.TEACHER, Role.STUDENT])
def test_teachers_and_students_cannot_manage_users(client, make_user, login, role):
    headers = login(make_user(role))
    assert client.get("/api/users", headers=headers).status_code == 403
    assert client.post("/api/users", headers=headers, json=new_user()).status_code == 403


def test_listing_users_never_exposes_password_hashes(client, admin_headers, make_user):
    make_user(Role.STUDENT)
    response = client.get("/api/users", headers=admin_headers, params={"role": "student"})
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert "password_hash" not in response.text and "$2b$" not in response.text


def test_admin_creates_users(client, admin_headers):
    response = client.post("/api/users", headers=admin_headers, json=new_user("teacher", photo=PNG))
    assert response.status_code == 201, response.text
    assert response.json()["teacher_type"] == "departmental"
    response = client.post("/api/users", headers=admin_headers, json=new_user("student"))
    assert response.status_code == 201
    assert response.json()["semester"] == 3
    assert (
        client.post("/api/auth/login", json={"username": "new.student", "password": "Str0ng-pass"}).status_code == 200
    )


def test_hod_can_manage_teachers_but_not_admins(client, make_user, login, admin):
    headers = login(make_user(Role.HOD))
    assert client.post("/api/users", headers=headers, json=new_user("teacher")).status_code == 201
    assert client.post("/api/users", headers=headers, json=new_user("admin")).status_code == 403
    assert client.post("/api/users", headers=headers, json=new_user("hod")).status_code == 403
    # The old "update student" endpoint let anyone reset the admin password. Not any more.
    assert client.patch(f"/api/users/{admin.id}", headers=headers, json={"password": "Hijack3d!"}).status_code == 403
    assert client.delete(f"/api/users/{admin.id}", headers=headers).status_code == 403


def test_hod_cannot_promote_a_teacher_to_admin(client, make_user, login):
    teacher = make_user(Role.TEACHER)
    headers = login(make_user(Role.HOD))
    assert client.patch(f"/api/users/{teacher.id}", headers=headers, json={"role": "admin"}).status_code == 403


@pytest.mark.parametrize(
    ("override", "field"),
    [
        ({"password": "short1"}, "password"),
        ({"password": "onlyletters"}, "password"),
        ({"username": "bad name!"}, "username"),
        ({"photo": "data:image/png;base64,PHNjcmlwdD4="}, "photo"),
        ({"photo": "javascript:alert(1)"}, "photo"),
        ({"unavailable_slots": [[9, 9]]}, "unavailable_slots"),
    ],
)
def test_invalid_user_data_is_rejected(client, admin_headers, override, field):
    response = client.post("/api/users", headers=admin_headers, json=new_user("teacher", **override))
    assert response.status_code == 422
    assert field in response.text


def test_student_needs_a_semester(client, admin_headers):
    body = new_user("student")
    del body["semester"]
    assert client.post("/api/users", headers=admin_headers, json=body).status_code == 422


def test_duplicate_username_and_identifier(client, admin_headers, make_user):
    make_user(Role.TEACHER, username="taken", identifier="EMP1")
    assert client.post("/api/users", headers=admin_headers, json=new_user(username="taken")).status_code == 409
    assert client.post("/api/users", headers=admin_headers, json=new_user(identifier="EMP1")).status_code == 409


def test_blank_password_on_update_keeps_the_old_one(client, admin_headers, make_user):
    teacher = make_user(Role.TEACHER)
    response = client.patch(
        f"/api/users/{teacher.id}", headers=admin_headers, json={"first_name": "Renamed", "password": ""}
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "Renamed"
    assert client.post("/api/auth/login", json={"username": teacher.username, "password": PASSWORD}).status_code == 200


def test_password_reset_logs_the_user_out(client, admin_headers, make_user, login):
    teacher = make_user(Role.TEACHER)
    teacher_headers = login(teacher)
    client.patch(f"/api/users/{teacher.id}", headers=admin_headers, json={"password": "An0ther-pass"})
    assert client.get("/api/auth/me", headers=teacher_headers).status_code == 401


def test_set_teacher_availability(client, admin_headers, make_user):
    teacher = make_user(Role.TEACHER)
    response = client.patch(
        f"/api/users/{teacher.id}", headers=admin_headers, json={"unavailable_slots": [[0, 1], [0, 0], [0, 1]]}
    )
    assert response.status_code == 200
    assert response.json()["unavailable_slots"] == [[0, 0], [0, 1]]


def test_cannot_delete_or_demote_yourself_or_the_last_admin(client, admin, admin_headers, make_user, login):
    assert client.delete(f"/api/users/{admin.id}", headers=admin_headers).status_code == 400
    assert client.patch(f"/api/users/{admin.id}", headers=admin_headers, json={"role": "teacher"}).status_code == 400
    assert client.patch(f"/api/users/{admin.id}", headers=admin_headers, json={"is_active": False}).status_code == 400

    other_admin = make_user(Role.ADMIN)
    other_headers = login(other_admin)
    assert client.delete(f"/api/users/{admin.id}", headers=other_headers).status_code == 204
    assert client.delete(f"/api/users/{other_admin.id}", headers=other_headers).status_code == 400


def test_deleting_a_teacher_unassigns_their_subjects(client, admin_headers, make_user, make_subject):
    teacher = make_user(Role.TEACHER)
    subject = make_subject(3, teacher)
    assert client.delete(f"/api/users/{teacher.id}", headers=admin_headers).status_code == 204
    subjects = client.get("/api/subjects", headers=admin_headers, params={"semester": 3}).json()
    assert subjects[0]["id"] == subject.id
    assert subjects[0]["teacher"] is None
