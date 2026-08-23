export type User = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string;
  location?: string;
  pace_min_km?: string;
  reminder_prefs?: string[];
};

export type Session = {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  workout_date: string;
  meeting_point_name: string;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  target_pace?: string | null;
  created_by?: string;
  going_count: number;
  my_rsvp?: string | null;
  attendees?: Attendee[];
  group_name?: string;
  is_admin?: boolean;
};

export type Group = {
  id: string;
  name: string;
  description?: string;
  admin_id: string;
  admin_name?: string;
  city: string;
  category: string;
  is_private: boolean;
  image_url?: string | null;
  meeting_days: string[];
  created_at?: string;
  member_count: number;
  my_status?: string | null;
  next_session?: Session | null;
};

export type Attendee = {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  pace_min_km?: string;
};

export type Member = Attendee & { status: string; joined_at?: string };
