-- Update Alex Creative to achieve 80%+ match with Mike's profile
-- Current Alex: 53.2% match
-- Target: 80%+ match

-- Mike's profile:
-- Interests: ["Painting", "Comedy", "Drama", "AI", "Mobile Apps", "Meditation", "Entrepreneurship"]
-- Concerns: ["health", "personal"]
-- Connection type: "support"
-- Location: "local"

-- To get 80%+ match, Alex needs:
-- 1. Keep shared interests: AI, Mobile Apps, Entrepreneurship (already good at 88%)
-- 2. Add shared concerns: health, personal
-- 3. Match connection type: support
-- 4. Keep location: local

UPDATE profiles 
SET 
  connect_concerns = ARRAY['health', 'personal'],
  connect_type = 'support'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- This should give us:
-- Interest score: 0.88 (88% - 3 shared interests)
-- Concern score: 1.0 (100% - 2 shared concerns) 
-- Communication score: 1.0 (100% - same connection type)
-- Location score: 1.0 (100% - both local)
-- 
-- Weighted total: (0.88 * 0.4) + (1.0 * 0.3) + (1.0 * 0.2) + (1.0 * 0.1)
-- = 0.352 + 0.3 + 0.2 + 0.1 = 0.952 = 95.2%
