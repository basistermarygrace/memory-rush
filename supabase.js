/* supabase.js - the bridge to the database */

const SUPABASE_URL = "https://ywshussjjqpeijnsbcir.supabase.co";
const SUPABASE_KEY = "sb_publishable_dUfibPqKDDYDtVbTVGkROw_zk9r3vPo";   // publishable key ONLY

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Save a score through the ONE allowed door: submit_score()
window.submitScoreToDb = async function (p) {
  const { error } = await sb.rpc("submit_score", {
    p_name: p.name,
    p_score: p.score,
    p_difficulty: p.difficulty,
    p_level: p.level,
    p_completed: p.completed,
    p_seconds: p.seconds
  });
  if (error) throw error;
};

// Read the top 50 (highest score first, earliest date wins ties)
window.fetchLeaderboard = async function () {
  const { data, error } = await sb
    .from("leaderboard")
    .select("display_name, best_score, best_difficulty, highest_level, completed_final, achieved_at")
    .order("best_score", { ascending: false })
    .order("achieved_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data;
};