import json
import os
import re
import secrets
from functools import wraps

from flask import Flask, abort, jsonify, redirect, render_template, request, send_from_directory, session, url_for

import app.db as db
from app.db import ROOT, SETTING_DEFAULTS, borrow, init_db, query
from app.storage import delete_upload, replace_stored_file, save_pdf, save_upload, site_file

app = Flask(__name__, template_folder=str(ROOT / "templates"))
app.secret_key = os.environ.get("SECRET_KEY", "dev")
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024 + 256 * 1024
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")


@app.errorhandler(413)
def too_large(_error):
    return jsonify(ok=False, error="El archivo pesa más de 4 MB."), 413


def pills(text):
    items = []
    for line in (text or "").splitlines():
        clean = line.strip()
        if not clean:
            continue
        live = clean.startswith("*")
        items.append({"text": clean[1:].strip() if live else clean, "live": live})
    return items


def public_context():
    bundle = query(
        """
        SELECT
          COALESCE((SELECT json_agg(row_to_json(s)) FROM settings s), '[]'::json) AS settings,
          COALESCE((SELECT json_agg(row_to_json(p) ORDER BY p.sort_order, p.id) FROM projects p), '[]'::json) AS projects,
          COALESCE((SELECT json_agg(row_to_json(m) ORDER BY m.sort_order, m.id) FROM media m), '[]'::json) AS media,
          COALESCE((SELECT json_agg(row_to_json(f) ORDER BY f.sort_order, f.id) FROM photos f), '[]'::json) AS photos
        """,
        one=True,
    )

    def rows(value):
        if not value:
            return []
        if isinstance(value, str):
            return json.loads(value)
        return value

    settings = dict(SETTING_DEFAULTS)
    for row in rows(bundle["settings"]):
        settings[row["key"]] = row["value"]
    settings["name"] = (settings.get("first_name", "") + " " + settings.get("last_name", "")).strip()
    grouped = {}
    for item in rows(bundle["media"]):
        grouped.setdefault(item["project_id"], []).append(item)
    projects = []
    home = []
    for project in rows(bundle["projects"]):
        media = grouped.get(project["id"], [])
        project["public_media"] = [
            {
                "id": item["id"],
                "type": item["kind"],
                "src": "/" + item["file_path"],
                "alt": item["alt"],
                "caption": item["caption"],
            }
            for item in media
        ]
        cover = next((item for item in media if item["is_cover"]), media[0] if media else None)
        project["cover_path"] = cover["file_path"] if cover else ""
        project["cover_alt"] = cover["alt"] if cover else project["title"]
        if project["show_on_home"] and cover:
            home.append(project)
        projects.append(project)
    return {
        "s": settings,
        "projects": projects,
        "home_projects": home,
        "photos": rows(bundle["photos"]),
        "software_pills": pills(settings.get("software_pills")),
        "hardware_pills": pills(settings.get("hardware_pills")),
    }


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)
    return session["csrf"]


def csrf_ok():
    return request.form.get("csrf") == session.get("csrf")


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not db.DB_READY:
            return render_template("admin/setup.html", message=db.DB_ERROR)
        if not session.get("admin"):
            return redirect(url_for("login"))
        return func(*args, **kwargs)
    return wrapper



def clean_url(value):
    value = (value or "").strip()
    if not value:
        return ""
    lowered = value.lower()
    if lowered.startswith("javascript:") or " " in value:
        return ""
    if lowered.startswith("http://") or lowered.startswith("https://"):
        return value
    if "." in value:
        return "https://" + value
    return ""


def clean_phone(value):
    return re.sub(r"\D", "", value or "")[:15]



