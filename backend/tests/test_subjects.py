from pathlib import Path

import pytest

from app.config import get_settings
from app.models import Role


def subject_body(teacher_id=None, **extra):
    return {
        "semester": 3,
        "code": "ITT201",
        "name": "Data Structures",
        "notation": "DS",
        "type": "core",
        "teacher_id": teacher_id,
        "lecture_hours": 3,
        "tutorial_hours": 1,
        "practical_hours": 0,
        "credits": 4,
    } | extra


def test_create_and_list_subjects(client, admin_headers, make_user, login):
    teacher = make_user(Role.TEACHER)
    response = client.post("/api/subjects", headers=admin_headers, json=subject_body(teacher.id))
    assert response.status_code == 201, response.text
    assert response.json()["teacher"]["full_name"] == teacher.full_name

    student_headers = login(make_user(Role.STUDENT))
    listed = client.get("/api/subjects", headers=student_headers, params={"semester": 3})
    assert listed.status_code == 200
    assert [s["code"] for s in listed.json()] == ["ITT201"]
    assert client.post("/api/subjects", headers=student_headers, json=subject_body()).status_code == 403


def test_subject_rules(client, admin_headers, make_user, make_subject):
    student = make_user(Role.STUDENT)
    assert client.post("/api/subjects", headers=admin_headers, json=subject_body(student.id)).status_code == 422
    assert client.post("/api/subjects", headers=admin_headers, json=subject_body(practical_hours=2)).status_code == 422
    assert client.post("/api/subjects", headers=admin_headers, json=subject_body()).status_code == 201
    assert client.post("/api/subjects", headers=admin_headers, json=subject_body()).status_code == 409

    # 40 periods a week: 8 subjects x 4 hours use 32, another 10 would need 42.
    for _ in range(8):
        make_subject(5, None, theory=4)
    too_much = client.post(
        "/api/subjects", headers=admin_headers, json=subject_body(semester=5, lecture_hours=6, tutorial_hours=4)
    )
    assert too_much.status_code == 422
    assert "periods a week" in too_much.json()["detail"]


def test_changing_the_teacher_actually_changes_it(client, admin_headers, make_user, make_subject):
    """The old update endpoint silently ignored teacher_id and type_id."""
    old, new = make_user(Role.TEACHER), make_user(Role.TEACHER)
    subject = make_subject(3, old)
    response = client.patch(
        f"/api/subjects/{subject.id}", headers=admin_headers, json={"teacher_id": new.id, "type": "elective"}
    )
    assert response.status_code == 200
    assert response.json()["teacher"]["id"] == new.id
    assert response.json()["type"] == "elective"

    cleared = client.patch(f"/api/subjects/{subject.id}", headers=admin_headers, json={"teacher_id": None})
    assert cleared.json()["teacher"] is None


PDF = b"%PDF-1.4\n%fake test pdf\n"


def test_syllabus_upload_rejects_non_pdfs(client, admin_headers, make_subject):
    subject = make_subject(3, None)
    response = client.put(
        f"/api/subjects/{subject.id}/syllabus",
        headers=admin_headers,
        files={"file": ("evil.py", b"import os; os.system('rm -rf /')", "application/pdf")},
    )
    assert response.status_code == 415


def test_syllabus_upload_cannot_escape_the_upload_folder(client, admin_headers, make_subject):
    subject = make_subject(3, None)
    response = client.put(
        f"/api/subjects/{subject.id}/syllabus",
        headers=admin_headers,
        files={"file": ("../../../main.py", PDF, "application/pdf")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["syllabus_name"] == "main.py"
    upload_dir = get_settings().upload_dir.resolve()
    stored = list(upload_dir.iterdir())
    assert len(stored) == 1 and stored[0].suffix == ".pdf" and stored[0].parent == upload_dir
    assert not (upload_dir.parent.parent / "main.py").exists()


def test_syllabus_size_limit(client, admin_headers, make_subject):
    subject = make_subject(3, None)
    too_big = PDF + b"0" * (get_settings().max_upload_mb * 1024 * 1024)
    response = client.put(
        f"/api/subjects/{subject.id}/syllabus",
        headers=admin_headers,
        files={"file": ("big.pdf", too_big, "application/pdf")},
    )
    assert response.status_code == 413


def test_syllabus_download_needs_login_and_replacing_removes_old_file(client, admin_headers, make_subject):
    subject = make_subject(3, None)
    url = f"/api/subjects/{subject.id}/syllabus"
    client.put(url, headers=admin_headers, files={"file": ("one.pdf", PDF, "application/pdf")})
    client.put(url, headers=admin_headers, files={"file": ("two.pdf", PDF + b"v2", "application/pdf")})
    assert len(list(Path(get_settings().upload_dir).iterdir())) == 1

    assert client.get(url).status_code == 401
    response = client.get(url, headers=admin_headers)
    assert response.status_code == 200
    assert response.content == PDF + b"v2"
    assert response.headers["content-type"] == "application/pdf"


@pytest.mark.parametrize("role", [Role.TEACHER, Role.STUDENT])
def test_only_managers_delete_subjects(client, make_user, make_subject, login, role):
    subject = make_subject(3, None)
    assert client.delete(f"/api/subjects/{subject.id}", headers=login(make_user(role))).status_code == 403
