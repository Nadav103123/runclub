from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import asyncio
import re
import requests
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------------------------------------------------------- config
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "stride-tribe"
_storage_key = None

# Emergent managed push (SuprSend relay)
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
_push_client = httpx.AsyncClient(base_url=PUSH_BASE_URL, headers={"X-Push-Key": PUSH_KEY}, timeout=10.0)
REMINDER_LEAD_MINUTES = 60  # nudge going runners ~1h before a session

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------- storage
def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------- models
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    pace_min_km: Optional[str] = None
    avatar_url: Optional[str] = None


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = ""
    city: str = Field(min_length=1)
    category: str = "Road"          # Road, Trail, Beginner, Marathon
    is_private: bool = False
    image_url: Optional[str] = None
    meeting_days: List[str] = []    # e.g. ["Mon","Wed","Sat"]


class WorkoutCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = ""
    workout_date: str               # ISO string
    meeting_point_name: str = Field(min_length=1)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None
    target_pace: Optional[str] = None


class RSVPIn(BaseModel):
    status: str                     # going, not_going, maybe


class RegisterPushBody(BaseModel):
    user_id: str
    platform: str                   # "android" | "ios"
    device_token: str


# ---------------------------------------------------------------- auth helpers
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "full_name": u.get("full_name", ""),
        "avatar_url": u.get("avatar_url"),
        "bio": u.get("bio", ""),
        "location": u.get("location", ""),
        "pace_min_km": u.get("pace_min_km", ""),
    }


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM],
                             options={"require": ["sub", "exp"]})
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ---------------------------------------------------------------- auth routes
@api_router.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(body.password),
        "full_name": body.full_name,
        "avatar_url": None,
        "bio": "",
        "location": "",
        "pace_min_km": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    return {"token": make_token(user["id"]), "user": public_user(user)}


@api_router.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    return {"token": make_token(user["id"]), "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.put("/auth/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    fresh = await db.users.find_one({"id": user["id"]})
    return public_user(fresh)


# ---------------------------------------------------------------- upload routes
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "img").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "heic", "gif"):
        ext = "jpg"
    data = await file.read()
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or "image/jpeg"
    try:
        await run_in_threadpool(put_object, path, data, content_type)
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else 500
        if code == 402:
            raise HTTPException(402, "Storage quota exceeded")
        raise HTTPException(502, "Upload failed")
    await db.files.insert_one({"path": path, "owner_id": user["id"], "content_type": content_type, "created_at": now_iso()})
    return {"path": path, "url": f"/api/files/{path}"}


