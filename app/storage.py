import secrets
from pathlib import Path

from flask import Response, abort, request, send_from_directory

from app.db import ROOT, query

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}


def mime_for(path):
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/mp4",
        ".m4v": "video/mp4",
        ".pdf": "application/pdf",
    }.get(Path(path).suffix.lower(), "application/octet-stream")


def remember_file(path, data):
    query(
        """INSERT INTO stored_files (path, mime, bytes)
           VALUES (%s, %s, %s)
           ON CONFLICT (path) DO UPDATE
           SET mime = EXCLUDED.mime, bytes = EXCLUDED.bytes, updated_at = now()""",
        (path, mime_for(path), data),
    )


def forget_file(path):
    if path and path.startswith("uploads/"):
        query("DELETE FROM stored_files WHERE path = %s", (path,))


def remember_known_files():
    paths = ["assets/favicon.png"]
    listed = query(
        "SELECT file_path AS path FROM media UNION SELECT file_path FROM photos"
    ) or []
    paths.extend(row["path"] for row in listed)
    portrait = query("SELECT value FROM settings WHERE key = 'portrait'", one=True)
    if portrait and portrait.get("value"):
        paths.append(portrait["value"])
    if (ROOT / "assets" / "cv.pdf").is_file():
        paths.append("assets/cv.pdf")
    have = {row["path"] for row in (query("SELECT path FROM stored_files") or [])}
    for path in dict.fromkeys(paths):
        if not path or path in have or ".." in Path(path).parts:
            continue
        target = (ROOT / path).resolve()
        if not str(target).startswith(str(ROOT)) or not target.is_file():
            continue
        remember_file(path, target.read_bytes())


def stored_response(path):
    row = query("SELECT mime, bytes FROM stored_files WHERE path = %s", (path,), one=True)
    if not row or row["bytes"] is None:
        return None
    data = bytes(row["bytes"])
    mime = row["mime"] or mime_for(path)
    total = len(data)
    headers = {"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400"}
    range_header = request.headers.get("Range", "")
    if range_header.startswith("bytes="):
        piece = range_header[6:].split(",", 1)[0]
        start_s, _, end_s = piece.partition("-")
        try:
            start = int(start_s) if start_s else 0
            end = int(end_s) if end_s else total - 1
        except ValueError:
            start, end = 0, total - 1
        if start >= total or start > end:
            return Response(status=416, headers={"Content-Range": f"bytes */{total}"})
        end = min(end, total - 1)
        chunk = data[start:end + 1]
        headers["Content-Range"] = f"bytes {start}-{end}/{total}"
        headers["Content-Length"] = str(len(chunk))
        return Response(chunk, status=206, mimetype=mime, headers=headers)
    headers["Content-Length"] = str(total)
    return Response(data, status=200, mimetype=mime, headers=headers)


def site_file(folder, name):
    if not name or "\\" in name or ".." in Path(name).parts:
        abort(404)
    rel = f"{folder}/{name}"
    target = (ROOT / folder / name).resolve()
    base = (ROOT / folder).resolve()
    if str(target).startswith(str(base)) and target.is_file():
        return send_from_directory(base, name)
    found = stored_response(rel)
    if found is not None:
        return found
    abort(404)


def save_upload(file, images_only=False):
    if not file or not file.filename:
        return None
    ext = Path(file.filename).suffix.lower()
    allowed = IMAGE_EXT if images_only else IMAGE_EXT | VIDEO_EXT
    if ext not in allowed:
        return None
    data = file.read()
    if not data:
        return None
    name = secrets.token_hex(8) + ext
    destination = ROOT / "uploads" / name
    try:
        destination.parent.mkdir(exist_ok=True)
        destination.write_bytes(data)
    except OSError:
        pass
    remember_file("uploads/" + name, data)
    kind = "video" if ext in VIDEO_EXT else "image"
    return kind, "uploads/" + name


def delete_upload(path):
    forget_file(path)
    if not path or not path.startswith("uploads/"):
        return
    target = (ROOT / path).resolve()
    uploads = (ROOT / "uploads").resolve()
    if str(target).startswith(str(uploads)) and target.is_file():
        target.unlink()


def replace_stored_file(old_path, upload, images_only=False):
    saved = save_upload(upload, images_only=images_only)
    if not saved:
        return None
    delete_upload(old_path)
    return saved


def save_pdf(upload):
    if not upload or not upload.filename or Path(upload.filename).suffix.lower() != ".pdf":
        return False
    data = upload.read()
    if not data:
        return False
    target = ROOT / "assets" / "cv.pdf"
    try:
        target.parent.mkdir(exist_ok=True)
        target.write_bytes(data)
    except OSError:
        pass
    remember_file("assets/cv.pdf", data)
    return True
