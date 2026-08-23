"""Iteration 2 tests: Group search, /my/stats, /register-push, push side-effect non-blocking."""
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
    email = f"TEST_it2_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Password123", "full_name": "TEST Iter2"}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"Authorization": f"Bearer {d['token']}"}, d["user"]["id"]


# --------------------------- Group Search ---------------------------
class TestGroupSearch:
    def test_search_by_name_case_insensitive(self, demo_headers):
        r = requests.get(f"{API}/groups?search=trail", headers=demo_headers)
        assert r.status_code == 200
        groups = r.json()
        assert len(groups) >= 1
        # Every returned group must contain 'trail' in name (case-insensitive)
        for g in groups:
            assert "trail" in g["name"].lower(), f"Search returned non-matching group: {g['name']}"

    def test_search_no_matches(self, demo_headers):
        r = requests.get(f"{API}/groups?search=zzznoshapematch{uuid.uuid4().hex[:6]}", headers=demo_headers)
        assert r.status_code == 200
        assert r.json() == []

    def test_search_combines_with_category(self, demo_headers):
        # 'runners' is in "Dawn Patrol Runners" (Road) & possibly others
        r = requests.get(f"{API}/groups?search=runners&category=Road", headers=demo_headers)
        assert r.status_code == 200
        for g in r.json():
            assert "runners" in g["name"].lower()
            assert g["category"] == "Road"

    def test_search_combines_with_city_and_day(self, demo_headers):
        r = requests.get(f"{API}/groups?search=dawn&city=San Francisco&day=Mon", headers=demo_headers)
        assert r.status_code == 200
        for g in r.json():
            assert "dawn" in g["name"].lower()
            assert g["city"] == "San Francisco"
            assert "Mon" in g["meeting_days"]

    def test_search_partial_substring(self, demo_headers):
        r = requests.get(f"{API}/groups?search=striders", headers=demo_headers)
        assert r.status_code == 200
        names = [g["name"] for g in r.json()]
        assert any("Striders" in n for n in names)


# --------------------------- Run Stats ---------------------------
class TestMyStats:
    def test_stats_requires_auth(self):
        r = requests.get(f"{API}/my/stats")
        assert r.status_code == 401

    def test_demo_user_stats_populated(self, demo_headers):
        r = requests.get(f"{API}/my/stats", headers=demo_headers)
        assert r.status_code == 200
        s = r.json()
        for k in ("total_km", "total_runs", "streak_weeks", "upcoming"):
            assert k in s, f"Missing field: {k}"
        assert s["total_runs"] == 4, f"Expected 4 seeded past runs, got {s['total_runs']}"
        assert s["total_km"] == 41.0, f"Expected 41.0 total_km, got {s['total_km']}"
        assert s["streak_weeks"] >= 1, f"Expected streak_weeks>=1, got {s['streak_weeks']}"

    def test_new_user_stats_zero(self, new_user_headers):
        headers, _ = new_user_headers
        r = requests.get(f"{API}/my/stats", headers=headers)
        assert r.status_code == 200
        s = r.json()
        assert s["total_km"] == 0
        assert s["total_runs"] == 0
        assert s["streak_weeks"] == 0
        assert s["upcoming"] == 0


# --------------------------- Register Push ---------------------------
class TestRegisterPush:
    def test_register_push_controlled_error(self, new_user_headers):
        """With placeholder EMERGENT_PUSH_KEY, expect a controlled 500 or 502 - not a crash."""
        _, user_id = new_user_headers
        r = requests.post(f"{API}/register-push", json={
            "user_id": user_id, "platform": "android", "device_token": "TEST_token_" + uuid.uuid4().hex,
        }, timeout=30)
        # Preview: placeholder key -> controlled 500 or upstream unavailable -> 502
        # Accept 201 too (in case a real key is somehow present)
        assert r.status_code in (201, 500, 502), f"Unexpected status: {r.status_code} {r.text}"
        # And the response must be JSON with an error detail (not a raw crash)
        try:
            body = r.json()
        except Exception:
            pytest.fail(f"Non-JSON response body: {r.text!r}")
        assert isinstance(body, dict)

    def test_backend_still_healthy_after_push_register(self, demo_headers):
        # Fire and forget
        requests.post(f"{API}/register-push", json={
            "user_id": "TEST_bogus", "platform": "ios", "device_token": "TEST_token",
        }, timeout=30)
        # Then verify backend still serves other endpoints
        r = requests.get(f"{API}/auth/me", headers=demo_headers)
        assert r.status_code == 200


# --------------------------- New-session push side-effect ---------------------------
class TestCreateWorkoutPushSideEffect:
    def test_create_workout_succeeds_despite_push_failure(self, demo_headers):
        groups = requests.get(f"{API}/groups", headers=demo_headers).json()
        target = next(g for g in groups if g["my_status"] == "admin")
        payload = {
            "title": f"TEST Push {uuid.uuid4().hex[:6]}",
            "description": "Should still be created", "workout_date": "2030-06-01T07:00:00+00:00",
            "meeting_point_name": "TEST", "distance_km": 5.0,
        }
        r = requests.post(f"{API}/groups/{target['id']}/workouts", headers=demo_headers, json=payload)
        assert r.status_code == 200, f"Push relay failure must not block create: {r.status_code} {r.text}"
        w = r.json()
        # GET verify persisted
        r2 = requests.get(f"{API}/workouts/{w['id']}", headers=demo_headers)
        assert r2.status_code == 200
        # Cleanup
        requests.delete(f"{API}/workouts/{w['id']}", headers=demo_headers)
