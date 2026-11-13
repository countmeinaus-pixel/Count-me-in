-- Profile photos: at most 3 MB per file (was 5 MB), JPEG only.
-- The app crops photos to a square of at most 800×800 px in the browser, so a
-- saved photo is normally 100–200 KB. This limit also stops uploads that skip the app.
-- Safe to run more than once.

update storage.buckets
set file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg']
where id = 'avatars';
