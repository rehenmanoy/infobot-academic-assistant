import pytest

from app.models import Role


@pytest.fixture
def two_classes(make_user, make_subject):
    """Semesters 3 and 5 share teachers t1 and t2."""
    t1, t2, t3, t4 = (make_user(Role.TEACHER) for _ in range(4))
    sem3 = [
        make_subject(3, t1, theory=4),
        make_subject(3, t2, theory=4),
        make_subject(3, t3, theory=3),
        make_subject(3, t1, theory=0, practical=3),
    ]
    sem5 = [
        make_subject(5, t1, theory=4),
        make_subject(5, t2, theory=4),
        make_subject(5, t4, theory=4),
        make_subject(5, t2, theory=0, practical=3),
    ]
    return {"teachers": (t1, t2, t3, t4), 3: sem3, 5: sem5}


def generate_and_save(client, headers, semester, seed=1):
    proposal = client.post(f"/api/timetables/{semester}/generate", headers=headers, json={"seed": seed})
    assert proposal.status_code == 200, proposal.text
    assert proposal.json()["saved"] is False
    saved = client.put(f"/api/timetables/{semester}", headers=headers, json={"grid": proposal.json()["grid"]})
    assert saved.status_code == 200, saved.text
    return saved.json()


def teacher_cells(grid, subject_ids):
    return {(d, p) for d, row in enumerate(grid) for p, c in enumerate(row) if c and c["subject_id"] in subject_ids}


def test_generate_save_and_view(client, admin_headers, two_classes):
    sem3 = generate_and_save(client, admin_headers, 3)
    assert sem3["saved"] is True
    assert sem3["issues"] == []
    assert client.get("/api/timetables/3", headers=admin_headers).json()["grid"] == sem3["grid"]
    summary = client.get("/api/timetables", headers=admin_headers).json()
    assert summary[0]["semester"] == 3 and summary[0]["errors"] == 0


def test_second_class_is_built_around_the_first(client, admin_headers, two_classes):
    sem3 = generate_and_save(client, admin_headers, 3, seed=4)
    sem5 = generate_and_save(client, admin_headers, 5, seed=9)
    t1, t2, *_ = two_classes["teachers"]
    for teacher in (t1, t2):
        ids3 = {s.id for s in two_classes[3] if s.teacher_id == teacher.id}
        ids5 = {s.id for s in two_classes[5] if s.teacher_id == teacher.id}
        assert not teacher_cells(sem3["grid"], ids3) & teacher_cells(sem5["grid"], ids5)
    assert client.get("/api/timetables/conflicts", headers=admin_headers).json() == []


def test_saving_a_clash_is_refused(client, admin_headers, two_classes):
    sem3 = generate_and_save(client, admin_headers, 3)
    t1_subject_3 = two_classes[3][0]
    t1_subject_5 = two_classes[5][0]
    day, period = next(iter(teacher_cells(sem3["grid"], {t1_subject_3.id})))

    grid = [[None] * 8 for _ in range(5)]
    grid[day][period] = {"subject_id": t1_subject_5.id, "kind": "theory"}
    issues = client.post("/api/timetables/5/validate", headers=admin_headers, json={"grid": grid}).json()
    assert any(i["type"] == "teacher_clash" and i["other_semester"] == 3 for i in issues)

    response = client.put("/api/timetables/5", headers=admin_headers, json={"grid": grid})
    assert response.status_code == 409
    assert response.json()["issues"][0]["type"] == "teacher_clash"
    assert client.get("/api/timetables/5", headers=admin_headers).json()["saved"] is False


def test_odd_and_even_semesters_do_not_clash(client, admin_headers, make_user, make_subject):
    teacher = make_user(Role.TEACHER)
    make_subject(3, teacher, theory=4)
    make_subject(4, teacher, theory=4)
    sem3 = generate_and_save(client, admin_headers, 3, seed=1)
    # Semester 4 runs in a different term, so the same slots are fine.
    grid = sem3["grid"]
    sem4_subject = client.get("/api/subjects", headers=admin_headers, params={"semester": 4}).json()[0]
    grid4 = [[{"subject_id": sem4_subject["id"], "kind": "theory"} if c else None for c in row] for row in grid]
    assert client.put("/api/timetables/4", headers=admin_headers, json={"grid": grid4}).status_code == 200


def test_reassigning_a_teacher_later_shows_up_as_a_conflict(client, admin_headers, two_classes):
    generate_and_save(client, admin_headers, 3, seed=2)
    generate_and_save(client, admin_headers, 5, seed=3)
    t1, *_ = two_classes["teachers"]
    # Give t1 the semester-5 subject of t4: some of its slots will now clash with t1's semester-3 classes.
    sem5_subject = two_classes[5][2]
    client.patch(f"/api/subjects/{sem5_subject.id}", headers=admin_headers, json={"teacher_id": t1.id})
    conflicts = client.get("/api/timetables/conflicts", headers=admin_headers).json()
    timetable5 = client.get("/api/timetables/5", headers=admin_headers).json()
    has_overlap = any(i["type"] == "teacher_clash" for i in timetable5["issues"])
    assert bool(conflicts) == has_overlap
    if conflicts:
        assert conflicts[0]["teacher"]["id"] == t1.id and conflicts[0]["semesters"] == [3, 5]


def test_unavailable_slots_are_avoided_by_the_generator(client, admin_headers, make_user, make_subject):
    teacher = make_user(Role.TEACHER, unavailable_slots=[[d, p] for d in range(5) for p in range(4)])
    subject = make_subject(3, teacher, theory=4)
    grid = client.post("/api/timetables/3/generate", headers=admin_headers, json={"seed": 1}).json()["grid"]
    assert all(period >= 4 for _, period in teacher_cells(grid, {subject.id}))


def test_students_only_see_their_own_semester(client, make_user, login, two_classes):
    headers = login(make_user(Role.STUDENT, semester=3))
    assert client.get("/api/timetables/3", headers=headers).status_code == 200
    assert client.get("/api/timetables/5", headers=headers).status_code == 403
    assert client.post("/api/timetables/3/generate", headers=headers, json={}).status_code == 403


def test_teacher_sees_own_schedule_only(client, admin_headers, login, two_classes):
    generate_and_save(client, admin_headers, 3)
    t1, t2, *_ = two_classes["teachers"]
    headers = login(t1)
    schedule = client.get(f"/api/timetables/teachers/{t1.id}", headers=headers).json()
    assert len(schedule) == 4 + 3  # 4 theory hours + one 3-period lab
    assert client.get(f"/api/timetables/teachers/{t2.id}", headers=headers).status_code == 403


def test_deleting_a_subject_removes_it_from_the_timetable(client, admin_headers, two_classes):
    generate_and_save(client, admin_headers, 3)
    removed = two_classes[3][0]
    assert client.delete(f"/api/subjects/{removed.id}", headers=admin_headers).status_code == 204
    grid = client.get("/api/timetables/3", headers=admin_headers).json()["grid"]
    assert not teacher_cells(grid, {removed.id})


def test_generate_needs_subjects_and_rejects_bad_grids(client, admin_headers):
    assert client.post("/api/timetables/7/generate", headers=admin_headers, json={}).status_code == 422
    assert client.put("/api/timetables/7", headers=admin_headers, json={"grid": [[None] * 3]}).status_code == 422
    assert client.get("/api/timetables/9", headers=admin_headers).status_code == 422


def test_config_endpoint(client, admin_headers):
    config = client.get("/api/timetables/config", headers=admin_headers).json()
    assert len(config["days"]) == 5 and len(config["periods"]) == 8 and config["lab_block"] == 3
