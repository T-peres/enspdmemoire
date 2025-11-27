-- Add attachment_path column to thesis_topics table
ALTER TABLE thesis_topics
ADD COLUMN IF NOT EXISTS attachment_path TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN thesis_topics.attachment_path IS 'Path to the attached document in Supabase Storage (optional)';
