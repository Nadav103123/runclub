"""Stride Tribe backend API test suite (pytest).

Covers: auth, groups (CRUD/filters), membership workflows (public/private/approve/reject),
workouts (create/list/rsvp/cancel), calendar, upload+file serve.
"""
import os
import io
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend .env
    fenv = "/app/frontend/.env"
    if os.path.exists(fenv):
        for line in open(fenv):
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"')
                break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@stridetribe.com"
DEMO_PASSWORD = "Password123"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Demo login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="session")
def new_user():
    """A fresh registered user for join/leave workflow."""
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Password123", "full_name": "TEST Runner",
    }, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["token"], "user": data["user"],
            "headers": {"Authorization": f"Bearer {data['token']}"}}


# ---------- Auth ----------
class TestAuth:
    def test_register_and_login(self):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Password123", "full_name": "TEST Reg",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and body["user"]["email"] == email.lower()
        # Login
        r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "Password123"})
        assert r2.status_code == 200
        assert r2.json()["user"]["full_name"] == "TEST Reg"

    def test_register_duplicate_email(self, new_user):
        r = requests.post(f"{API}/auth/register", json={
            "email": new_user["email"], "password": "Password123", "full_name": "Dup",
        })
        assert r.status_code == 409

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_returns_public_user(self, demo_headers):
        r = requests.get(f"{API}/auth/me", headers=demo_headers)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == DEMO_EMAIL
        assert "password_hash" not in u
        assert "_id" not in u

    def test_update_profile_persists(self, new_user):
        r = requests.put(f"{API}/auth/profile", headers=new_user["headers"], json={
            "bio": "TEST bio", "location": "TEST City", "pace_min_km": "5:00",
        })
        assert r.status_code == 200
        assert r.json()["bio"] == "TEST bio"
        # GET verify
        r2 = requests.get(f"{API}/auth/me", headers=new_user["headers"])
        assert r2.json()["location"] == "TEST City"
        assert r2.json()["pace_min_km"] == "5:00"


# ---------- Groups ----------
class TestGroups:
    def test_list_groups_seeded(self, demo_headers):
        r = requests.get(f"{API}/groups", headers=demo_headers)
        assert r.status_code == 200
        groups = r.json()
        assert isinstance(groups, list)
        assert len(groups) >= 5, f"Expected 5+ seeded groups, got {len(groups)}"
        # Basic shape
        g = groups[0]
        for k in ("id", "name", "city", "category", "is_private", "member_count", "my_status"):
            assert k in g
        assert "_id" not in g

    def test_list_groups_filter_city(self, demo_headers):
        r = requests.get(f"{API}/groups?city=Oakland", headers=demo_headers)
        assert r.status_code == 200
        for g in r.json():
            assert g["city"] == "Oakland"

    def test_list_groups_filter_category(self, demo_headers):
        r = requests.get(f"{API}/groups?category=Trail", headers=demo_headers)
        assert r.status_code == 200
        for g in r.json():
            assert g["category"] == "Trail"

    def test_list_groups_filter_day(self, demo_headers):
        r = requests.get(f"{API}/groups?day=Sun", headers=demo_headers)
        assert r.status_code == 200
        for g in r.json():
            assert "Sun" in g["meeting_days"]

    def test_cities_endpoint(self, demo_headers):
        r = requests.get(f"{API}/groups/cities", headers=demo_headers)
        assert r.status_code == 200
        cities = r.json()
        assert "San Francisco" in cities and "Oakland" in cities

    def test_create_group_and_fetch(self, demo_headers):
        payload = {
            "name": f"TEST Group {uuid.uuid4().hex[:6]}",
            "description": "TEST desc", "city": "TEST City",
            "category": "Road", "is_private": False, "meeting_days": ["Mon", "Fri"],
        }
        r = requests.post(f"{API}/groups", headers=demo_headers, json=payload)
        assert r.status_code == 200, r.text
        g = r.json()
        assert g["name"] == payload["name"]
        assert g["my_status"] == "admin"
        # GET verify
        r2 = requests.get(f"{API}/groups/{g['id']}", headers=demo_headers)
        assert r2.status_code == 200
        assert r2.json()["id"] == g["id"]

    def test_get_group_404(self, demo_headers):
        r = requests.get(f"{API}/groups/nonexistent-id", headers=demo_headers)
        assert r.status_code == 404