@api_router.get("/files/{path:path}")
async def get_file(path: str, token: Optional[str] = Query(None)):
    # Public read for display purposes; ownership is enforced elsewhere on writes.
    rec = await db.files.find_one({"path": path})
    if not rec:
        raise HTTPException(404, "File not found")
    try:
        content, content_type = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(404, "File not found")
    return Response(content=content, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=86400"})


# ---------------------------------------------------------------- group helpers
async def membership_status(group_id: str, user_id: str) -> Optional[str]:
    m = await db.memberships.find_one({"group_id": group_id, "user_id": user_id})
    return m["status"] if m else None


async def approved_member_count(group_id: str) -> int:
    return await db.memberships.count_documents({"group_id": group_id, "status": {"$in": ["approved", "admin"]}})


async def next_session(group_id: str) -> Optional[dict]:
    now = now_iso()
    cur = db.workouts.find({"group_id": group_id, "workout_date": {"$gte": now}}).sort("workout_date", 1).limit(1)
    docs = await cur.to_list(1)
    return workout_public(docs[0]) if docs else None


def group_public(g: dict, member_count=0, my_status=None, next_sess=None) -> dict:
    return {
        "id": g["id"],
        "name": g["name"],
        "description": g.get("description", ""),
        "admin_id": g["admin_id"],
        "admin_name": g.get("admin_name", ""),
        "city": g["city"],
        "category": g.get("category", "Road"),
        "is_private": g.get("is_private", False),
        "image_url": g.get("image_url"),
        "meeting_days": g.get("meeting_days", []),
        "created_at": g.get("created_at"),
        "member_count": member_count,
        "my_status": my_status,
        "next_session": next_sess,
    }


def workout_public(w: dict, going_count=0, my_rsvp=None, attendees=None) -> dict:
    return {
        "id": w["id"],
        "group_id": w["group_id"],
        "title": w["title"],
        "description": w.get("description", ""),
        "workout_date": w["workout_date"],
        "meeting_point_name": w["meeting_point_name"],
        "latitude": w.get("latitude"),
        "longitude": w.get("longitude"),
        "distance_km": w.get("distance_km"),
        "target_pace": w.get("target_pace"),
        "created_by": w.get("created_by"),
        "going_count": going_count,
        "my_rsvp": my_rsvp,
        "attendees": attendees or [],
    }


# ---------------------------------------------------------------- group routes
@api_router.get("/groups")
async def list_groups(city: Optional[str] = None, category: Optional[str] = None,
                      day: Optional[str] = None, search: Optional[str] = None,
                      user: dict = Depends(get_current_user)):
    q = {}
    if city and city != "All":
        q["city"] = city
    if category and category != "All":
        q["category"] = category
    if day and day != "All":
        q["meeting_days"] = day
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        q["$or"] = [{"name": rx}, {"city": rx}, {"description": rx}, {"category": rx}]
    groups = await db.groups.find(q).sort("created_at", -1).to_list(200)
    out = []
    for g in groups:
        out.append(group_public(
            g,
            member_count=await approved_member_count(g["id"]),
            my_status=await membership_status(g["id"], user["id"]),
            next_sess=await next_session(g["id"]),
        ))
    return out


@api_router.get("/groups/cities")
async def list_cities(user: dict = Depends(get_current_user)):
    cities = await db.groups.distinct("city")
    return sorted(cities)


@api_router.post("/groups")
async def create_group(body: GroupCreate, user: dict = Depends(get_current_user)):
    g = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "description": body.description,
        "admin_id": user["id"],
        "admin_name": user.get("full_name", ""),
        "city": body.city,
        "category": body.category,
        "is_private": body.is_private,
        "image_url": body.image_url,
        "meeting_days": body.meeting_days,
        "created_at": now_iso(),
    }
    await db.groups.insert_one(g)
    await db.memberships.insert_one({
        "id": str(uuid.uuid4()), "group_id": g["id"], "user_id": user["id"],
        "status": "admin", "joined_at": now_iso(),
    })
    return group_public(g, member_count=1, my_status="admin")


@api_router.get("/groups/{group_id}")
async def get_group(group_id: str, user: dict = Depends(get_current_user)):
    g = await db.groups.find_one({"id": group_id})
    if not g:
        raise HTTPException(404, "Group not found")
    return group_public(
        g,
        member_count=await approved_member_count(group_id),
        my_status=await membership_status(group_id, user["id"]),
        next_sess=await next_session(group_id),
    )


@api_router.post("/groups/{group_id}/join")
async def join_group(group_id: str, user: dict = Depends(get_current_user)):
    g = await db.groups.find_one({"id": group_id})
    if not g:
        raise HTTPException(404, "Group not found")
    existing = await db.memberships.find_one({"group_id": group_id, "user_id": user["id"]})
    if existing and existing["status"] in ("approved", "admin", "pending"):
        return {"status": existing["status"]}
    status = "pending" if g.get("is_private") else "approved"
    if existing:
        await db.memberships.update_one({"id": existing["id"]}, {"$set": {"status": status, "joined_at": now_iso()}})
    else:
        await db.memberships.insert_one({
            "id": str(uuid.uuid4()), "group_id": group_id, "user_id": user["id"],
            "status": status, "joined_at": now_iso(),
        })
    return {"status": status}


@api_router.post("/groups/{group_id}/leave")
async def leave_group(group_id: str, user: dict = Depends(get_current_user)):
    m = await db.memberships.find_one({"group_id": group_id, "user_id": user["id"]})
    if not m:
        raise HTTPException(404, "Not a member")
    if m["status"] == "admin":
        raise HTTPException(400, "Admin cannot leave their own group")
    await db.memberships.delete_one({"id": m["id"]})
    return {"status": "left"}


@api_router.get("/groups/{group_id}/members")
async def group_members(group_id: str, user: dict = Depends(get_current_user)):
    members = await db.memberships.find({"group_id": group_id}).to_list(500)
    out = []
    for m in members:
        u = await db.users.find_one({"id": m["user_id"]})
        if not u:
            continue
        out.append({
            "user_id": u["id"], "full_name": u.get("full_name", ""),
            "avatar_url": u.get("avatar_url"), "pace_min_km": u.get("pace_min_km", ""),
            "status": m["status"], "joined_at": m.get("joined_at"),
        })
    return out


