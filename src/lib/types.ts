// Hand-written for now. Later you can replace this with types generated from
// your database via the Supabase CLI: `supabase gen types typescript`.

export type Occasion = {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number;
};

export type Visibility = 'public' | 'private';

export type ListRow = {
  id: string;
  title: string;
  city: string;
  visibility: Visibility;
  like_count: number;
  occasion_id: string | null;
  owner_id: string;
  created_at: string;
  // present when the query joins the owner's profile
  profiles?: { display_name: string | null } | null;
};

export type Restaurant = {
  id: string;
  name: string;
  city: string;
  cover_image_url: string | null;
  rating: number | null;
};

export type ListItemRow = {
  id: string;
  position: number;
  note: string | null;
  // present when the query joins the restaurant
  restaurants?: Restaurant | null;
};
