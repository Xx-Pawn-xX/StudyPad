const SUPABASE_URL = "https://rityorcaaourlpxxykyq.supabase.co/";
const SUPABASE_KEY = "sb_publishable_HBvlHS70PVJzDZpH87cutg_ka-r27WE";

const { createClient } = supabase;

const db = createClient(SUPABASE_URL, SUPABASE_KEY);