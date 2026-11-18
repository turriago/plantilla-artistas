(function () {
  const dialog = document.getElementById("caseLb");
  const lightboxImage = document.getElementById("caseLbimg");
  const lightboxVideo = document.getElementById("caseLbvideo");
  const caption = document.getElementById("caseLbcap");
  const reels = Array.from(document.querySelectorAll("[data-reel]"));

  if (!dialog || !lightboxImage || !reels.length) {
    return;
  }

  let owner = null;
  let step = function () {};
  const players = [];

  const setCaption = (text) => {
    if (!caption) {
      return;
    }
    caption.textContent = text || "";
    caption.hidden = !text && !document.body.classList.contains("editing");
  };

  const close = () => {
    if (!owner) {
      return;
    }
    const current = owner;
    if (lightboxVideo && !lightboxVideo.hidden && current.video) {
      const time = lightboxVideo.currentTime || 0;
      lightboxVideo.pause();
      current.video.currentTime = time;
    }
    if (lightboxVideo) {
      lightboxVideo.pause();
      lightboxVideo.hidden = true;
    }
    lightboxImage.hidden = false;
    dialog.hidden = true;
    dialog._reel = null;
    document.body.classList.remove("no-scroll", "case-open");
    owner = null;
    setCaption("");
    players.forEach((player) => player.resume());
  };

  reels.forEach((reel) => {
    let items = [];
    try {
      items = JSON.parse(reel.getAttribute("data-items") || "[]");
    } catch (error) {
      items = [];
    }
    if (!items.length) {
      return;
    }

    const photo = reel.querySelector("img");
    const video = reel.querySelector("video");
    const dots = reel.querySelector(".case-dots");
    let index = 0;
    let timer = 0;
    reel.video = video;
    reel._items = items;

    const stop = () => {
      window.clearTimeout(timer);
      timer = 0;
      if (video) {
        video.pause();
      }
    };

    const paintDots = () => {
      if (!dots) {
        return;
      }
      Array.from(dots.children).forEach((dot, dotIndex) => {
        if (dotIndex === index) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
    };

    const syncLightbox = (item) => {
      const src = item._preview || item.src;
      setCaption(item.caption || "");
      if (item.type === "video" && lightboxVideo) {
        lightboxImage.hidden = true;
        lightboxVideo.hidden = false;
        if (lightboxVideo.getAttribute("src") !== src) {
          lightboxVideo.src = src;
        }
        if (video) {
          lightboxVideo.currentTime = video.currentTime || 0;
        }
        lightboxVideo.play().catch(() => {});
        return;
      }
      if (lightboxVideo) {
        lightboxVideo.pause();
        lightboxVideo.hidden = true;
      }
      lightboxImage.hidden = false;
      lightboxImage.src = src;
      lightboxImage.alt = item.alt || "";
    };

    const show = (next) => {
      index = (next + items.length) % items.length;
      reel._index = index;
      const item = items[index];
      stop();
      paintDots();

      const src = item._preview || item.src;
      if (item.type === "video" && video) {
        reel.classList.add("is-video");
        if (photo) {
          photo.hidden = true;
        }
        video.hidden = false;
        if (video.getAttribute("src") !== src) {
          video.src = src;
        }
        if (owner !== reel && !document.body.classList.contains("editing")) {
          video.play().catch(() => {});
        }
      } else if (photo) {
        reel.classList.remove("is-video");
        if (video) {
          video.hidden = true;
        }
        photo.hidden = false;
        photo.src = src;
        photo.alt = item.alt || "";
        if (owner !== reel && !document.body.classList.contains("editing")) {
          timer = window.setTimeout(() => show(index + 1), 2200);
        }
      }

      if (owner === reel) {
        syncLightbox(item);
      }
    };

    if (dots) {
      dots.replaceChildren();
      items.forEach((item, itemIndex) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", item.type === "video" ? "Video " + (itemIndex + 1) : "Foto " + (itemIndex + 1));
        dot.addEventListener("click", () => show(itemIndex));
        dots.appendChild(dot);
      });
    }

    const open = () => {
      players.forEach((player) => player.stop());
      owner = reel;
      step = (direction) => show(index + direction);
      dialog._reel = reel;
      dialog.hidden = false;
      document.body.classList.add("no-scroll", "case-open");
      syncLightbox(items[index]);
    };

    if (video) {
      video.addEventListener("ended", () => {
        if (owner === reel || document.body.classList.contains("editing")) {
          return;
        }
        show(index + 1);
      });
    }

    const previous = reel.querySelector(".case-arrow.prev");
    const next = reel.querySelector(".case-arrow.next");
    const zoom = reel.querySelector(".case-zoom");
    if (previous) {
      previous.addEventListener("click", () => show(index - 1));
    }
    if (next) {
      next.addEventListener("click", () => show(index + 1));
    }
    if (zoom) {
      zoom.addEventListener("click", open);
    }
    if (photo) {
      photo.addEventListener("click", open);
    }

    players.push({
      stop,
      resume: () => {
        if (owner) {
          return;
        }
        show(index);
      }
    });

    show(0);
  });

  if (caption && document.body.classList.contains("editing")) {
    caption.addEventListener("input", () => {
      if (!owner || !owner._items) {
        return;
      }
      const item = owner._items[owner._index];
      if (!item) {
        return;
      }
      item.caption = caption.textContent.trim();
      owner.setAttribute("data-items", JSON.stringify(owner._items));
    });
  }

  const closeButton = document.getElementById("caseLbx");
  const previousButton = document.getElementById("caseLbPrev");
  const nextButton = document.getElementById("caseLbNext");

  if (closeButton) {
    closeButton.addEventListener("click", close);
  }
  if (previousButton) {
    previousButton.addEventListener("click", () => step(-1));
  }
  if (nextButton) {
    nextButton.addEventListener("click", () => step(1));
  }
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      close();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (dialog.hidden || !owner) {
      return;
    }
    if (event.target && event.target.isContentEditable) {
      if (event.key === "Escape") {
        close();
      }
      return;
    }
    if (event.key === "Escape") {
      close();
    }
    if (event.key === "ArrowLeft") {
      step(-1);
    }
    if (event.key === "ArrowRight") {
      step(1);
    }
  });
  if (lightboxVideo) {
    lightboxVideo.addEventListener("ended", () => {});
  }
})();
