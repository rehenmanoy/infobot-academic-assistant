import pytest

from app.models import Role, User
from app.seed import ensure_admin, load_demo
from tests.conftest import PASSWORD


def test_ensure_admin_is_idempotent_and_rejects_weak_passwords(db):
    with pytest.raises(ValueError):
        ensure_admin(db, "admin", "password")
    assert ensure_admin(db, "admin", "Str0ng-admin-pass") is True
    assert ensure_admin(db, "admin2", "Str0ng-admin-pass") is False
    assert db.query(User).filter(User.role == Role.ADMIN).count() == 1


def test_demo_data_has_complete_clash_free_timetables(client, db, admin_headers):
    load_demo(db, PASSWORD)
    load_demo(db, PASSWORD)  # second run is a no-op
    assert client.get("/api/timetables/conflicts", headers=admin_headers).json() == []
    for semester in (3, 5):
        timetable = client.get(f"/api/timetables/{semester}", headers=admin_headers).json()
        assert timetable["saved"] is True
        assert timetable["issues"] == [], timetable["issues"]