def save_settings(fields):
    with borrow() as conn:
        with conn.cursor() as cur:
            for key in fields:
                cur.execute(
                    """INSERT INTO settings (key, value) VALUES (%s, %s)
                       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
                    (key, request.form.get(key, "").strip()),
                )
        conn.commit()


def save_project_fields():
    allowed = {"title", "format", "role", "tools", "home_line"}
    grouped = {}
    ids = request.form.getlist("project_id")
    parts = request.form.getlist("project_part")
    values = request.form.getlist("project_value")
    for project_id, part, value in zip(ids, parts, values):
        if part not in allowed:
            continue
        grouped.setdefault(project_id, {})[part] = value.strip()
    for project_id, fields in grouped.items():
        if not str(project_id).isdigit() or not fields:
            continue
        assignments = ", ".join(f"{key} = %s" for key in fields)
        query(
            f"UPDATE projects SET {assignments} WHERE id = %s",
            tuple(fields.values()) + (int(project_id),),
        )


def save_media_captions():
    for media_id, caption, alt in zip(
        request.form.getlist("media_id"),
        request.form.getlist("media_caption"),
        request.form.getlist("media_alt"),
    ):
        if str(media_id).isdigit():
            query(
                "UPDATE media SET caption = %s, alt = %s WHERE id = %s",
                (caption.strip(), alt.strip(), int(media_id)),
            )


def save_photo_captions():
    for photo_id, caption, alt in zip(
        request.form.getlist("photo_id"),
        request.form.getlist("photo_caption"),
        request.form.getlist("photo_alt"),
    ):
        if str(photo_id).isdigit():
            query(
                "UPDATE photos SET caption = %s, alt = %s WHERE id = %s",
                (caption.strip(), alt.strip(), int(photo_id)),
            )


def edit_page(template, save_path):
    if not db.DB_READY:
        return render_template("admin/setup.html", message=db.DB_ERROR)
    context = public_context()
    if template == "contacto.html":
        context["s"]["contact_linkedin"] = clean_url(context["s"].get("contact_linkedin"))
        context["s"]["contact_instagram"] = clean_url(context["s"].get("contact_instagram"))
        context["s"]["contact_whatsapp"] = clean_phone(context["s"].get("contact_whatsapp"))
    context.update(editing=True, csrf=csrf_token(), edit_save=save_path)
    return render_template(template, **context)


def page_or_template(folder, template):
    if not db.DB_READY:
        return send_from_directory(ROOT / folder, "index.html")
    return render_template(template, **public_context())


@app.route("/")
def root():
    return redirect("/inicio/")


@app.route("/inicio/")
def inicio_page():
    return page_or_template("inicio", "inicio.html")


@app.route("/casos/")
def casos_page():
    return page_or_template("casos", "casos.html")


@app.route("/fotos/")
def fotos_page():
    return page_or_template("fotos", "fotos.html")


@app.route("/contacto/")
def contacto_page():
    if not db.DB_READY:
        return send_from_directory(ROOT / "contacto", "index.html")
    context = public_context()
    context["s"]["contact_linkedin"] = clean_url(context["s"].get("contact_linkedin"))
    context["s"]["contact_instagram"] = clean_url(context["s"].get("contact_instagram"))
    context["s"]["contact_whatsapp"] = clean_phone(context["s"].get("contact_whatsapp"))
    return render_template("contacto.html", **context)



@app.route("/css/<path:name>")
def styles(name):
    return send_from_directory(ROOT / "static" / "css", name)


@app.route("/js/<path:name>")
def scripts(name):
    return send_from_directory(ROOT / "static" / "js", name)


@app.route("/assets/<path:name>")
def assets(name):
    return site_file("assets", name)


@app.route("/uploads/<path:name>")
def uploaded(name):
    return site_file("uploads", name)


@app.route("/galeria/")
@app.route("/galeria")
@app.route("/videos/")
@app.route("/videos")
@app.route("/proyectos/")
@app.route("/proyectos")
def old_projects():
    return redirect("/casos/")


@app.route("/sobre-mi/")
@app.route("/sobre-mi")
def old_about():
    return redirect("/inicio/#ella")


@app.route("/admin/login", methods=["GET", "POST"])
def login():
    if not db.DB_READY:
        return render_template("admin/setup.html", message=db.DB_ERROR)
    if session.get("admin"):
        return redirect("/editar/inicio/")
    error = ""
    if request.method == "POST":
        if not csrf_ok():
            abort(400)
        password = request.form.get("password", "")
        if ADMIN_PASSWORD and secrets.compare_digest(password, ADMIN_PASSWORD):
            session["admin"] = True
            return redirect("/editar/inicio/")
        error = "La clave no coincide."
    return render_template("admin/login.html", error=error, csrf=csrf_token())


@app.route("/admin/salir")
def logout():
    session.clear()
    return redirect("/inicio/")


@app.route("/admin")
@login_required
def admin_home():
    return redirect("/editar/inicio/")



@app.route("/admin/textos", methods=["GET", "POST"])
@login_required
def admin_textos():
    return redirect("/editar/inicio/")


@app.route("/admin/contacto", methods=["GET", "POST"])
@login_required
def admin_contacto():
    return redirect("/editar/contacto/")


@app.route("/admin/proyectos", methods=["GET", "POST"])
@app.route("/admin/proyectos/nuevo", methods=["GET", "POST"])
@app.route("/admin/proyectos/<int:project_id>", methods=["GET", "POST"])
@login_required
def admin_proyectos(project_id=None):
    return redirect("/editar/casos/")


@app.route("/admin/fotos", methods=["GET", "POST"])
@login_required
def admin_fotos():
    return redirect("/editar/fotos/")


@app.route("/editar/inicio/", methods=["GET", "POST"])
@login_required
def edit_inicio():
    if request.method == "POST":
        if not csrf_ok():
            abort(400)
        save_settings([
            "first_name", "last_name", "role", "bio", "caption_small", "caption_strong",
            "software_pills", "hardware_pills", "proof_title", "proof_accent",
        ])
        save_project_fields()
        portrait = save_upload(request.files.get("portrait"), images_only=True)
        if portrait:
            query(
                """INSERT INTO settings (key, value) VALUES ('portrait', %s)
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
                (portrait[1],),
            )
        for project_id, cover in zip(request.form.getlist("cover_project"), request.files.getlist("cover_file")):
            if not str(project_id).isdigit():
                continue
            row = query(
                """SELECT id, file_path FROM media
                   WHERE project_id = %s
                   ORDER BY is_cover DESC, sort_order, id""",
                (int(project_id),),
                one=True,
            )
            saved = replace_stored_file(row["file_path"] if row else "", cover, images_only=True)
            if not saved:
                continue
            if row:
                query(
                    "UPDATE media SET kind = %s, file_path = %s, is_cover = TRUE WHERE id = %s",
                    (saved[0], saved[1], row["id"]),
                )
            else:
                query(
                    """INSERT INTO media (project_id, kind, file_path, alt, caption, is_cover, sort_order)
                       VALUES (%s, %s, %s, '', '', TRUE, 1)""",
                    (int(project_id), saved[0], saved[1]),
                )
        save_pdf(request.files.get("cv"))
        return jsonify(ok=True)
    return edit_page("inicio.html", "/editar/inicio/")