async def require_admin(group_id: str, user: dict):
    g = await db.groups.find_one({"id": group_id})
    if not g:
        raise HTTPException(404, "Group not found")
    if g["admin_id"] != user["id"]:
        raise HTTPException(403, "Admin only")
    return g


@api_router.post("/groups/{group_id}/members/{member_id}/approve")
async def approve_member(group_id: str, member_id: str, user: dict = Depends(get_current_user)):
    await require_admin(group_id, user)
    await db.memberships.update_one({"group_id": group_id, "user_id": member_id}, {"$set": {"status": "approved"}})
    return {"status": "approved"}


@api_router.post("/groups/{group_id}/members/{member_id}/reject")
async def reject_member(group_id: str, member_id: str, user: dict = Depends(get_current_user)):
    await require_admin(group_id, user)
    await db.memberships.update_one({"group_id": group_id, "user_id": member_id}, {"$set": {"status": "rejected"}})
    return {"status": "rejected"}


@api_router.get("/my/groups")
async def my_groups(user: dict = Depends(get_current_user)):
    mships = await db.memberships.find({"user_id": user["id"], "status": {"$in": ["approved", "admin", "pending"]}}).to_list(200)
    out = []
    for m in mships:
        g = await db.groups.find_one({"id": m["group_id"]})
        if not g:
            continue
        gp = group_public(g, member_count=await approved_member_count(g["id"]),
                          my_status=m["status"], next_sess=await next_session(g["id"]))
        out.append(gp)
    return out


# ---------------------------------------------------------------- workout routes
@api_router.get("/groups/{group_id}/workouts")
async def group_workouts(group_id: str, user: dict = Depends(get_current_user)):
    ws = await db.workouts.find({"group_id": group_id}).sort("workout_date", 1).to_list(200)
    out = []
    for w in ws:
        going = await db.rsvps.count_documents({"workout_id": w["id"], "status": "going"})
        mine = await db.rsvps.find_one({"workout_id": w["id"], "user_id": user["id"]})
        out.append(workout_public(w, going_count=going, my_rsvp=mine["status"] if mine else None))
    return out


@api_router.post("/groups/{group_id}/workouts")
async def create_workout(group_id: str, body: WorkoutCreate, user: dict = Depends(get_current_user)):
    await require_admin(group_id, user)
    w = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "title": body.title,
        "description": body.description,
        "workout_date": body.workout_date,
        "meeting_point_name": body.meeting_point_name,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "distance_km": body.distance_km,
        "target_pace": body.target_pace,
        "created_by": user["id"],
        "created_at": now_iso(),
    }
    await db.workouts.insert_one(w)
    # Notify approved members (they're likely offline) about the new session.
    try:
        members = await db.memberships.find({"group_id": group_id, "status": {"$in": ["approved", "admin"]}}).to_list(500)
        recipients = [m["user_id"] for m in members if m["user_id"] != user["id"]]
        g = await db.groups.find_one({"id": group_id})
        await send_push(
            recipients=recipients,
            data={
                "title": f"New run: {w['title']}",
                "message": f"{(g or {}).get('name', 'Your group')} scheduled a new session. RSVP now!",
                "action_url": f"/workout/{w['id']}",
            },
            idempotency_key=f"newsession-{w['id']}",
        )
    except Exception as e:
        logger.warning(f"New-session push failed (non-blocking): {e}")
    return workout_public(w)


@api_router.get("/workouts/{workout_id}")
async def get_workout(workout_id: str, user: dict = Depends(get_current_user)):
    w = await db.workouts.find_one({"id": workout_id})
    if not w:
        raise HTTPException(404, "Workout not found")
    going = await db.rsvps.count_documents({"workout_id": workout_id, "status": "going"})
    mine = await db.rsvps.find_one({"workout_id": workout_id, "user_id": user["id"]})
    rsvps = await db.rsvps.find({"workout_id": workout_id, "status": "going"}).to_list(500)
    attendees = []
    for r in rsvps:
        u = await db.users.find_one({"id": r["user_id"]})
        if u:
            attendees.append({"user_id": u["id"], "full_name": u.get("full_name", ""),
                              "avatar_url": u.get("avatar_url"), "pace_min_km": u.get("pace_min_km", "")})
    g = await db.groups.find_one({"id": w["group_id"]})
    result = workout_public(w, going_count=going, my_rsvp=mine["status"] if mine else None, attendees=attendees)
    result["group_name"] = g["name"] if g else ""
    result["is_admin"] = bool(g and g["admin_id"] == user["id"])
    return result