# ---------- Membership ----------
class TestMembership:
    def test_join_public_instant_approved(self, new_user, demo_headers):
        # find a public seeded group
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        public = next(g for g in groups if not g["is_private"])
        r = requests.post(f"{API}/groups/{public['id']}/join", headers=new_user["headers"])
        assert r.status_code == 200
        assert r.json()["status"] == "approved"
        # Verify via my/groups
        mine = requests.get(f"{API}/my/groups", headers=new_user["headers"]).json()
        assert any(g["id"] == public["id"] for g in mine)

    def test_join_private_pending_then_approve(self, demo_headers):
        # Create fresh user (register)
        email = f"TEST_priv_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Password123", "full_name": "TEST Priv"})
        assert r.status_code == 200
        user_data = r.json()
        u_headers = {"Authorization": f"Bearer {user_data['token']}"}

        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        private = next((g for g in groups if g["is_private"]), None)
        assert private, "No private seeded group found"

        j = requests.post(f"{API}/groups/{private['id']}/join", headers=u_headers)
        assert j.status_code == 200
        assert j.json()["status"] == "pending"

        # Non-admin cannot approve
        bad = requests.post(f"{API}/groups/{private['id']}/members/{user_data['user']['id']}/approve",
                            headers=u_headers)
        assert bad.status_code == 403

        # Admin approves
        ok = requests.post(f"{API}/groups/{private['id']}/members/{user_data['user']['id']}/approve",
                           headers=demo_headers)
        assert ok.status_code == 200
        assert ok.json()["status"] == "approved"

        # Verify status via group detail
        g = requests.get(f"{API}/groups/{private['id']}", headers=u_headers).json()
        assert g["my_status"] == "approved"

    def test_reject_member(self, demo_headers):
        email = f"TEST_rej_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Password123", "full_name": "TEST Rej"})
        u = r.json()
        u_headers = {"Authorization": f"Bearer {u['token']}"}

        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        private = next(g for g in groups if g["is_private"])
        requests.post(f"{API}/groups/{private['id']}/join", headers=u_headers)
        rr = requests.post(f"{API}/groups/{private['id']}/members/{u['user']['id']}/reject",
                           headers=demo_headers)
        assert rr.status_code == 200
        assert rr.json()["status"] == "rejected"

    def test_leave_group(self, new_user, demo_headers):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        public = next(g for g in groups if not g["is_private"])
        requests.post(f"{API}/groups/{public['id']}/join", headers=new_user["headers"])
        r = requests.post(f"{API}/groups/{public['id']}/leave", headers=new_user["headers"])
        assert r.status_code == 200
        # Cannot leave again
        r2 = requests.post(f"{API}/groups/{public['id']}/leave", headers=new_user["headers"])
        assert r2.status_code == 404

    def test_admin_cannot_leave_own_group(self, demo_headers):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        own = next(g for g in groups if g["my_status"] == "admin")
        r = requests.post(f"{API}/groups/{own['id']}/leave", headers=demo_headers)
        assert r.status_code == 400

    def test_group_members_list(self, demo_headers):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        g = groups[0]
        r = requests.get(f"{API}/groups/{g['id']}/members", headers=demo_headers)
        assert r.status_code == 200
        members = r.json()
        assert any(m["status"] == "admin" for m in members)


