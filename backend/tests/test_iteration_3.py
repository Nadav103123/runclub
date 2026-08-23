"""Iteration 3 tests: reminder_prefs, /my/stats personal bests, and regression."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or ""
if not BASE_URL and os.path.exists("/app/frontend/.env"):
    for line in open("/app/frontend/.env"):
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@stridetribe.com"
DEMO_PASSWORD = "Password123"


@pytest.fixture(scope="module")
def demo_headers():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def new_user_headers():
    email = f"TEST_it3_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Password123", "full_name": "TEST Iter3"}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"Authorization": f"Bearer {d['token']}"}, d["user"]


# --------------------------- Reminder Preferences ---------------------------
class TestReminderPrefs:
    def test_new_user_has_default_prefs(self, new_user_headers):
        _, user = new_user_headers
        assert "reminder_prefs" in user
        assert sorted(user["reminder_prefs"]) == ["1d", "1h"]

    def test_me_returns_reminder_prefs(self, demo_headers):
        r = requests.get(f"{API}/auth/me", headers=demo_headers)
        assert r.status_code == 200
        body = r.json()
        assert "reminder_prefs" in body
        assert isinstance(body["reminder_prefs"], list)

    def test_update_to_1h_only_persists(self, demo_headers):
        r = requests.put(f"{API}/auth/profile", headers=demo_headers,
                         json={"reminder_prefs": ["1h"]})
        assert r.status_code == 200, r.text
        assert r.json()["reminder_prefs"] == ["1h"]
        # Verify persistence via /auth/me
        r2 = requests.get(f"{API}/auth/me", headers=demo_headers)
        assert r2.json()["reminder_prefs"] == ["1h"]

    def test_update_to_empty_list_allowed(self, demo_headers):
        r = requests.put(f"{API}/auth/profile", headers=demo_headers,
                         json={"reminder_prefs": []})
        assert r.status_code == 200, r.text
        assert r.json()["reminder_prefs"] == []
        r2 = requests.get(f"{API}/auth/me", headers=demo_headers)
        assert r2.json()["reminder_prefs"] == []

    def test_reset_prefs_to_default(self, demo_headers):
        # Restore for other tests
        r = requests.put(f"{API}/auth/profile", headers=demo_headers,
                         json={"reminder_prefs": ["1d", "1h"]})
        assert r.status_code == 200
        assert sorted(r.json()["reminder_prefs"]) == ["1d", "1h"]


# --------------------------- Personal Bests ---------------------------
class TestPersonalBests:
    def test_demo_personal_bests(self, demo_headers):
        r = requests.get(f"{API}/my/stats", headers=demo_headers)
        assert r.status_code == 200
        s = r.json()
        assert "longest_km" in s
        assert "best_pace" in s
        assert s["longest_km"] == 18.0, f"Expected longest 18.0, got {s['longest_km']}"
        assert s["best_pace"] == "4:00", f"Expected best_pace 4:00, got {s['best_pace']}"

    def test_new_user_personal_bests(self, new_user_headers):
        headers, _ = new_user_headers
        r = requests.get(f"{API}/my/stats", headers=headers)
        assert r.status_code == 200
        s = r.json()
        assert s["longest_km"] == 0.0
        assert s["best_pace"] is None


# --------------------------- Regression: existing /my/stats fields ---------------------------
class TestStatsRegression:
    def test_demo_stats_full(self, demo_headers):
        r = requests.get(f"{API}/my/stats", headers=demo_headers)
        assert r.status_code == 200
        s = r.json()
        assert s["total_km"] == 41.0
        assert s["total_runs"] == 4
        assert s["streak_weeks"] >= 1
        assert "upcoming" in s


# --------------------------- Regression: search & vibe matches ---------------------------
class TestSearchRegression:
    def test_search_by_name(self, demo_headers):
        r = requests.get(f"{API}/groups?search=trail", headers=demo_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_search_by_city(self, demo_headers):
        r = requests.get(f"{API}/groups?search=oakland", headers=demo_headers)
        assert r.status_code == 200
        # Couch to 5K Crew has city Oakland
        names = [g["name"] for g in r.json()]
        assert any("Couch" in n for n in names), f"Expected 'Couch' via city vibe match, got {names}"

    def test_search_by_category(self, demo_headers):
        r = requests.get(f"{API}/groups?search=marathon", headers=demo_headers)
        assert r.status_code == 200
        # Sub-3 Marathon Squad has category Marathon
        assert len(r.json()) >= 1

    def test_search_by_description(self, demo_headers):
        r = requests.get(f"{API}/groups?search=headlands", headers=demo_headers)
        assert r.status_code == 200
        names = [g["name"] for g in r.json()]
        # Trail Blazers description mentions Marin Headlands
        assert any("Trail" in n for n in names)


# --------------------------- Regression: register-push auth-gated ---------------------------
class TestRegisterPushRegression:
    def test_register_push_requires_auth(self):
        r = requests.post(f"{API}/register-push", json={
            "user_id": "TEST_x", "platform": "android", "device_token": "TEST_t"})
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}"

    def test_register_push_returns_controlled_error(self, new_user_headers):
        headers, user = new_user_headers
        r = requests.post(f"{API}/register-push", headers=headers, json={
            "user_id": user["id"], "platform": "android", "device_token": "TEST_" + uuid.uuid4().hex})
        # With placeholder key, expect controlled error (500 or 502), not a crash
        assert r.status_code in (201, 500, 502), f"Unexpected: {r.status_code} {r.text}"
        try:
            body = r.json()
        except Exception:
            pytest.fail(f"Non-JSON body: {r.text!r}")
        assert isinstance(body, dict)


# --------------------------- Regression: workout create/rsvp flow ---------------------------
class TestWorkoutFlowRegression:
    def test_create_rsvp_delete_flow(self, demo_headers):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        target = next(g for g in groups if g["my_status"] == "admin")
        payload = {
            "title": f"TEST It3 {uuid.uuid4().hex[:6]}",
            "workout_date": "2030-07-01T07:00:00+00:00",
            "meeting_point_name": "TEST Point", "distance_km": 5.0, "target_pace": "5:00",
        }
        r = requests.post(f"{API}/groups/{target['id']}/workouts",
                          headers=demo_headers, json=payload)
        assert r.status_code == 200, r.text
        w = r.json()
        # RSVP
        r2 = requests.post(f"{API}/workouts/{w['id']}/rsvp",
                           headers=demo_headers, json={"status": "going"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "going"
        # Verify persisted
        r3 = requests.get(f"{API}/workouts/{w['id']}", headers=demo_headers)
        assert r3.status_code == 200
        assert r3.json()["my_rsvp"] == "going"
        # Cleanup
        d = requests.delete(f"{API}/workouts/{w['id']}", headers=demo_headers)
        assert d.status_code == 200
