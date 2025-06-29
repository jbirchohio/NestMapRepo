-- Add self-referential foreign key to trip_comments table
ALTER TABLE trip_comments
ADD CONSTRAINT fk_trip_comments_parent_id
FOREIGN KEY (parent_id) 
REFERENCES trip_comments(id)
ON DELETE CASCADE;