@app.route("/editar/casos/", methods=["GET", "POST"])
@login_required
def edit_casos():
    if request.method == "POST":
        if not csrf_ok():
            abort(400)
        action = request.form.get("action")
        if action == "new-project":
            slug = "pieza-" + secrets.token_hex(3)
            created = query(
                """INSERT INTO projects (slug, title, format, role, tools, home_line, show_on_home, sort_order)
                   VALUES (%s, 'Nuevo proyecto', 'Por asignar', 'Por asignar', 'Por asignar', '', FALSE,
                   COALESCE((SELECT MAX(sort_order) FROM projects), 0) + 1) RETURNING id""",
                (slug,),
                one=True,
            )
            return jsonify(ok=True, id=created["id"])
        if action == "delete-project":
            project_id = int(request.form.get("project_id") or 0)
            rows = query("SELECT file_path FROM media WHERE project_id = %s", (project_id,)) or []
            query("DELETE FROM projects WHERE id = %s", (project_id,))
            for row in rows:
                delete_upload(row["file_path"])
            return jsonify(ok=True)
        if action == "delete-media":
            media_id = int(request.form.get("media_id") or 0)
            row = query("SELECT file_path FROM media WHERE id = %s", (media_id,), one=True)
            query("DELETE FROM media WHERE id = %s", (media_id,))
            if row:
                delete_upload(row["file_path"])
            return jsonify(ok=True)
        save_settings(["projects_intro"])
        save_project_fields()
        save_media_captions()
        for media_id, upload in zip(request.form.getlist("replace_media_id"), request.files.getlist("replace_media_file")):
            if not str(media_id).isdigit():
                continue
            row = query("SELECT file_path FROM media WHERE id = %s", (int(media_id),), one=True)
            saved = replace_stored_file(row["file_path"] if row else "", upload)
            if row and saved:
                query(
                    "UPDATE media SET kind = %s, file_path = %s WHERE id = %s",
                    (saved[0], saved[1], int(media_id)),
                )
        for project_id, upload in zip(request.form.getlist("upload_project"), request.files.getlist("upload_file")):
            saved = save_upload(upload)
            if saved and str(project_id).isdigit():
                query(
                    """INSERT INTO media (project_id, kind, file_path, alt, caption, sort_order)
                       VALUES (%s, %s, %s, '', '', COALESCE((SELECT MAX(sort_order) FROM media WHERE project_id = %s), 0) + 1)""",
                    (int(project_id), saved[0], saved[1], int(project_id)),
                )
        return jsonify(ok=True)
    return edit_page("casos.html", "/editar/casos/")