# ---------- Workouts ----------
class TestWorkouts:
    def test_list_seeded_workouts(self, demo_headers):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        # first seeded group has workouts
        target = next(g for g in groups if g["name"] == "Dawn Patrol Runners")
        r = requests.get(f"{API}/groups/{target['id']}/workouts", headers=demo_headers)
        assert r.status_code == 200
        ws = r.json()
        assert len(ws) >= 2
        for w in ws:
            assert "workout_date" in w and "going_count" in w

    def test_create_workout_admin_only(self, demo_headers, new_user):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        # Non-admin attempt on a group demo owns should be 403 for new_user
        target = groups[0]
        payload = {
            "title": "TEST Workout", "description": "TEST", "workout_date": "2030-01-01T07:00:00+00:00",
            "meeting_point_name": "TEST Point", "latitude": 37.0, "longitude": -122.0,
            "distance_km": 5.0, "target_pace": "5:00",
        }
        bad = requests.post(f"{API}/groups/{target['id']}/workouts", headers=new_user["headers"], json=payload)
        assert bad.status_code == 403

        good = requests.post(f"{API}/groups/{target['id']}/workouts", headers=demo_headers, json=payload)
        assert good.status_code == 200, good.text
        w = good.json()
        assert w["title"] == "TEST Workout"
        # GET verify
        r = requests.get(f"{API}/workouts/{w['id']}", headers=demo_headers)
        assert r.status_code == 200
        assert r.json()["is_admin"] is True

    def test_rsvp_flow(self, demo_headers, new_user):
        # New user joins group first
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        target = next(g for g in groups if g["name"] == "Dawn Patrol Runners")
        requests.post(f"{API}/groups/{target['id']}/join", headers=new_user["headers"])
        ws = requests.get(f"{API}/groups/{target['id']}/workouts", headers=new_user["headers"]).json()
        assert ws, "No workouts to rsvp"
        w = ws[0]
        r = requests.post(f"{API}/workouts/{w['id']}/rsvp", headers=new_user["headers"],
                          json={"status": "going"})
        assert r.status_code == 200
        assert r.json()["status"] == "going"
        assert r.json()["going_count"] >= 1
        # Update to maybe
        r2 = requests.post(f"{API}/workouts/{w['id']}/rsvp", headers=new_user["headers"],
                           json={"status": "maybe"})
        assert r2.json()["status"] == "maybe"
        # Bad status
        rbad = requests.post(f"{API}/workouts/{w['id']}/rsvp", headers=new_user["headers"],
                             json={"status": "nope"})
        assert rbad.status_code == 400

    def test_cancel_workout_admin(self, demo_headers, new_user):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        target = groups[0]
        payload = {"title": "TEST ToCancel", "workout_date": "2030-02-01T07:00:00+00:00",
                   "meeting_point_name": "TEST"}
        w = requests.post(f"{API}/groups/{target['id']}/workouts", headers=demo_headers, json=payload).json()
        # Non-admin cancel
        bad = requests.delete(f"{API}/workouts/{w['id']}", headers=new_user["headers"])
        assert bad.status_code == 403
        ok = requests.delete(f"{API}/workouts/{w['id']}", headers=demo_headers)
        assert ok.status_code == 200
        # Verify deletion
        gone = requests.get(f"{API}/workouts/{w['id']}", headers=demo_headers)
        assert gone.status_code == 404

    def test_my_calendar(self, demo_headers):
        r = requests.get(f"{API}/my/calendar", headers=demo_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # demo is admin of groups with workouts
        assert len(items) >= 1
        for it in items:
            assert "group_name" in it and "workout_date" in it


# ---------- Upload ----------
class TestUpload:
    def test_upload_and_serve(self, demo_headers):
        # 1x1 png
        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/upload", headers=demo_headers, files=files, timeout=60)
        # 402 => quota exceeded, 502 => storage failure - both acceptable to flag but not fail suite hard
        if r.status_code in (402, 502):
            pytest.skip(f"Storage backend not available: {r.status_code} {r.text}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "path" in data and data["url"].startswith("/api/files/")
        # GET file
        r2 = requests.get(f"{BASE_URL}{data['url']}", timeout=60)
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")

    def test_upload_requires_auth(self):
        files = {"file": ("test.png", io.BytesIO(b"abc"), "image/png")}
        r = requests.post(f"{API}/upload", files=files)
        assert r.status_code == 401
