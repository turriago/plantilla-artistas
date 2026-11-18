import os
import secrets
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"


def ensure_env():
    if ENV_PATH.exists() or os.environ.get("DATABASE_URL"):
        return
    try:
        ENV_PATH.write_text(
            "\n".join([
                "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/historias",
                "ADMIN_PASSWORD=" + secrets.token_urlsafe(9),
                "SECRET_KEY=" + secrets.token_hex(24),
                "PORT=8080",
                "",
            ]),
            encoding="utf-8",
        )
    except OSError:
        return
    print("Se creó .env con la clave del admin.")


ensure_env()
load_dotenv(ENV_PATH)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
DB_READY = False
DB_ERROR = "PostgreSQL no está configurado."

SETTING_DEFAULTS = {
    "first_name": "Alejandra",
    "last_name": "Lemus Camacho",
    "role": "Realizadora audiovisual y comunicadora",
    "bio": "Estudiante de Comunicación Social y Medios Digitales. Uso la fotografía, la cámara y el guion para convertir una mirada en una historia que conecte con quien la ve. En una producción me muevo entre presentación, escritura y operación de cámara, con disciplina para cuidar el detalle y seguir cuando una toma no sale. Busco cine, series, documentales y comunicación deportiva donde el rigor se note en la imagen y en el relato.",
    "caption_small": "Estudiante de",
    "caption_strong": "Comunicación Social y Medios Digitales",
    "portrait": "assets/perfil.jpg",
    "software_pills": "*Edición, color y diseño\nProgramas por confirmar",
    "hardware_pills": "Manejo de cámara\nFotografía\nGrabación\nRedacción de guiones\nPresentación",
    "proof_title": "Tres piezas para",
    "proof_accent": "empezar.",
    "projects_intro": "Cuatro piezas: el póster de Sabrina Carpenter, Smartfilms, el póster de inteligencia artificial y el rodaje en Mocho.",
    "photos_intro": "Serie de fotografías. Al tocar una, se queda fija hasta que tú pases a la siguiente.",
    "contact_lead": "Escríbeme por correo o WhatsApp. En LinkedIn está mi perfil profesional y en Instagram, mi portafolio de trabajo.",
    "contact_email": "",
    "contact_linkedin": "",
    "contact_whatsapp": "",
    "contact_instagram": "",
}

_DB = None


def connect():
    global _DB
    import psycopg
    from psycopg.rows import dict_row
    if _DB is None or _DB.closed:
        _DB = psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=15)
    return _DB


def reset_db():
    global _DB
    if _DB is not None:
        try:
            _DB.close()
        except Exception:
            pass
    _DB = None


@contextmanager
def borrow():
    conn = connect()
    try:
        yield conn
    except Exception:
        try:
            conn.rollback()
        except Exception:
            reset_db()
        raise


def query(sql, params=(), one=False):
    import psycopg
    last_error = None
    for _attempt in (1, 2):
        conn = connect()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                if cur.description is None:
                    conn.commit()
                    return None
                row = cur.fetchone() if one else cur.fetchall()
            conn.commit()
            return row
        except psycopg.OperationalError as error:
            last_error = error
            reset_db()
        except Exception:
            try:
                conn.rollback()
            except Exception:
                reset_db()
            raise
    raise last_error


def init_db():
    global DB_READY, DB_ERROR
    try:
        schema = (ROOT / "schema.sql").read_text(encoding="utf-8")
        with borrow() as conn:
            with conn.cursor() as cur:
                for statement in schema.split(";"):
                    sql = statement.strip()
                    if sql:
                        cur.execute(sql)
                cur.execute("SELECT COUNT(*) AS total FROM projects")
                empty = cur.fetchone()["total"] == 0
                if empty:
                    seed(cur)
            conn.commit()
        DB_READY = True
        DB_ERROR = ""
    except Exception as error:
        DB_READY = False
        DB_ERROR = str(error)
        return
    try:
        from app.storage import remember_known_files
        remember_known_files()
    except Exception as error:
        print("No se pudieron copiar los archivos a la base:", error)


