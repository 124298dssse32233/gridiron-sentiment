-- Insert mock sentiment data for testing Pulse page
-- This creates sample sentiment data for 6 popular teams

INSERT INTO "team_sentiment" ("teamId", "seasonId", "measuredAt", "score", "trend", "buzzVolume", "blueskyScore", "redditScore", "newsScore", "hotTopics", "sourceBreakdown")
SELECT
  t.id,
  s.id,
  NOW(),
  (60 + random() * 40)::numeric(5,1) as "score", -- Random 60-100
  CASE WHEN random() > 0.5 THEN 'up' ELSE 'down' END as "trend",
  (100 + random() * 500)::int as "buzzVolume",
  (50 + random() * 50)::numeric(5,1) as "blueskyScore",
  (50 + random() * 50)::numeric(5,1) as "redditScore",
  (50 + random() * 50)::numeric(5,1) as "newsScore",
  '["playoffs", "heisman", "coaching"]'::jsonb as "hotTopics",
  '{"bluesky": 30, "reddit": 50, "news": 20}'::jsonb as "sourceBreakdown"
FROM "team" t
CROSS JOIN (SELECT id FROM "season" WHERE year = 2024 LIMIT 1) s
WHERE t.abbreviation IN ('ALA', 'UGA', 'OSU', 'MICH', 'TEX', 'FSU')
ON CONFLICT DO NOTHING;