@app.route("/editar/fotos/", methods=["GET", "POST"])
@login_required
def edit_fotos():
    if request.method == "POST":
        if not csrf_ok():
            abort(400)
        if request.form.get("action") == "delete-photo":
            photo_id = int(request.form.get("photo_id") or 0)
            row = query("SELECT file_path FROM photos WHERE id = %s", (photo_id,), one=True)
            query("DELETE FROM photos WHERE id = %s", (photo_id,))
            if row:
                delete_upload(row["file_path"])
            return jsonify(ok=True)
        save_settings(["photos_intro"])
        save_photo_captions()
        for photo_id, upload in zip(request.form.getlist("replace_photo_id"), request.files.getlist("replace_photo_file")):
            if not str(photo_id).isdigit():
                continue
            row = query("SELECT file_path FROM photos WHERE id = %s", (int(photo_id),), one=True)
            saved = replace_stored_file(row["file_path"] if row else "", upload, images_only=True)
            if row and saved:
                query("UPDATE photos SET file_path = %s WHERE id = %s", (saved[1], int(photo_id)))
        for photo in request.files.getlist("new_photo"):
            saved = save_upload(photo, images_only=True)
            if saved:
                query(
                    """INSERT INTO photos (file_path, alt, caption, sort_order)
                       VALUES (%s, '', '', COALESCE((SELECT MAX(sort_order) FROM photos), 0) + 1)""",
                    (saved[1],),
                )
        return jsonify(ok=True)
    return edit_page("fotos.html", "/editar/fotos/")


@app.route("/editar/contacto/", methods=["GET", "POST"])
@login_required
def edit_contacto():
    if request.method == "POST":
        if not csrf_ok():
            abort(400)
        fields = {
            "contact_lead": request.form.get("contact_lead", "").strip(),
            "contact_email": request.form.get("contact_email", "").strip(),
            "contact_linkedin": clean_url(request.form.get("contact_linkedin")),
            "contact_whatsapp": clean_phone(request.form.get("contact_whatsapp")),
            "contact_instagram": clean_url(request.form.get("contact_instagram")),
        }
        with borrow() as conn:
            with conn.cursor() as cur:
                for key, value in fields.items():
                    cur.execute(
                        """INSERT INTO settings (key, value) VALUES (%s, %s)
                           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
                        (key, value),
                    )
            conn.commit()
        save_pdf(request.files.get("cv"))
        return jsonify(ok=True)
    return edit_page("contacto.html", "/editar/contacto/")



@app.route("/<path:filename>")
def plain_file(filename):
    if "/" in filename or "\\" in filename or filename.startswith("."):
        abort(404)
    if not filename.endswith(".html"):
        abort(404)
    target = (ROOT / filename).resolve()
    if target.parent != ROOT or not target.is_file():
        abort(404)
    return send_from_directory(ROOT, filename)


init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    if db.DB_READY:
        print(f"Admin listo en http://127.0.0.1:{port}/admin")
    else:
        print("Sin PostgreSQL el sitio público sigue igual.")
        print(db.DB_ERROR)
    app.run(host="127.0.0.1", port=port, debug=False)