def seed(cur):
    for key, value in SETTING_DEFAULTS.items():
        cur.execute(
            "INSERT INTO settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO NOTHING",
            (key, value),
        )
    projects = [
        ("sabrina", "Sabrina Carpenter", "Póster", "Por Alejandra Lemus Camacho", "Adobe Illustrator", "Póster de su carrera, armado en Illustrator.", True, 1),
        ("smartfilms", "Smartfilms Barranquilla", "Certificado y video", "Asistente", "Guion, realización con celular y postproducción", "Certificado y video", True, 2),
        ("ia", "Optimización del uso de la Inteligencia Artificial en estudiantes de Ingeniería", "Póster", "Alejandra Lemus Camacho y Yeraldo Castro Martínez", "Por asignar", "", False, 3),
        ("mocho", "Mocho, Barranquilla", "Rodaje", "Por asignar", "Celular y trípode", "Rodaje", True, 4),
    ]
    ids = {}
    for item in projects:
        cur.execute(
            """INSERT INTO projects (slug, title, format, role, tools, home_line, show_on_home, sort_order)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            item,
        )
        ids[item[0]] = cur.fetchone()["id"]
    media = [
        ("sabrina", "image", "assets/casos/sabrina-proceso.jpg", "Collage de Sabrina Carpenter abierto en Illustrator", "Esta foto es el archivo abierto en Adobe Illustrator. Es un póster sobre la carrera de Sabrina Carpenter: el collage junta su retrato con recortes de su trabajo, entre ellos Manchild, Disney, Girl Meets World y el álbum emails I can't send. Firmado por Alejandra Lemus Camacho. Al pie del impreso se leen la postproducción, la tutoría de Ronny Pérez y el periodo 2025-2.", False, 1),
        ("sabrina", "image", "assets/casos/sabrina-poster.jpg", "Póster impreso de Sabrina Carpenter", "Esta foto es el póster ya impreso, firmado por Alejandra Lemus Camacho. Resume la carrera de Sabrina Carpenter con un collage sobre su retrato: Manchild, Disney, Girl Meets World y el álbum emails I can't send, entre otros. Al pie se leen la postproducción, la tutoría de Ronny Pérez y el periodo 2025-2.", True, 2),
        ("smartfilms", "image", "assets/casos/smartfilms.jpg", "Certificado de Smartfilms Barranquilla a nombre de Alejandra Lemus Camacho", "Certificado de Smartfilms Barranquilla a nombre de Alejandra Lemus Camacho, de noviembre de 2025. Certifica la asistencia a las capacitaciones de guion y storytelling, realización audiovisual con celulares, narrativas y dirección, postproducción, estrategia de contenidos para redes y habilidades blandas: 12 horas de teoría y 16 de práctica, en modalidad híbrida. Lo firma Yesenia Valencia, CEO de Smartfilms.", True, 1),
        ("smartfilms", "video", "assets/casos/video-01.mp4", "Primer video de Smartfilms", "Primer video de la pieza de Smartfilms Barranquilla. Acompaña el certificado de la capacitación.", False, 2),
        ("smartfilms", "video", "assets/casos/video-02.mp4", "Segundo video de Smartfilms", "Segundo video de la pieza de Smartfilms Barranquilla. Acompaña el certificado de la capacitación.", False, 3),
        ("ia", "image", "assets/casos/ia-poster.jpg", "Alejandra Lemus Camacho junto al póster sobre inteligencia artificial", "Alejandra Lemus Camacho junto al póster «Optimización del uso de la Inteligencia Artificial en estudiantes de Ingeniería», de la Universidad de la Costa. También aparece el nombre de Yeraldo Castro Martínez. El póster muestra el propósito, la ruta metodológica, la prueba piloto y las referencias.", True, 1),
        ("ia", "video", "assets/casos/ia-video.mp4", "Video del póster de inteligencia artificial", "Video que acompaña el póster sobre el uso de la inteligencia artificial en estudiantes de Ingeniería.", False, 2),
        ("mocho", "image", "assets/casos/mocho-tripode.jpg", "Celular en trípode grabando el manglar", "Celular montado en un trípode, grabando desde el muelle de madera hacia el manglar.", False, 1),
        ("mocho", "image", "assets/casos/mocho-playa.jpg", "Claqueta frente al marco de Mocho, en Barranquilla", "Claqueta frente al marco amarillo de Mocho, de la Alcaldía de Barranquilla, en la playa.", True, 2),
    ]
    for slug, kind, path, alt, caption, cover, order in media:
        cur.execute(
            """INSERT INTO media (project_id, kind, file_path, alt, caption, is_cover, sort_order)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (ids[slug], kind, path, alt, caption, cover, order),
        )
    photos = [
        ("assets/carrusel/01-aves.jpg", "Gaviotas sobre un banco de arena", "Gaviotas sobre un banco de arena.", 1),
        ("assets/carrusel/02-marea.jpg", "Agua y arena entre el manglar", "Agua y arena entre el manglar.", 2),
        ("assets/carrusel/03-garza.jpg", "Garza blanca en el manglar", "Garza blanca en el manglar.", 3),
        ("assets/carrusel/04-ciudad.jpg", "Ciudad al anochecer", "Ciudad al anochecer.", 4),
    ]
    for path, alt, caption, order in photos:
        cur.execute(
            "INSERT INTO photos (file_path, alt, caption, sort_order) VALUES (%s, %s, %s, %s)",
            (path, alt, caption, order),
        )