@api_router.delete("/workouts/{workout_id}")
async def cancel_workout(workout_id: str, user: dict = Depends(get_current_user)):
    w = await db.workouts.find_one({"id": workout_id})
    if not w:
        raise HTTPException(404, "Workout not found")
    await require_admin(w["group_id"], user)
    await db.workouts.delete_one({"id": workout_id})
    await db.rsvps.delete_many({"workout_id": workout_id})
    return {"status": "cancelled"}


@api_router.post("/workouts/{workout_id}/rsvp")
async def rsvp(workout_id: str, body: RSVPIn, user: dict = Depends(get_current_user)):
    if body.status not in ("going", "not_going", "maybe"):
        raise HTTPException(400, "Invalid status")
    w = await db.workouts.find_one({"id": workout_id})
    if not w:
        raise HTTPException(404, "Workout not found")
    existing = await db.rsvps.find_one({"workout_id": workout_id, "user_id": user["id"]})
    if existing:
        await db.rsvps.update_one({"id": existing["id"]}, {"$set": {"status": body.status, "updated_at": now_iso()}})
    else:
        await db.rsvps.insert_one({
            "id": str(uuid.uuid4()), "workout_id": workout_id, "user_id": user["id"],
            "status": body.status, "updated_at": now_iso(),
        })
    going = await db.rsvps.count_documents({"workout_id": workout_id, "status": "going"})
    return {"status": body.status, "going_count": going}


@api_router.get("/my/calendar")
async def my_calendar(user: dict = Depends(get_current_user)):
    mships = await db.memberships.find({"user_id": user["id"], "status": {"$in": ["approved", "admin"]}}).to_list(200)
    group_ids = [m["group_id"] for m in mships]
    if not group_ids:
        return []
    ws = await db.workouts.find({"group_id": {"$in": group_ids}}).sort("workout_date", 1).to_list(500)
    out = []
    for w in ws:
        g = await db.groups.find_one({"id": w["group_id"]})
        going = await db.rsvps.count_documents({"workout_id": w["id"], "status": "going"})
        mine = await db.rsvps.find_one({"workout_id": w["id"], "user_id": user["id"]})
        item = workout_public(w, going_count=going, my_rsvp=mine["status"] if mine else None)
        item["group_name"] = g["name"] if g else ""
        out.append(item)
    return out


# ---------------------------------------------------------------- push notifications
@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, user: dict = Depends(get_current_user)):
    payload = {"user_id": user["id"], "platform": body.platform, "device_token": body.device_token}
    try:
        resp = await _push_client.post("/api/v1/push/users/register", json=payload)
    except Exception:
        raise HTTPException(502, "Push provider unavailable")
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()
    return {"status": "registered"}


async def send_push(recipients: list, data: dict, idempotency_key=None):
    if not recipients:
        return
    if "title" not in data or "message" not in data:
        return
    for i in range(0, len(recipients), 100):
        chunk = recipients[i:i + 100]
        payload = {"recipients": chunk, "data": data}
        if idempotency_key:
            payload["$idempotency_key"] = f"{idempotency_key}-{i}"
        resp = await _push_client.post("/api/v1/push/trigger", json=payload)
        resp.raise_for_status()


