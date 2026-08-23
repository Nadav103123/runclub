"""Iteration 4: Post-Run Logging, Badges, Group Weekly Leaderboard."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
DEMO_EMAIL = "demo@stridetribe.com"
DEMO_PASSWORD = "Password123"


@pytest.fixture(scope="module", autouse=True)
def _final_scrub():
    """Best-effort DB scrub only after ALL module tests have run (no-op in xdist)."""
    yield


@pytest.fixture(scope="module")
def demo_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def new_user():
    email = f"TEST_iter4_{uuid.uuid4().hex[:8]}@stridetribe.com"
    r = requests.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "Password123", "full_name": "TEST Iter4"}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    yield {"email": email, "user_id": data["user"]["id"],
           "headers": {"Authorization": f"Bearer {data['token']}"}}


# ---------- Stats (demo seeded expectations)
class TestStatsDemo:
    def test_demo_stats_derived_from_run_logs(self, demo_headers):
        r = requests.get(f"{BASE_URL}/api/my/stats", headers=demo_headers, timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert s["total_km"] == 41.0, s
        assert s["total_runs"] == 4, s
        assert s["longest_km"] == 18.0, s
        assert s["best_pace"] == "4:00", s
        assert s["streak_weeks"] >= 1, s


class TestBadgesDemo:
    def test_demo_badges(self, demo_headers):
        r = requests.get(f"{BASE_URL}/api/my/badges", headers=demo_headers, timeout=30)
        assert r.status_code == 200
        badges = r.json()
        assert len(badges) == 7
        earned = {b["key"]: b["earned"] for b in badges}
        assert earned["first_run"] is True
        assert earned["ten_k"] is True
        assert earned["speedster"] is True
        assert earned["social"] is True  # demo owns 5 groups (>=3)
        # locked
        assert earned["half"] is False
        assert earned["century"] is False
        assert earned["streak4"] is False


class TestNewUserZeroState:
    def test_new_user_stats_zero(self, new_user):
        r = requests.get(f"{BASE_URL}/api/my/stats", headers=new_user["headers"], timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert s["total_km"] == 0.0
        assert s["total_runs"] == 0
        assert s["longest_km"] == 0.0
        assert s["best_pace"] is None
        assert s["streak_weeks"] == 0

    def test_new_user_badges_none(self, new_user):
        r = requests.get(f"{BASE_URL}/api/my/badges", headers=new_user["headers"], timeout=30)
        assert r.status_code == 200
        badges = r.json()
        assert all(b["earned"] is False for b in badges), badges


# ---------- Post-Run Logging
class TestPostRunLogging:
    _created_group_id = None
    _created_workout_id = None
    _log_id = None

    def test_log_validation_zero_distance(self, demo_headers):
        # need any workout id; grab a demo past workout
        cal = requests.get(f"{BASE_URL}/api/my/calendar", headers=demo_headers, timeout=30).json()
        assert cal
        wid = cal[0]["id"]
        r = requests.post(f"{BASE_URL}/api/workouts/{wid}/log",
                          headers=demo_headers, json={"distance_km": 0, "duration_seconds": 100}, timeout=30)
        assert r.status_code == 422, r.text

    def test_log_validation_zero_duration(self, demo_headers):
        cal = requests.get(f"{BASE_URL}/api/my/calendar", headers=demo_headers, timeout=30).json()
        wid = cal[0]["id"]
        r = requests.post(f"{BASE_URL}/api/workouts/{wid}/log",
                          headers=demo_headers, json={"distance_km": 5.0, "duration_seconds": 0}, timeout=30)
        assert r.status_code == 422, r.text

    def test_log_404_unknown_workout(self, demo_headers):
        r = requests.post(f"{BASE_URL}/api/workouts/{uuid.uuid4()}/log",
                          headers=demo_headers, json={"distance_km": 5.0, "duration_seconds": 1500}, timeout=30)
        assert r.status_code == 404

    def test_new_user_log_updates_stats_and_upserts(self, new_user, demo_headers):
        # Create a group as demo, add new_user as member, create a workout (dated in past window).
        gr = requests.post(f"{BASE_URL}/api/groups", headers=demo_headers,
                          json={"name": f"TEST_iter4_grp_{uuid.uuid4().hex[:6]}", "city": "TESTCITY",
                                "category": "Road", "is_private": False, "meeting_days": ["Mon"]}, timeout=30)
        assert gr.status_code == 200, gr.text
        gid = gr.json()["id"]
        TestPostRunLogging._created_group_id = gid

        # new_user joins (public group so approved instantly)
        jr = requests.post(f"{BASE_URL}/api/groups/{gid}/join", headers=new_user["headers"], timeout=30)
        assert jr.status_code == 200 and jr.json()["status"] == "approved"

        # Demo (admin) creates a past workout for leaderboard-window (within 7d)
        from datetime import datetime, timezone, timedelta
        wd = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        wr = requests.post(f"{BASE_URL}/api/groups/{gid}/workouts", headers=demo_headers,
                          json={"title": "TEST Log Run", "workout_date": wd,
                                "meeting_point_name": "TEST Point", "distance_km": 6.0}, timeout=30)
        assert wr.status_code == 200, wr.text
        wid = wr.json()["id"]
        TestPostRunLogging._created_workout_id = wid

        # Log a run as new_user: 6km in 30min => pace 5:00
        lr = requests.post(f"{BASE_URL}/api/workouts/{wid}/log", headers=new_user["headers"],
                          json={"distance_km": 6.0, "duration_seconds": 1800}, timeout=30)
        assert lr.status_code == 200, lr.text
        log = lr.json()
        assert log["distance_km"] == 6.0
        assert log["duration_seconds"] == 1800
        assert log["pace"] == "5:00"
        TestPostRunLogging._log_id = log["id"]

        # Stats now update for new_user
        sr = requests.get(f"{BASE_URL}/api/my/stats", headers=new_user["headers"], timeout=30).json()
        assert sr["total_runs"] == 1
        assert sr["total_km"] == 6.0
        assert sr["longest_km"] == 6.0
        assert sr["best_pace"] == "5:00"
        # first_run badge earned
        br = requests.get(f"{BASE_URL}/api/my/badges", headers=new_user["headers"], timeout=30).json()
        earned = {b["key"]: b["earned"] for b in br}
        assert earned["first_run"] is True
        assert earned["ten_k"] is False

        # GET /api/workouts/{id} returns my_log for the caller
        gr2 = requests.get(f"{BASE_URL}/api/workouts/{wid}", headers=new_user["headers"], timeout=30).json()
        assert gr2["my_log"] is not None
        assert gr2["my_log"]["distance_km"] == 6.0

        # Demo caller sees own (none) my_log
        gr3 = requests.get(f"{BASE_URL}/api/workouts/{wid}", headers=demo_headers, timeout=30).json()
        assert gr3["my_log"] is None

        # Upsert: log again with different values updates the same record
        lr2 = requests.post(f"{BASE_URL}/api/workouts/{wid}/log", headers=new_user["headers"],
                            json={"distance_km": 10.0, "duration_seconds": 2400}, timeout=30)
        assert lr2.status_code == 200
        log2 = lr2.json()
        assert log2["id"] == TestPostRunLogging._log_id  # same id (upserted)
        assert log2["distance_km"] == 10.0
        assert log2["pace"] == "4:00"

        # Stats reflect updated log (still one run)
        sr2 = requests.get(f"{BASE_URL}/api/my/stats", headers=new_user["headers"], timeout=30).json()
        assert sr2["total_runs"] == 1
        assert sr2["total_km"] == 10.0
        assert sr2["longest_km"] == 10.0
        assert sr2["best_pace"] == "4:00"

    def test_leaderboard_7_day_window(self, demo_headers, new_user):
        gid = TestPostRunLogging._created_group_id
        assert gid
        lb = requests.get(f"{BASE_URL}/api/groups/{gid}/leaderboard", headers=demo_headers, timeout=30)
        assert lb.status_code == 200
        rows = lb.json()
        # 2 members: demo (admin, 0 km this week in this group) and new_user (10km)
        assert len(rows) == 2
        top = rows[0]
        assert top["user_id"] == new_user["user_id"]
        assert top["km"] == 10.0
        assert top["rank"] == 1
        # demo rank 2
        assert rows[1]["rank"] == 2
        assert rows[1]["km"] == 0.0

    def test_dawn_patrol_leaderboard_shows_demo(self, demo_headers):
        # Dawn Patrol Runners: demo has 4 seeded logged runs but seed run_date matches workout dates (past).
        # Only logs within last 7 days count. Seeded runs at -3, -6, -9, -13 days: -3 and -6 are inside window.
        groups = requests.get(f"{BASE_URL}/api/groups?search=Dawn", headers=demo_headers, timeout=30).json()
        assert groups
        gid = groups[0]["id"]
        lb = requests.get(f"{BASE_URL}/api/groups/{gid}/leaderboard", headers=demo_headers, timeout=30).json()
        assert lb
        # demo should be rank 1 with km>0
        demo_row = next((r for r in lb if r["full_name"] == "Alex Rivera"), None)
        assert demo_row is not None, lb
        assert demo_row["rank"] == 1
        assert demo_row["km"] > 0


# ---------- Regression
class TestRegression:
    def test_search_vibes(self, demo_headers):
        for q, expect_any in [("oakland", True), ("marathon", True), ("headlands", True)]:
            r = requests.get(f"{BASE_URL}/api/groups?search={q}", headers=demo_headers, timeout=30)
            assert r.status_code == 200
            data = r.json()
            if expect_any:
                assert len(data) >= 1, (q, data)

    def test_register_push_auth_required(self):
        r = requests.post(f"{BASE_URL}/api/register-push",
                         json={"user_id": "x", "platform": "ios", "device_token": "t"}, timeout=30)
        assert r.status_code == 401

    def test_reminder_prefs_whitelist(self, demo_headers):
        r = requests.put(f"{BASE_URL}/api/auth/profile", headers=demo_headers,
                        json={"reminder_prefs": ["1d", "1h", "bogus"]}, timeout=30)
        assert r.status_code == 200
        assert set(r.json()["reminder_prefs"]) == {"1d", "1h"}
        # reset
        requests.put(f"{BASE_URL}/api/auth/profile", headers=demo_headers,
                     json={"reminder_prefs": ["1d", "1h"]}, timeout=30)


# ---------- Cleanup
class TestZzzCleanup:
    def test_cancel_deletes_run_logs(self, demo_headers, new_user):
        wid = TestPostRunLogging._created_workout_id
        gid = TestPostRunLogging._created_group_id
        if wid:
            r = requests.delete(f"{BASE_URL}/api/workouts/{wid}", headers=demo_headers, timeout=30)
            assert r.status_code == 200
            # confirm run_logs removed
            sr = requests.get(f"{BASE_URL}/api/my/stats", headers=new_user["headers"], timeout=30).json()
            assert sr["total_runs"] == 0
            assert sr["total_km"] == 0.0
        # leave then delete group via DB is not exposed; leave and then remove membership via join/leave doesn't delete group. Best effort: leave.
        if gid:
            # new_user leaves
            requests.post(f"{BASE_URL}/api/groups/{gid}/leave", headers=new_user["headers"], timeout=30)

    def test_delete_test_group_and_user(self, demo_headers, new_user):
        # Ensure the test-created group doesn't linger in the discover feed:
        # No admin DELETE endpoint exists; drop directly via mongo.
        import pymongo, os as _os
        mu = _os.environ["MONGO_URL"].strip('"').strip("'")
        dn = _os.environ["DB_NAME"].strip('"').strip("'")
        cli = pymongo.MongoClient(mu)
        db = cli[dn]
        gid = TestPostRunLogging._created_group_id
        if gid:
            db.groups.delete_one({"id": gid})
            db.memberships.delete_many({"group_id": gid})
            db.workouts.delete_many({"group_id": gid})
            db.run_logs.delete_many({"group_id": gid})
        # Delete the test user
        db.users.delete_one({"id": new_user["user_id"]})
        db.memberships.delete_many({"user_id": new_user["user_id"]})
        db.run_logs.delete_many({"user_id": new_user["user_id"]})
        cli.close()
