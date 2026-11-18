/* =====================================================
       LOADER
    ===================================================== */

    window.addEventListener("DOMContentLoaded", () => {
      const loader = document.getElementById("loader");
      if (loader) {
        loader.classList.add("hide");
      }
    });

    const brand = document.querySelector(".brand");
    if (brand && !document.body.classList.contains("editing")) {
      let taps = 0;
      let wait = 0;
      brand.addEventListener("click", (event) => {
        event.preventDefault();
        taps += 1;
        window.clearTimeout(wait);
        if (taps >= 3) {
          taps = 0;
          window.location.href = "/admin";
          return;
        }
        const home = brand.getAttribute("href");
        wait = window.setTimeout(() => {
          taps = 0;
          window.location.href = home;
        }, 550);
      });
    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    const menuButton =
      document.getElementById("menuButton");

    const navLinks =
      document.getElementById("navLinks");


    if (menuButton && navLinks) {
      menuButton.addEventListener("click", () => {
        const open = navLinks.classList.toggle("open");
        menuButton.textContent = open ? "×" : "☰";
        menuButton.setAttribute("aria-expanded", open ? "true" : "false");
      });

      navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          navLinks.classList.remove("open");
          menuButton.textContent = "☰";
          menuButton.setAttribute("aria-expanded", "false");
        });
      });
    }


    /* =====================================================
       BLACK & WHITE MODE
    ===================================================== */

    const themeButton =
      document.getElementById("themeButton");


    if (themeButton) {
      const themeLabel = themeButton.querySelector(".theme-label");
      const setThemeLabel = (text) => {
        if (themeLabel) themeLabel.textContent = text;
      };

      themeButton.addEventListener("click", () => {
        document.body.classList.toggle("bw");
        const isBW = document.body.classList.contains("bw");
        setThemeLabel(isBW ? "COLOUR MODE" : "BLACK & WHITE");
        localStorage.setItem("silentStrokesBW", isBW);
      });

      if (localStorage.getItem("silentStrokesBW") === "true") {
        document.body.classList.add("bw");
        setThemeLabel("COLOUR MODE");
      }
    }

/* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const revealElements =
      document.querySelectorAll(".reveal");


    const revealObserver =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            if (entry.isIntersecting) {

              entry.target.classList.add("visible");

              revealObserver.unobserve(
                entry.target
              );

            }

          });

        },
        {
          threshold: .12
        }
      );


    revealElements.forEach(element => {

      revealObserver.observe(element);

    });


    /* =====================================================
       BACK TO TOP
    ===================================================== */

    const backTop =
      document.getElementById("backTop");


    window.addEventListener("scroll", () => {

      if (window.scrollY > 500) {

        backTop.classList.add("show");

      } else {

        backTop.classList.remove("show");

      }

    });


    backTop.addEventListener("click", () => {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    });


    /* =====================================================
       CURRENT YEAR
    ===================================================== */

    const year = document.getElementById("year");

    if (year) {

      year.textContent = new Date().getFullYear();

    }


    /* =====================================================
       SHOWREEL Y CV
       Si el archivo no está, el botón no lleva a un enlace roto.
    ===================================================== */

    let releaseSmart = () => {};
    let releaseIa = () => {};
    let pauseCaseReel = () => {};
    let pauseSmartReel = () => {};
    let pauseIaReel = () => {};
    let pauseMochoReel = () => {};
    let releaseMocho = () => {};
    let pauseFotosReel = () => {};
    let releaseFotos = () => {};
    let closeActiveMixed = () => {};
    let lightboxOwner = "";
    let onLightboxStep = () => {};

    const setCaseCaption = (text) => {

      const cap = document.getElementById("caseLbcap");

      if (!cap) {

        return;

      }

      cap.textContent = text || "";
      cap.hidden = !text && !document.body.classList.contains("editing");

    };

    const frame = document.getElementById("frame");
    const photo = document.getElementById("photo");
    const lightbox = document.getElementById("lb");

    if (frame && photo && lightbox) {

      const photos = [
        ["../assets/carrusel/01-aves.jpg", "Gaviotas sobre un banco de arena"],
        ["../assets/carrusel/02-marea.jpg", "Agua y arena entre el manglar"],
        ["../assets/carrusel/03-garza.jpg", "Garza blanca en el manglar"],
        ["../assets/carrusel/04-ciudad.jpg", "Ciudad al anochecer"]
      ];
      const dots = Array.from(frame.querySelectorAll(".dots button"));
      const lightboxImage = document.getElementById("lbimg");
      const timecode = document.getElementById("tc");
      const started = Date.now();
      let index = 0;
      let timer = 0;
      let swap = 0;

      const paintDots = () => {

        dots.forEach((dot, dotIndex) => {

          if (dotIndex === index) {

            dot.setAttribute("aria-current", "true");

          } else {

            dot.removeAttribute("aria-current");

          }

        });

      };

      const show = (next) => {

        index = (next + photos.length) % photos.length;
        paintDots();
        photo.classList.add("is-out");
        window.clearTimeout(swap);

        swap = window.setTimeout(() => {

          photo.src = photos[index][0];
          photo.alt = photos[index][1];
          photo.classList.remove("is-out");
          lightboxImage.src = photo.src;
          lightboxImage.alt = photo.alt;

        }, 280);

      };

      const start = () => {

        window.clearInterval(timer);

        timer = window.setInterval(() => {

          show(index + 1);

        }, 2200);

      };

      const stop = () => {

        window.clearInterval(timer);

      };

      const openLightbox = () => {

        lightboxImage.src = photo.src;
        lightboxImage.alt = photo.alt;
        lightbox.hidden = false;
        document.body.classList.add("no-scroll");
        stop();

      };

      const closeLightbox = () => {

        lightbox.hidden = true;
        document.body.classList.remove("no-scroll");
        start();
        releaseSmart();

      };

      document.getElementById("next").addEventListener("click", () => {

        show(index + 1);
        start();

      });

      document.getElementById("prev").addEventListener("click", () => {

        show(index - 1);
        start();

      });

      dots.forEach((dot, dotIndex) => {

        dot.addEventListener("click", () => {

          show(dotIndex);
          start();

        });

      });

      document.getElementById("zoom").addEventListener("click", openLightbox);
      document.getElementById("lbx").addEventListener("click", closeLightbox);

      lightbox.addEventListener("click", (event) => {

        if (event.target === lightbox) {

          closeLightbox();

        }

      });

      document.addEventListener("keydown", (event) => {

        if (lightbox.hidden) {

          return;

        }

        if (event.key === "Escape") {

          closeLightbox();

        }

        if (event.key === "ArrowRight") {

          show(index + 1);

        }

        if (event.key === "ArrowLeft") {

          show(index - 1);

        }

      });

      if (timecode) {

        const pad = (value) => String(value).padStart(2, "0");

        window.setInterval(() => {

          const elapsed = Date.now() - started;
          const frames = Math.floor((elapsed % 1000) / (1000 / 24));
          const seconds = Math.floor(elapsed / 1000);

          timecode.textContent =
            pad(Math.floor(seconds / 3600) % 100) + ":" +
            pad(Math.floor(seconds / 60) % 60) + ":" +
            pad(seconds % 60) + ":" +
            pad(frames);

        }, 42);

      }

      paintDots();
      start();

    }

    const caseReel = document.getElementById("caseReel");
    const casePhoto = document.getElementById("casePhoto");

    if (caseReel && casePhoto) {

      const casePhotos = [
        ["../assets/casos/sabrina-proceso.jpg", "Collage de Sabrina Carpenter abierto en Illustrator", "Esta foto es el archivo abierto en Adobe Illustrator. Es un póster sobre la carrera de Sabrina Carpenter: el collage junta su retrato con recortes de su trabajo, entre ellos Manchild, Disney, Girl Meets World y el álbum emails I can't send. Firmado por Alejandra Lemus Camacho. Al pie del impreso se leen la postproducción, la tutoría de Ronny Pérez y el periodo 2025-2."],
        ["../assets/casos/sabrina-poster.jpg", "Póster impreso de Sabrina Carpenter", "Esta foto es el póster ya impreso, firmado por Alejandra Lemus Camacho. Resume la carrera de Sabrina Carpenter con un collage sobre su retrato: Manchild, Disney, Girl Meets World y el álbum emails I can't send, entre otros. Al pie se leen la postproducción, la tutoría de Ronny Pérez y el periodo 2025-2."]
      ];
      const caseDots = Array.from(caseReel.querySelectorAll(".case-dots button"));
      const caseLightbox = document.getElementById("caseLb");
      const caseLightboxImage = document.getElementById("caseLbimg");
      let caseIndex = 0;
      let caseTimer = 0;
      let caseSwap = 0;

      const paintCaseDots = () => {

        caseDots.forEach((dot, dotIndex) => {

          if (dotIndex === caseIndex) {

            dot.setAttribute("aria-current", "true");

          } else {

            dot.removeAttribute("aria-current");

          }

        });

      };

      const showCase = (next) => {

        caseIndex = (next + casePhotos.length) % casePhotos.length;
        paintCaseDots();
        casePhoto.classList.add("is-out");
        window.clearTimeout(caseSwap);

        caseSwap = window.setTimeout(() => {

          casePhoto.src = casePhotos[caseIndex][0];
          casePhoto.alt = casePhotos[caseIndex][1];
          casePhoto.classList.remove("is-out");

          if (lightboxOwner === "case" && caseLightbox && !caseLightbox.hidden && caseLightboxImage) {

            caseLightboxImage.hidden = false;
            caseLightboxImage.src = casePhoto.src;
            caseLightboxImage.alt = casePhoto.alt;
            setCaseCaption(casePhotos[caseIndex][2]);

          }

        }, 280);

      };

      const startCase = () => {

        window.clearInterval(caseTimer);
        caseTimer = window.setInterval(() => {

          showCase(caseIndex + 1);

        }, 2200);

      };

      const stopCase = () => {

        window.clearInterval(caseTimer);
        window.clearTimeout(caseSwap);

      };

      pauseCaseReel = stopCase;

      document.getElementById("caseNext").addEventListener("click", () => {

        showCase(caseIndex + 1);
        startCase();

      });

      document.getElementById("casePrev").addEventListener("click", () => {

        showCase(caseIndex - 1);
        startCase();

      });

      caseDots.forEach((dot, dotIndex) => {

        dot.addEventListener("click", () => {

          showCase(dotIndex);
          startCase();

        });

      });

      const caseLightboxVideo = document.getElementById("caseLbvideo");

      const openCasePhoto = () => {

        if (!caseLightbox || !caseLightboxImage) {

          return;

        }

        if (caseLightboxVideo) {

          caseLightboxVideo.pause();
          caseLightboxVideo.hidden = true;

        }

        caseLightboxImage.hidden = false;
        caseLightboxImage.src = casePhoto.src;
        caseLightboxImage.alt = casePhoto.alt;
        setCaseCaption(casePhotos[caseIndex][2]);
        caseLightbox.hidden = false;
        document.body.classList.add("no-scroll", "case-open");
        lightboxOwner = "case";
        onLightboxStep = (direction) => {

          showCase(caseIndex + direction);

        };
        stopCase();
        pauseSmartReel();
        pauseIaReel();
        pauseMochoReel();
        pauseFotosReel();

      };

      casePhoto.addEventListener("click", openCasePhoto);

      const caseZoom = document.getElementById("caseZoom");

      if (caseZoom) {

        caseZoom.addEventListener("click", openCasePhoto);

      }

      const closeCase = () => {

        if (!caseLightbox) {

          return;

        }

        if (lightboxOwner !== "case") {

          startCase();
          closeActiveMixed();
          releaseIa();
          releaseMocho();
        releaseFotos();
          return;

        }

        if (caseLightboxVideo) {

          caseLightboxVideo.pause();
          caseLightboxVideo.hidden = true;
          caseLightboxVideo.removeAttribute("src");

        }

        caseLightbox.hidden = true;
        document.body.classList.remove("no-scroll", "case-open");
        lightboxOwner = "";
        startCase();
        releaseIa();
        releaseMocho();
        releaseFotos();

      };

      document.getElementById("caseLbx").addEventListener("click", closeCase);

      caseLightbox.addEventListener("click", (event) => {

        if (event.target === caseLightbox) {

          closeCase();

        }

      });

      document.addEventListener("keydown", (event) => {

        if (!caseLightbox || caseLightbox.hidden) {

          return;

        }

        if (event.key === "Escape") {

          closeCase();

        }

        if (event.key === "ArrowRight") {

          onLightboxStep(1);

        }

        if (event.key === "ArrowLeft") {

          onLightboxStep(-1);

        }

      });

      const lightboxPrev = document.getElementById("caseLbPrev");
      const lightboxNext = document.getElementById("caseLbNext");

      if (lightboxPrev) {

        lightboxPrev.addEventListener("click", () => {

          onLightboxStep(-1);

        });

      }

      if (lightboxNext) {

        lightboxNext.addEventListener("click", () => {

          onLightboxStep(1);

        });

      }

      paintCaseDots();
      startCase();

    }

    const smartReel = document.getElementById("smartReel");
    const smartPhoto = document.getElementById("smartPhoto");
    const smartVideo = document.getElementById("smartVideo");

    if (smartReel && smartPhoto && smartVideo) {

      const smartItems = [
        {
          type: "image",
          src: "../assets/casos/smartfilms.jpg",
          alt: "Certificado de Smartfilms Barranquilla a nombre de Alejandra Lemus Camacho",
          caption: "Certificado de Smartfilms Barranquilla a nombre de Alejandra Lemus Camacho, de noviembre de 2025. Certifica la asistencia a las capacitaciones de guion y storytelling, realización audiovisual con celulares, narrativas y dirección, postproducción, estrategia de contenidos para redes y habilidades blandas: 12 horas de teoría y 16 de práctica, en modalidad híbrida. Lo firma Yesenia Valencia, CEO de Smartfilms."
        },
        {
          type: "video",
          src: "../assets/casos/video-01.mp4",
          caption: "Primer video de la pieza de Smartfilms Barranquilla. Acompaña el certificado de la capacitación."
        },
        {
          type: "video",
          src: "../assets/casos/video-02.mp4",
          caption: "Segundo video de la pieza de Smartfilms Barranquilla. Acompaña el certificado de la capacitación."
        }
      ];
      const smartDots = Array.from(smartReel.querySelectorAll(".case-dots button"));
      const smartLightbox = document.getElementById("caseLb");
      const smartLightboxImage = document.getElementById("caseLbimg");
      let smartIndex = 0;
      let smartTimer = 0;

      const stopSmart = () => {

        window.clearTimeout(smartTimer);

      };

      pauseSmartReel = stopSmart;

      releaseSmart = () => {

        if (smartItems[smartIndex].type === "image" && (!smartLightbox || smartLightbox.hidden)) {

          stopSmart();
          smartTimer = window.setTimeout(() => {

            showSmart(smartIndex + 1);

          }, 2200);

        }

      };

      const paintSmartDots = () => {

        smartDots.forEach((dot, dotIndex) => {

          if (dotIndex === smartIndex) {

            dot.setAttribute("aria-current", "true");

          } else {

            dot.removeAttribute("aria-current");

          }

        });

      };

      const showSmart = (next) => {

        smartIndex = (next + smartItems.length) % smartItems.length;
        paintSmartDots();
        stopSmart();
        smartVideo.pause();

        const item = smartItems[smartIndex];

        if (item.type === "image") {

          smartReel.classList.remove("is-video");
          smartVideo.hidden = true;
          smartPhoto.hidden = false;
          smartPhoto.src = item.src;
          smartPhoto.alt = item.alt;

          if (!smartLightbox || smartLightbox.hidden) {

            smartTimer = window.setTimeout(() => {

              showSmart(smartIndex + 1);

            }, 2200);

          }

        } else {

          smartReel.classList.add("is-video");
          smartPhoto.hidden = true;
          smartVideo.hidden = false;
          smartVideo.src = item.src;

          if (!smartLightbox || smartLightbox.hidden) {

            smartVideo.play().catch(() => {});

          }

        }

        if (lightboxOwner === "smart" && smartLightbox && !smartLightbox.hidden && smartLightboxImage && smartLightboxVideo) {

          if (item.type === "video") {

            smartLightboxImage.hidden = true;
            smartLightboxVideo.hidden = false;
            smartLightboxVideo.src = item.src;
            smartLightboxVideo.currentTime = 0;
            smartLightboxVideo.play().catch(() => {});

          } else {

            smartLightboxVideo.pause();
            smartLightboxVideo.hidden = true;
            smartLightboxImage.hidden = false;
            smartLightboxImage.src = item.src;
            smartLightboxImage.alt = item.alt;

          }

          setCaseCaption(item.caption);

        }

      };

      document.getElementById("smartNext").addEventListener("click", () => {

        showSmart(smartIndex + 1);

      });

      document.getElementById("smartPrev").addEventListener("click", () => {

        showSmart(smartIndex - 1);

      });

      smartDots.forEach((dot, dotIndex) => {

        dot.addEventListener("click", () => {

          showSmart(dotIndex);

        });

      });

      smartVideo.addEventListener("ended", () => {

        if (smartLightbox && !smartLightbox.hidden) {

          return;

        }

        showSmart(smartIndex + 1);

      });

      const smartLightboxVideo = document.getElementById("caseLbvideo");

      const closeSmartLightbox = () => {

        if (!smartLightbox) {

          return;

        }

        if (lightboxOwner === "smart") {

          if (smartLightboxVideo && !smartLightboxVideo.hidden) {

            const time = smartLightboxVideo.currentTime || 0;

            smartLightboxVideo.pause();
            smartLightboxVideo.hidden = true;
            smartLightboxVideo.removeAttribute("src");

            if (smartItems[smartIndex].type === "video") {

              smartVideo.currentTime = time;
              smartVideo.play().catch(() => {});

            }

          }

          if (smartLightboxImage) {

            smartLightboxImage.hidden = false;

          }

          smartLightbox.hidden = true;
          document.body.classList.remove("no-scroll", "case-open");
          lightboxOwner = "";

        }

        releaseSmart();
        releaseMocho();
        releaseFotos();

      };

      const openSmartLightbox = () => {

        if (!smartLightbox || !smartLightboxImage || !smartLightboxVideo) {

          return;

        }

        stopSmart();
        pauseCaseReel();
        pauseIaReel();
        pauseMochoReel();
        pauseFotosReel();
        smartVideo.pause();
        lightboxOwner = "smart";
        closeActiveMixed = closeSmartLightbox;
        onLightboxStep = (direction) => {

          showSmart(smartIndex + direction);

        };
        smartLightbox.hidden = false;
        document.body.classList.add("no-scroll", "case-open");

        const item = smartItems[smartIndex];

        if (item.type === "video") {

          smartLightboxImage.hidden = true;
          smartLightboxVideo.hidden = false;
          smartLightboxVideo.src = item.src;
          smartLightboxVideo.currentTime = smartVideo.currentTime || 0;
          smartLightboxVideo.play().catch(() => {});

        } else {

          smartLightboxVideo.pause();
          smartLightboxVideo.hidden = true;
          smartLightboxImage.hidden = false;
          smartLightboxImage.src = smartPhoto.src;
          smartLightboxImage.alt = smartPhoto.alt;

        }

        setCaseCaption(item.caption);

      };

      smartPhoto.addEventListener("click", openSmartLightbox);

      const smartZoom = document.getElementById("smartZoom");

      if (smartZoom) {

        smartZoom.addEventListener("click", openSmartLightbox);

      }

      const smartClose = document.getElementById("caseLbx");

      if (smartClose) {

        smartClose.addEventListener("click", closeSmartLightbox);

      }

      smartLightbox.addEventListener("click", (event) => {

        if (event.target === smartLightbox) {

          closeSmartLightbox();

        }

      });

      document.addEventListener("keydown", (event) => {

        if (!smartLightbox || smartLightbox.hidden) {

          return;

        }

        if (event.key === "Escape") {

          closeSmartLightbox();

        }

      });

      showSmart(0);

    }

    const iaReel = document.getElementById("iaReel");
    const iaPhoto = document.getElementById("iaPhoto");
    const iaVideo = document.getElementById("iaVideo");

    if (iaReel && iaPhoto && iaVideo) {

      const iaItems = [
        {
          type: "image",
          src: "../assets/casos/ia-poster.jpg",
          alt: "Alejandra Lemus Camacho junto al póster sobre inteligencia artificial en estudiantes de ingeniería",
          caption: "Alejandra Lemus Camacho junto al póster «Optimización del uso de la Inteligencia Artificial en estudiantes de Ingeniería», de la Universidad de la Costa. También aparece el nombre de Yeraldo Castro Martínez. El póster muestra el propósito, la ruta metodológica, la prueba piloto y las referencias."
        },
        {
          type: "video",
          src: "../assets/casos/ia-video.mp4",
          caption: "Video que acompaña el póster sobre el uso de la inteligencia artificial en estudiantes de Ingeniería."
        }
      ];
      const iaDots = Array.from(iaReel.querySelectorAll(".case-dots button"));
      const iaLightbox = document.getElementById("caseLb");
      const iaLightboxImage = document.getElementById("caseLbimg");
      const iaLightboxVideo = document.getElementById("caseLbvideo");
      let iaIndex = 0;
      let iaTimer = 0;

      const stopIa = () => {

        window.clearTimeout(iaTimer);

      };

      pauseIaReel = stopIa;

      releaseIa = () => {

        if (iaItems[iaIndex].type === "image" && (!iaLightbox || iaLightbox.hidden)) {

          stopIa();
          iaTimer = window.setTimeout(() => {

            showIa(iaIndex + 1);

          }, 2200);

        }

      };

      const paintIaDots = () => {

        iaDots.forEach((dot, dotIndex) => {

          if (dotIndex === iaIndex) {

            dot.setAttribute("aria-current", "true");

          } else {

            dot.removeAttribute("aria-current");

          }

        });

      };

      const showIa = (next) => {

        iaIndex = (next + iaItems.length) % iaItems.length;
        paintIaDots();
        stopIa();
        iaVideo.pause();

        const item = iaItems[iaIndex];

        if (item.type === "image") {

          iaReel.classList.remove("is-video");
          iaVideo.hidden = true;
          iaPhoto.hidden = false;
          iaPhoto.src = item.src;
          iaPhoto.alt = item.alt;

          if (!iaLightbox || iaLightbox.hidden) {

            iaTimer = window.setTimeout(() => {

              showIa(iaIndex + 1);

            }, 2200);

          }

        } else {

          iaReel.classList.add("is-video");
          iaPhoto.hidden = true;
          iaVideo.hidden = false;
          iaVideo.src = item.src;

          if (!iaLightbox || iaLightbox.hidden) {

            iaVideo.play().catch(() => {});

          }

        }

        if (lightboxOwner === "ia" && iaLightbox && !iaLightbox.hidden && iaLightboxImage && iaLightboxVideo) {

          if (item.type === "video") {

            iaLightboxImage.hidden = true;
            iaLightboxVideo.hidden = false;
            iaLightboxVideo.src = item.src;
            iaLightboxVideo.currentTime = 0;
            iaLightboxVideo.play().catch(() => {});

          } else {

            iaLightboxVideo.pause();
            iaLightboxVideo.hidden = true;
            iaLightboxImage.hidden = false;
            iaLightboxImage.src = item.src;
            iaLightboxImage.alt = item.alt;

          }

          setCaseCaption(item.caption);

        }

      };

      document.getElementById("iaNext").addEventListener("click", () => {

        showIa(iaIndex + 1);

      });

      document.getElementById("iaPrev").addEventListener("click", () => {

        showIa(iaIndex - 1);

      });

      iaDots.forEach((dot, dotIndex) => {

        dot.addEventListener("click", () => {

          showIa(dotIndex);

        });

      });

      iaVideo.addEventListener("ended", () => {

        if (iaLightbox && !iaLightbox.hidden) {

          return;

        }

        showIa(iaIndex + 1);

      });

      const closeIaLightbox = () => {

        if (!iaLightbox || lightboxOwner !== "ia") {

          releaseIa();
          return;

        }

        if (iaLightboxVideo && !iaLightboxVideo.hidden) {

          const time = iaLightboxVideo.currentTime || 0;

          iaLightboxVideo.pause();
          iaLightboxVideo.hidden = true;
          iaLightboxVideo.removeAttribute("src");

          if (iaItems[iaIndex].type === "video") {

            iaVideo.currentTime = time;
            iaVideo.play().catch(() => {});

          }

        }

        if (iaLightboxImage) {

          iaLightboxImage.hidden = false;

        }

        iaLightbox.hidden = true;
        document.body.classList.remove("no-scroll", "case-open");
        lightboxOwner = "";
        releaseIa();
        releaseMocho();
        releaseFotos();

      };

      const openIaLightbox = () => {

        if (!iaLightbox || !iaLightboxImage || !iaLightboxVideo) {

          return;

        }

        stopIa();
        pauseCaseReel();
        pauseSmartReel();
        pauseMochoReel();
        pauseFotosReel();
        iaVideo.pause();
        lightboxOwner = "ia";
        closeActiveMixed = closeIaLightbox;
        onLightboxStep = (direction) => {

          showIa(iaIndex + direction);

        };
        iaLightbox.hidden = false;
        document.body.classList.add("no-scroll", "case-open");

        const item = iaItems[iaIndex];

        if (item.type === "video") {

          iaLightboxImage.hidden = true;
          iaLightboxVideo.hidden = false;
          iaLightboxVideo.src = item.src;
          iaLightboxVideo.currentTime = iaVideo.currentTime || 0;
          iaLightboxVideo.play().catch(() => {});

        } else {

          iaLightboxVideo.pause();
          iaLightboxVideo.hidden = true;
          iaLightboxImage.hidden = false;
          iaLightboxImage.src = iaPhoto.src;
          iaLightboxImage.alt = iaPhoto.alt;

        }

        setCaseCaption(item.caption);

      };

      iaPhoto.addEventListener("click", openIaLightbox);

      const iaZoom = document.getElementById("iaZoom");

      if (iaZoom) {

        iaZoom.addEventListener("click", openIaLightbox);

      }

      showIa(0);

    }

    const mochoReel = document.getElementById("mochoReel");
    const mochoPhoto = document.getElementById("mochoPhoto");

    if (mochoReel && mochoPhoto) {

      const mochoPhotos = [
        ["../assets/casos/mocho-tripode.jpg", "Celular en trípode grabando el manglar", "Celular montado en un trípode, grabando desde el muelle de madera hacia el manglar. En la pantalla del teléfono se ve el encuadre."],
        ["../assets/casos/mocho-playa.jpg", "Claqueta frente al marco de Mocho, en Barranquilla", "Claqueta frente al marco amarillo de Mocho, de la Alcaldía de Barranquilla, en la playa."]
      ];
      const mochoDots = Array.from(mochoReel.querySelectorAll(".case-dots button"));
      const mochoLightbox = document.getElementById("caseLb");
      const mochoLightboxImage = document.getElementById("caseLbimg");
      const mochoLightboxVideo = document.getElementById("caseLbvideo");
      let mochoIndex = 0;
      let mochoTimer = 0;
      let mochoSwap = 0;

      const paintMochoDots = () => {

        mochoDots.forEach((dot, dotIndex) => {

          if (dotIndex === mochoIndex) {

            dot.setAttribute("aria-current", "true");

          } else {

            dot.removeAttribute("aria-current");

          }

        });

      };

      const stopMocho = () => {

        window.clearInterval(mochoTimer);
        window.clearTimeout(mochoSwap);

      };

      pauseMochoReel = stopMocho;

      const showMocho = (next) => {

        mochoIndex = (next + mochoPhotos.length) % mochoPhotos.length;
        paintMochoDots();
        stopMocho();
        mochoPhoto.classList.add("is-out");

        mochoSwap = window.setTimeout(() => {

          mochoPhoto.src = mochoPhotos[mochoIndex][0];
          mochoPhoto.alt = mochoPhotos[mochoIndex][1];
          mochoPhoto.classList.remove("is-out");

          if (lightboxOwner === "mocho" && mochoLightbox && !mochoLightbox.hidden && mochoLightboxImage) {

            if (mochoLightboxVideo) {

              mochoLightboxVideo.pause();
              mochoLightboxVideo.hidden = true;

            }

            mochoLightboxImage.hidden = false;
            mochoLightboxImage.src = mochoPhoto.src;
            mochoLightboxImage.alt = mochoPhoto.alt;
            setCaseCaption(mochoPhotos[mochoIndex][2]);

          }

          if (!mochoLightbox || mochoLightbox.hidden) {

            mochoTimer = window.setInterval(() => {

              showMocho(mochoIndex + 1);

            }, 2200);

          }

        }, 280);

      };

      releaseMocho = () => {

        if (!mochoLightbox || mochoLightbox.hidden) {

          stopMocho();
          mochoTimer = window.setInterval(() => {

            showMocho(mochoIndex + 1);

          }, 2200);

        }

      };

      document.getElementById("mochoNext").addEventListener("click", () => {

        showMocho(mochoIndex + 1);

      });

      document.getElementById("mochoPrev").addEventListener("click", () => {

        showMocho(mochoIndex - 1);

      });

      mochoDots.forEach((dot, dotIndex) => {

        dot.addEventListener("click", () => {

          showMocho(dotIndex);

        });

      });

      const closeMochoLightbox = () => {

        if (!mochoLightbox || lightboxOwner !== "mocho") {

          releaseMocho();
        releaseFotos();
          return;

        }

        if (mochoLightboxVideo) {

          mochoLightboxVideo.pause();
          mochoLightboxVideo.hidden = true;

        }

        if (mochoLightboxImage) {

          mochoLightboxImage.hidden = false;

        }

        mochoLightbox.hidden = true;
        document.body.classList.remove("no-scroll", "case-open");
        lightboxOwner = "";
        releaseMocho();
        releaseFotos();

      };

      const openMochoLightbox = () => {

        if (!mochoLightbox || !mochoLightboxImage) {

          return;

        }

        if (mochoLightboxVideo) {

          mochoLightboxVideo.pause();
          mochoLightboxVideo.hidden = true;

        }

        stopMocho();
        pauseCaseReel();
        pauseSmartReel();
        pauseIaReel();
        pauseFotosReel();
        lightboxOwner = "mocho";
        closeActiveMixed = closeMochoLightbox;
        onLightboxStep = (direction) => {

          showMocho(mochoIndex + direction);

        };
        mochoLightboxImage.hidden = false;
        mochoLightboxImage.src = mochoPhoto.src;
        mochoLightboxImage.alt = mochoPhoto.alt;
        setCaseCaption(mochoPhotos[mochoIndex][2]);
        mochoLightbox.hidden = false;
        document.body.classList.add("no-scroll", "case-open");

      };

      mochoPhoto.addEventListener("click", openMochoLightbox);

      const mochoZoom = document.getElementById("mochoZoom");

      if (mochoZoom) {

        mochoZoom.addEventListener("click", openMochoLightbox);

      }

      paintMochoDots();
      releaseMocho();
        releaseFotos();

    }

    const fotoGrid = document.getElementById("fotoGrid");

    if (fotoGrid) {

      const fotoItems = Array.from(fotoGrid.querySelectorAll("[data-src]"));
      const fotoLightbox = document.getElementById("caseLb");
      const fotoLightboxImage = document.getElementById("caseLbimg");
      let fotoIndex = 0;

      const showFoto = (next) => {

        fotoIndex = (next + fotoItems.length) % fotoItems.length;
        const item = fotoItems[fotoIndex];
        fotoLightboxImage.src = item.getAttribute("data-src");
        fotoLightboxImage.alt = item.getAttribute("data-alt") || "";
        fotoItems.forEach((foto) => foto.removeAttribute("data-current"));
        item.setAttribute("data-current", "true");
        setCaseCaption(item.getAttribute("data-caption") || "");

      };

      const closeFoto = () => {

        if (!fotoLightbox || lightboxOwner !== "fotos") {

          return;

        }

        fotoLightbox.hidden = true;
        document.body.classList.remove("no-scroll", "case-open");
        lightboxOwner = "";

      };

      const openFoto = (index) => {

        if (!fotoLightbox || !fotoLightboxImage) {

          return;

        }

        fotoLightbox.hidden = false;
        document.body.classList.add("no-scroll", "case-open");
        lightboxOwner = "fotos";
        onLightboxStep = (direction) => {

          showFoto(fotoIndex + direction);

        };
        closeActiveMixed = closeFoto;
        showFoto(index);

      };

      fotoItems.forEach((item, index) => {

        item.addEventListener("click", () => {

          openFoto(index);

        });

      });

      const fotoClose = document.getElementById("caseLbx");
      const fotoPrev = document.getElementById("caseLbPrev");
      const fotoNext = document.getElementById("caseLbNext");

      if (fotoClose) {

        fotoClose.addEventListener("click", closeFoto);

      }

      if (fotoPrev) {

        fotoPrev.addEventListener("click", () => {

          onLightboxStep(-1);

        });

      }

      if (fotoNext) {

        fotoNext.addEventListener("click", () => {

          onLightboxStep(1);

        });

      }

      if (fotoLightbox) {

        fotoLightbox.addEventListener("click", (event) => {

          if (event.target === fotoLightbox) {

            closeFoto();

          }

        });

      }

      document.addEventListener("keydown", (event) => {

        if (!fotoLightbox || fotoLightbox.hidden || lightboxOwner !== "fotos") {

          return;

        }

        if (event.target && event.target.isContentEditable) {

          if (event.key === "Escape") {

            closeFoto();

          }

          return;

        }

        if (event.key === "Escape") {

          closeFoto();

        }

        if (event.key === "ArrowRight") {

          onLightboxStep(1);

        }

        if (event.key === "ArrowLeft") {

          onLightboxStep(-1);

        }

      });

    }

    document.querySelectorAll("[data-cv]").forEach(link => {

      fetch(link.getAttribute("href"), { method: "HEAD" })
        .then(response => {

          if (!response.ok) {

            throw new Error("missing");

          }

          link.classList.remove("is-disabled");
          link.removeAttribute("aria-disabled");

          const readyNote = link.parentElement && link.parentElement.querySelector(".cv-note");

          if (readyNote) {

            readyNote.hidden = true;

          }

        })
        .catch(() => {

          link.removeAttribute("href");
          link.setAttribute("aria-disabled", "true");
          link.classList.add("is-disabled");

          const note = (link.parentElement && link.parentElement.querySelector(".cv-note"))
            || (link.parentElement && link.parentElement.nextElementSibling);

          if (note && note.classList.contains("cv-note")) {

            note.hidden = false;

          }

        });

    });