async def reminder_scheduler():
    """Background loop: send a push ~REMINDER_LEAD_MINUTES before a session to 'going' runners."""
    await asyncio.sleep(10)
    while True:
        try:
            now = datetime.now(timezone.utc)
            window_end = now + timedelta(minutes=REMINDER_LEAD_MINUTES)
            upcoming = await db.workouts.find({
                "workout_date": {"$gte": now.isoformat(), "$lte": window_end.isoformat()},
                "reminder_sent": {"$ne": True},
            }).to_list(200)
            for w in upcoming:
                going = await db.rsvps.find({"workout_id": w["id"], "status": "going"}).to_list(500)
                recipients = [r["user_id"] for r in going]
                sent_ok = True
                if recipients:
                    g = await db.groups.find_one({"id": w["group_id"]})
                    try:
                        await send_push(
                            recipients=recipients,
                            data={
                                "title": f"🏃 {w['title']} starts soon",
                                "message": f"{(g or {}).get('name', 'Your run')} · Meet at {w['meeting_point_name']}",
                                "action_url": f"/workout/{w['id']}",
                            },
                            idempotency_key=f"remind-{w['id']}",
                        )
                    except Exception as e:
                        sent_ok = False
                        logger.warning(f"Reminder push failed: {e}")
                if sent_ok:
                    await db.workouts.update_one({"id": w["id"]}, {"$set": {"reminder_sent": True}})
        except Exception as e:
            logger.warning(f"Reminder scheduler error: {e}")
        await asyncio.sleep(60)


