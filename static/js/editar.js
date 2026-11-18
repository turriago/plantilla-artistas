(function () {
  const bar = document.querySelector(".edit-bar");
  if (!bar) {
    return;
  }

  const status = document.getElementById("editStatus");
  const csrf = document.querySelector('meta[name="csrf"]');
  const saveUrl = document.body.dataset.save;
  const MAX_BYTES = 4 * 1024 * 1024;
  const KINDS = {
    image: { pattern: /\.(jpe?g|png|webp|gif)$/i, label: "una foto JPG, PNG o WEBP" },
    media: { pattern: /\.(jpe?g|png|webp|gif|mp4|webm|mov|m4v)$/i, label: "una foto o un video MP4 o MOV" },
    pdf: { pattern: /\.pdf$/i, label: "un PDF" },
  };
  let dirty = false;

  const problemWith = (files, kind) => {
    const list = Array.from(files || []);
    if (!list.length) {
      return "Elige un archivo.";
    }
    const wrong = list.find((file) => !KINDS[kind].pattern.test(file.name || ""));
    if (wrong) {
      return "«" + wrong.name + "» no sirve aquí. Usa " + KINDS[kind].label + ".";
    }
    const total = list.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_BYTES) {
      return list.length > 1
        ? "Son más de 4 MB juntos. Elige menos archivos a la vez."
        : "«" + list[0].name + "» pesa más de 4 MB. Usa uno más liviano.";
    }
    return "";
  };

  const textOf = (field) => {
    if (field.dataset.multiline) {
      return field.innerText.replace(/\u00a0/g, " ").trim();
    }
    return (field.textContent || "").replace(/\s+/g, " ").trim();
  };

  const markDirty = () => {
    dirty = true;
    status.textContent = "Hay cambios sin guardar.";
  };

  document.addEventListener("input", (event) => {
    if (event.target.closest && event.target.closest("[contenteditable]")) {
      markDirty();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  document.querySelectorAll("[contenteditable='plaintext-only']").forEach((field) => {
    if (field.dataset.multiline) {
      return;
    }
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
      }
    });
  });

  document.querySelectorAll("[data-add-pill]").forEach((button) => {
    button.addEventListener("click", () => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.setAttribute("contenteditable", "plaintext-only");
      pill.textContent = "Nueva";
      button.before(pill);
      pill.focus();
      markDirty();
    });
  });

  const caption = document.getElementById("caseLbcap");
  if (caption) {
    caption.setAttribute("contenteditable", "plaintext-only");
    caption.addEventListener("input", () => {
      const current = document.querySelector("#fotoGrid [data-current]");
      if (current) {
        current.dataset.caption = caption.textContent.trim();
      }
    });
  }

  const post = async (data) => {
    data.append("csrf", csrf ? csrf.content : "");
    status.textContent = "Guardando...";
    let response;
    try {
      response = await fetch(saveUrl, { method: "POST", body: data });
    } catch (error) {
      status.textContent = "No se pudo guardar. Revisa el internet y vuelve a intentar.";
      return false;
    }
    if (!response.ok) {
      status.textContent = response.status === 413
        ? "No se guardó: el archivo pesa más de 4 MB."
        : "No se pudo guardar.";
      return false;
    }
    status.textContent = "Guardado";
    return true;
  };

  const collectTexts = (data) => {
    document.querySelectorAll("[data-field]").forEach((field) => {
      data.append(field.dataset.field, textOf(field));
    });
    document.querySelectorAll("[data-pills]").forEach((group) => {
      const lines = Array.from(group.querySelectorAll(".pill:not(.pill-add)")).map((pill) => {
        const text = (pill.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) {
          return "";
        }
        return (pill.classList.contains("is-live") ? "*" : "") + text;
      }).filter(Boolean);
      data.append(group.dataset.pills, lines.join("\n"));
    });
    document.querySelectorAll("[data-project][data-part]").forEach((field) => {
      data.append("project_id", field.dataset.project);
      data.append("project_part", field.dataset.part);
      data.append("project_value", textOf(field));
    });
    document.querySelectorAll("[data-reel]").forEach((reel) => {
      let items = [];
      try {
        items = JSON.parse(reel.getAttribute("data-items") || "[]");
      } catch (error) {
        items = [];
      }
      items.forEach((item) => {
        if (!item.id) {
          return;
        }
        data.append("media_id", item.id);
        data.append("media_caption", item.caption || "");
        data.append("media_alt", item.alt || "");
      });
    });
    document.querySelectorAll("#fotoGrid [data-id]").forEach((photo) => {
      data.append("photo_id", photo.dataset.id);
      data.append("photo_caption", photo.dataset.caption || "");
      data.append("photo_alt", photo.dataset.alt || "");
    });
  };

  const save = async (addFiles) => {
    const data = new FormData();
    collectTexts(data);
    if (addFiles) {
      addFiles(data);
    }
    const saved = await post(data);
    if (!saved) {
      return false;
    }
    dirty = false;
    if (addFiles) {
      window.location.reload();
    }
    return true;
  };

  const saveTextsFirst = async () => (dirty ? save(null) : true);

  const onFile = (input, kind, addFiles) => {
    input.addEventListener("change", async () => {
      const files = input.files;
      const problem = problemWith(files, kind);
      if (problem) {
        status.textContent = problem;
        input.value = "";
        return;
      }
      const chosen = Array.from(files);
      input.value = "";
      await save((data) => addFiles(data, chosen));
    });
  };

  const portrait = document.getElementById("portraitFile");
  if (portrait) {
    onFile(portrait, "image", (data, files) => data.append("portrait", files[0]));
  }

  document.querySelectorAll("#cvFile").forEach((input) => {
    onFile(input, "pdf", (data, files) => data.append("cv", files[0]));
  });

  document.querySelectorAll("[data-cover]").forEach((input) => {
    onFile(input, "image", (data, files) => {
      data.append("cover_project", input.dataset.cover);
      data.append("cover_file", files[0]);
    });
  });

  const replaceInReel = (reel, article) => (data, files) => {
    const item = reel && reel._items && reel._items[reel._index || 0];
    if (item && item.id) {
      data.append("replace_media_id", item.id);
      data.append("replace_media_file", files[0]);
      return;
    }
    const adder = article && article.querySelector("[data-upload-project]");
    if (adder) {
      data.append("upload_project", adder.dataset.uploadProject);
      data.append("upload_file", files[0]);
    }
  };

  document.querySelectorAll(".replace-current").forEach((input) => {
    const article = input.closest("article");
    const reel = article && article.querySelector("[data-reel]");
    onFile(input, "media", replaceInReel(reel, article));
  });

  const changeSlide = document.getElementById("changeSlideFile");
  if (changeSlide) {
    onFile(changeSlide, "media", (data, files) => {
      const dialog = document.getElementById("caseLb");
      const reel = dialog && dialog._reel;
      replaceInReel(reel, reel && reel.closest("article"))(data, files);
    });
  }

  document.querySelectorAll("[data-upload-project]").forEach((input) => {
    onFile(input, "media", (data, files) => {
      data.append("upload_project", input.dataset.uploadProject);
      data.append("upload_file", files[0]);
    });
  });

  document.querySelectorAll("[data-replace-photo]").forEach((input) => {
    onFile(input, "image", (data, files) => {
      data.append("replace_photo_id", input.dataset.replacePhoto);
      data.append("replace_photo_file", files[0]);
    });
  });

  const addPhoto = document.getElementById("addPhoto");
  const newPhotos = document.getElementById("newPhotos");
  if (newPhotos) {
    if (addPhoto) {
      addPhoto.addEventListener("click", () => newPhotos.click());
    }
    onFile(newPhotos, "image", (data, files) => {
      files.forEach((file) => data.append("new_photo", file));
    });
  }

  document.getElementById("editSave").addEventListener("click", () => save(null));

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save(null);
    }
  });

  const runAction = async (data) => {
    if (!(await saveTextsFirst())) {
      return;
    }
    if (await post(data)) {
      dirty = false;
      window.location.reload();
    }
  };

  document.querySelectorAll("[data-remove-current]").forEach((button) => {
    button.addEventListener("click", async () => {
      const reel = button.closest("article") && button.closest("article").querySelector("[data-reel]");
      const item = reel && reel._items && reel._items[reel._index || 0];
      if (!item || !item.id) {
        status.textContent = "Este proyecto todavía no tiene fotos ni videos.";
        return;
      }
      if (!window.confirm("¿Quitar esta foto o video? El proyecto se queda.")) {
        return;
      }
      const data = new FormData();
      data.append("action", "delete-media");
      data.append("media_id", item.id);
      await runAction(data);
    });
  });

  document.querySelectorAll("[data-new-project]").forEach((button) => {
    button.addEventListener("click", async () => {
      const data = new FormData();
      data.append("action", "new-project");
      await runAction(data);
    });
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("¿Quitar esto de la página?")) {
        return;
      }
      const data = new FormData();
      data.append("action", button.dataset.action || "delete-project");
      data.append("project_id", button.dataset.delete);
      data.append("photo_id", button.dataset.delete);
      await runAction(data);
    });
  });
})();