# ---------------------------------------------------------------- stats
@api_router.get("/my/stats")
async def my_stats(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    now_s = now.isoformat()
    rsvps = await db.rsvps.find({"user_id": user["id"], "status": "going"}).to_list(2000)
    wids = [r["workout_id"] for r in rsvps]
    total_km = 0.0
    total_runs = 0
    upcoming = 0
    weeks = set()
    if wids:
        completed = await db.workouts.find({"id": {"$in": wids}, "workout_date": {"$lte": now_s}}).to_list(2000)
        for w in completed:
            total_runs += 1
            total_km += float(w.get("distance_km") or 0)
            try:
                d = datetime.fromisoformat(w["workout_date"])
                iso = d.isocalendar()
                weeks.add((iso[0], iso[1]))
            except Exception:
                pass
        upcoming = await db.workouts.count_documents({"id": {"$in": wids}, "workout_date": {"$gt": now_s}})
    # weekly streak (current in-progress week doesn't break it)
    streak = 0
    cur_iso = now.isocalendar()
    cur = now if (cur_iso[0], cur_iso[1]) in weeks else now - timedelta(days=7)
    while True:
        iso = cur.isocalendar()
        if (iso[0], iso[1]) in weeks:
            streak += 1
            cur = cur - timedelta(days=7)
        else:
            break
    return {
        "total_km": round(total_km, 1),
        "total_runs": total_runs,
        "streak_weeks": streak,
        "upcoming": upcoming,
    }


# ---------------------------------------------------------------- seed
async def seed():
    if await db.users.find_one({"email": "demo@stridetribe.com"}):
        return
    admin = {
        "id": str(uuid.uuid4()), "email": "demo@stridetribe.com",
        "password_hash": hash_password("Password123"), "full_name": "Alex Rivera",
        "avatar_url": None, "bio": "Marathon coach & pace-maker. Let's run!",
        "location": "San Francisco", "pace_min_km": "4:30", "created_at": now_iso(),
    }
    await db.users.insert_one(admin)

    samples = [
        {"name": "Dawn Patrol Runners", "city": "San Francisco", "category": "Road", "is_private": False,
         "description": "Early morning road miles along the Embarcadero. All paces welcome.",
         "image_url": "https://images.pexels.com/photos/19146676/pexels-photo-19146676.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
         "meeting_days": ["Mon", "Wed", "Fri"]},
        {"name": "Trail Blazers Collective", "city": "San Francisco", "category": "Trail", "is_private": False,
         "description": "Weekend trail adventures in the Marin Headlands. Bring water!",
         "image_url": "https://images.pexels.com/photos/32798744/pexels-photo-32798744.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
         "meeting_days": ["Sat", "Sun"]},
        {"name": "Couch to 5K Crew", "city": "Oakland", "category": "Beginner", "is_private": False,
         "description": "New to running? Start here. Supportive, judgement-free zone.",
         "image_url": "https://images.pexels.com/photos/2402777/pexels-photo-2402777.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
         "meeting_days": ["Tue", "Thu"]},
        {"name": "Sub-3 Marathon Squad", "city": "San Francisco", "category": "Marathon", "is_private": True,
         "description": "Serious marathon training. Application required. Target: sub-3 hour.",
         "image_url": "https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
         "meeting_days": ["Mon", "Wed", "Sat"]},
        {"name": "Golden Gate Striders", "city": "San Francisco", "category": "Road", "is_private": False,
         "description": "Iconic bridge loops every weekend. Photos guaranteed.",
         "image_url": "https://images.pexels.com/photos/1571939/pexels-photo-1571939.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
         "meeting_days": ["Sun"]},
    ]
    created_groups = []
    for s in samples:
        g = {"id": str(uuid.uuid4()), "admin_id": admin["id"], "admin_name": admin["full_name"],
             "created_at": now_iso(), **s}
        await db.groups.insert_one(g)
        await db.memberships.insert_one({"id": str(uuid.uuid4()), "group_id": g["id"],
                                         "user_id": admin["id"], "status": "admin", "joined_at": now_iso()})
        created_groups.append(g)

    # a few upcoming workouts for the first group
    base = datetime.now(timezone.utc)
    workouts = [
        (created_groups[0], "Tempo Tuesday", 2, "Ferry Building Plaza", 37.7955, -122.3937, 8.0, "4:15 - 4:45"),
        (created_groups[0], "Long Run Sunday", 5, "Crissy Field", 37.8039, -122.4662, 21.1, "5:00 - 5:30"),
        (created_groups[1], "Headlands Ascent", 3, "Rodeo Beach", 37.8324, -122.5388, 14.0, "6:00 - 7:00"),
        (created_groups[4], "Bridge Loop", 4, "Golden Gate Welcome Center", 37.8078, -122.4750, 10.0, "5:15 - 5:45"),
    ]
    for g, title, days_ahead, mp, lat, lng, dist, pace in workouts:
        wd = (base + timedelta(days=days_ahead)).replace(hour=7, minute=0, second=0, microsecond=0)
        await db.workouts.insert_one({
            "id": str(uuid.uuid4()), "group_id": g["id"], "title": title, "description": "See you there!",
            "workout_date": wd.isoformat(), "meeting_point_name": mp, "latitude": lat, "longitude": lng,
            "distance_km": dist, "target_pace": pace, "created_by": admin["id"], "created_at": now_iso(),
        })
    logger.info("Seed complete")


async def seed_past_runs():
    """Give the demo account some completed runs so Run Stats look alive (idempotent)."""
    admin = await db.users.find_one({"email": "demo@stridetribe.com"})
    if not admin:
        return
    grp = await db.groups.find_one({"name": "Dawn Patrol Runners"})
    if not grp:
        return
    now = datetime.now(timezone.utc)
    existing = await db.workouts.count_documents({"group_id": grp["id"], "workout_date": {"$lt": now.isoformat()}})
    if existing:
        return
    past = [
        ("Recovery Jog", 3, "Marina Green", 5.0, "5:30 - 6:00"),
        ("Interval Session", 6, "Kezar Stadium", 8.0, "4:00 - 4:30"),
        ("Weekend Long Run", 9, "Ocean Beach", 18.0, "5:15 - 5:45"),
        ("Hill Repeats", 13, "Twin Peaks", 10.0, "4:45 - 5:15"),
    ]
    for title, days_ago, mp, dist, pace in past:
        wd = (now - timedelta(days=days_ago)).replace(hour=7, minute=0, second=0, microsecond=0)
        wid = str(uuid.uuid4())
        await db.workouts.insert_one({
            "id": wid, "group_id": grp["id"], "title": title, "description": "Great effort!",
            "workout_date": wd.isoformat(), "meeting_point_name": mp, "latitude": 37.8, "longitude": -122.45,
            "distance_km": dist, "target_pace": pace, "created_by": admin["id"],
            "created_at": now_iso(), "reminder_sent": True,
        })
        await db.rsvps.insert_one({
            "id": str(uuid.uuid4()), "workout_id": wid, "user_id": admin["id"],
            "status": "going", "updated_at": now_iso(),
        })
    logger.info("Seed past runs complete")


@app.on_event("startup")
async def startup():
    try:
        await run_in_threadpool(init_storage)
    except Exception as e:
        logger.warning(f"Storage init failed: {e}")
    try:
        await db.users.create_index("email", unique=True)
        await db.memberships.create_index([("group_id", 1), ("user_id", 1)])
        await db.rsvps.create_index([("workout_id", 1), ("user_id", 1)])
        await seed()
        await seed_past_runs()
    except Exception as e:
        logger.warning(f"Startup init: {e}")
    # Background reminder loop
    asyncio.create_task(reminder_scheduler())


@api_router.get("/")
async def root():
    return {"message": "Stride Tribe API"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
