(function () {
  "use strict";

  const bars = new Map(); // video -> { container, seek, time, vol, play, dragging, visible }
  const observed = new WeakSet();
  let layer = null;

  let prefVolPct = 10; // volume lembrado entre videos (0-100)

  let fsVideo = null;
  let classic = null; // barra classica da tela cheia

  function getLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.id = "igc-layer";
    document.documentElement.appendChild(layer);
    return layer;
  }

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  // ---------- volume (0-100, sem boost). NAO mexe no mudo. ----------
  function setVol(v, pct) {
    const ratio = Math.min(Math.max(pct, 0), 100) / 100;
    if (Math.abs(v.volume - ratio) > 0.005) v.volume = ratio;
  }
  function applyPrefToAll() {
    bars.forEach(function (o, v) {
      o.vol.value = prefVolPct;
      setVol(v, prefVolPct);
    });
    if (classic) classic.vol.value = prefVolPct;
  }

  // ---------- posicao do video IGNORANDO a rotacao (usa o pai, que nao gira) ----------
  function slotRect(v) {
    // caixa real do video, sem o efeito da rotacao: o centro se mantem em transform central,
    // e offsetWidth/Height dao o tamanho de layout (nao afetado por scale/rotate).
    const r = v.getBoundingClientRect();
    const w = v.offsetWidth || r.width;
    const h = v.offsetHeight || r.height;
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    return {
      left: cx - w / 2,
      top: cy - h / 2,
      right: cx + w / 2,
      bottom: cy + h / 2,
      width: w,
      height: h,
    };
  }

  // ---------- rotacao ----------
  function clearVideoStyles(v) {
    v.style.position = "";
    v.style.left = "";
    v.style.top = "";
    v.style.width = "";
    v.style.height = "";
    v.style.transform = "";
    if (v.__igcOF !== undefined) v.style.objectFit = v.__igcOF;
  }

  function applyRot(v) {
    const rot = ((v.__igcRot || 0) % 360 + 360) % 360;
    const fe = document.fullscreenElement;
    const inFS = !!fe && fe.contains(v);

    if (v.__igcOF === undefined) v.__igcOF = v.style.objectFit;

    if (inFS) {
      // tela cheia: dimensiona pelo tamanho do monitor pra ocupar o maximo possivel
      const SW = window.innerWidth;
      const SH = window.innerHeight;
      const sideways = rot === 90 || rot === 270;
      v.style.position = "fixed";
      v.style.left = "50%";
      v.style.top = "50%";
      v.style.objectFit = "contain";
      v.style.transformOrigin = "center center";
      // girado: a caixa (antes de girar) fica em pe, ai ao girar preenche a tela
      v.style.width = (sideways ? SH : SW) + "px";
      v.style.height = (sideways ? SW : SH) + "px";
      v.style.transform = "translate(-50%, -50%) rotate(" + rot + "deg)";
      return;
    }

    // fora da tela cheia
    clearVideoStyles(v);
    if (rot === 0) return;
    v.style.objectFit = "contain";
    const rect = v.getBoundingClientRect();
    let scale = 1;
    if (rot % 180 !== 0 && rect.width > 0) scale = rect.height / rect.width;
    v.style.transformOrigin = "center center";
    v.style.transform = "rotate(" + rot + "deg) scale(" + scale + ")";
  }
  function rotate(v, delta) {
    v.__igcRot = ((v.__igcRot || 0) + delta + 360) % 360;
    applyRot(v);
  }

  // ---------- tela cheia com player classico proprio ----------
  function toggleFS(v) {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    const host = v.parentElement || v;
    fsVideo = v;
    if (host.requestFullscreen) host.requestFullscreen().catch(function () {});
  }

  function buildClassic(host, v) {
    if (classic) return;
    const bar = document.createElement("div");
    bar.className = "igc-classic";
    bar.innerHTML =
      '<button class="igc-c-play" title="Play/Pause">&#9654;</button>' +
      '<span class="igc-c-time">0:00 / 0:00</span>' +
      '<input class="igc-c-seek" type="range" min="0" max="100" step="any" value="0">' +
      '<button class="igc-c-rl" title="Girar esquerda">&#8634;</button>' +
      '<button class="igc-c-rr" title="Girar direita">&#8635;</button>' +
      '<input class="igc-c-vol" type="range" min="0" max="100" step="1" value="10" title="Volume">' +
      '<button class="igc-c-fs" title="Sair da tela cheia">&#9974;</button>';
    host.appendChild(bar);

    const seek = bar.querySelector(".igc-c-seek");
    const time = bar.querySelector(".igc-c-time");
    const vol = bar.querySelector(".igc-c-vol");
    const play = bar.querySelector(".igc-c-play");
    classic = { bar, host, v, seek, time, vol, play, dragging: false };

    vol.value = prefVolPct;

    ["click", "mousedown", "dblclick", "pointerdown", "wheel"].forEach(function (ev) {
      bar.addEventListener(ev, function (e) {
        e.stopPropagation();
      });
    });

    seek.addEventListener("pointerdown", function () {
      classic.dragging = true;
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      seek.addEventListener(ev, function () {
        classic.dragging = false;
      });
    });
    seek.addEventListener("input", function () {
      if (isFinite(v.duration)) {
        v.currentTime = parseFloat(seek.value);
        time.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
      }
    });

    vol.addEventListener("input", function () {
      prefVolPct = parseInt(vol.value, 10);
      applyPrefToAll();
    });

    play.addEventListener("click", function () {
      if (v.paused) v.play();
      else v.pause();
    });
    function syncPlay() {
      play.innerHTML = v.paused ? "&#9654;" : "&#10074;&#10074;";
    }
    v.addEventListener("play", syncPlay);
    v.addEventListener("pause", syncPlay);
    syncPlay();

    bar.querySelector(".igc-c-rl").addEventListener("click", function () {
      rotate(v, -90);
    });
    bar.querySelector(".igc-c-rr").addEventListener("click", function () {
      rotate(v, 90);
    });
    bar.querySelector(".igc-c-fs").addEventListener("click", function () {
      document.exitFullscreen();
    });
  }

  function removeClassic() {
    if (!classic) return;
    if (classic.bar.parentElement)
      classic.bar.parentElement.removeChild(classic.bar);
    classic = null;
  }

  // ---------- saber se o video esta realmente visivel (nao escondido em carrossel) ----------
  function isClip(val) {
    return val === "hidden" || val === "auto" || val === "scroll" || val === "clip";
  }
  function isBehindModal(v) {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    if (!dialogs.length) return false;
    for (let i = 0; i < dialogs.length; i++) {
      const d = dialogs[i];
      if (d.contains(v)) return false; // o video esta dentro do modal -> em primeiro plano
      const r = d.getBoundingClientRect();
      // modal grande (comentarios) cobrindo boa parte da tela e o video nao esta nele -> atras
      if (r.width * r.height > window.innerWidth * window.innerHeight * 0.3) return true;
    }
    return false;
  }

  function computeVisible(v) {
    if (isBehindModal(v)) return false;
    const r = slotRect(v);
    if (r.width < 160 || r.height < 120) return false;
    let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
    let p = v.parentElement, guard = 0;
    while (p && p !== document.documentElement && guard < 40) {
      const cs = getComputedStyle(p);
      if (isClip(cs.overflowX) || isClip(cs.overflowY)) {
        const pr = p.getBoundingClientRect();
        if (isClip(cs.overflowX)) {
          if (pr.left > left) left = pr.left;
          if (pr.right < right) right = pr.right;
        }
        if (isClip(cs.overflowY)) {
          if (pr.top > top) top = pr.top;
          if (pr.bottom < bottom) bottom = pr.bottom;
        }
      }
      p = p.parentElement;
      guard++;
    }
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (right > window.innerWidth) right = window.innerWidth;
    if (bottom > window.innerHeight) bottom = window.innerHeight;
    return right - left >= r.width * 0.6 && bottom - top >= r.height * 0.6;
  }
  function checkVisibility() {
    bars.forEach(function (o, v) {
      o.visible = v.isConnected ? computeVisible(v) : false;
    });
  }
  setInterval(checkVisibility, 150);

  // ---------- barra sobre o video (fora da tela cheia) ----------
  function ensureBar(v) {
    if (bars.has(v)) return;
    const container = document.createElement("div");
    container.className = "igc-container";
    container.innerHTML =
      '<div class="igc-strip">' +
      '<input class="igc-seek" type="range" min="0" max="100" step="any" value="0">' +
      '<div class="igc-controls">' +
      '<button class="igc-play" title="Play/Pause">&#9654;</button>' +
      '<span class="igc-time">0:00 / 0:00</span>' +
      '<span class="igc-spacer"></span>' +
      '<input class="igc-vol" type="range" min="0" max="100" step="1" value="10" title="Volume (lembrado entre videos)">' +
      '<button class="igc-rl" title="Girar esquerda">&#8634;</button>' +
      '<button class="igc-rr" title="Girar direita">&#8635;</button>' +
      '<button class="igc-fs" title="Tela cheia">&#9974;</button>' +
      "</div>" +
      "</div>";

    getLayer().appendChild(container);

    const strip = container.querySelector(".igc-strip");
    const seek = container.querySelector(".igc-seek");
    const time = container.querySelector(".igc-time");
    const vol = container.querySelector(".igc-vol");
    const play = container.querySelector(".igc-play");

    const obj = { container, seek, time, vol, play, dragging: false, visible: false };
    bars.set(v, obj);
    obj.visible = computeVisible(v);

    vol.value = prefVolPct;
    setVol(v, prefVolPct);

    function keepVolume() {
      setVol(v, prefVolPct);
    }
    v.addEventListener("play", keepVolume);
    v.addEventListener("volumechange", keepVolume);

    ["click", "mousedown", "dblclick", "pointerdown", "wheel"].forEach(function (ev) {
      strip.addEventListener(ev, function (e) {
        e.stopPropagation();
      });
    });

    seek.addEventListener("pointerdown", function () {
      obj.dragging = true;
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      seek.addEventListener(ev, function () {
        obj.dragging = false;
      });
    });
    seek.addEventListener("input", function () {
      if (isFinite(v.duration)) {
        v.currentTime = parseFloat(seek.value);
        time.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
      }
    });

    vol.addEventListener("input", function () {
      prefVolPct = parseInt(vol.value, 10);
      applyPrefToAll();
    });

    play.addEventListener("click", function () {
      if (v.paused) v.play();
      else v.pause();
    });
    function syncPlay() {
      play.innerHTML = v.paused ? "&#9654;" : "&#10074;&#10074;";
    }
    v.addEventListener("play", syncPlay);
    v.addEventListener("pause", syncPlay);
    syncPlay();

    container.querySelector(".igc-rl").addEventListener("click", function () {
      rotate(v, -90);
    });
    container.querySelector(".igc-rr").addEventListener("click", function () {
      rotate(v, 90);
    });
    container.querySelector(".igc-fs").addEventListener("click", function () {
      toggleFS(v);
    });
  }

  function removeBar(v) {
    const obj = bars.get(v);
    if (!obj) return;
    if (obj.container.parentElement)
      obj.container.parentElement.removeChild(obj.container);
    bars.delete(v);
  }

  // ---------- loop principal ----------
  function frame() {
    const fs = !!document.fullscreenElement;

    bars.forEach(function (o, v) {
      if (!v.isConnected) {
        removeBar(v);
        return;
      }
      const r = slotRect(v); // posicao SEM a rotacao, entao a barra nao foge ao girar
      if (fs || r.width === 0 || o.visible === false) {
        o.container.style.display = "none";
        return;
      }
      o.container.style.display = "";
      o.container.style.left = r.left + "px";
      o.container.style.top = r.top + "px";
      o.container.style.width = r.width + "px";
      o.container.style.height = r.height + "px";
      if (!o.dragging && isFinite(v.duration) && v.duration > 0) {
        o.seek.max = v.duration;
        o.seek.value = v.currentTime;
        o.time.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
      }
    });

    if (fs && classic) {
      const host = document.fullscreenElement;
      if (host && !host.contains(classic.bar)) host.appendChild(classic.bar);
      const v = classic.v;
      if (!classic.dragging && isFinite(v.duration) && v.duration > 0) {
        classic.seek.max = v.duration;
        classic.seek.value = v.currentTime;
        classic.time.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- descobrir videos ----------
  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) ensureBar(e.target);
        else removeBar(e.target);
      });
    },
    { threshold: [0, 0.15] }
  );

  function scan() {
    const vids = document.querySelectorAll("video");
    for (let i = 0; i < vids.length; i++) {
      const v = vids[i];
      if (!observed.has(v)) {
        observed.add(v);
        io.observe(v);
      }
    }
  }
  scan();
  setInterval(scan, 1000);

  function reapplyRotations() {
    bars.forEach(function (_o, v) {
      if (v.__igcRot) applyRot(v);
    });
    if (classic && classic.v.__igcRot) applyRot(classic.v);
  }
  window.addEventListener("resize", reapplyRotations);

  document.addEventListener("fullscreenchange", function () {
    const fe = document.fullscreenElement;
    if (fe && fsVideo) {
      fe.classList.add("igc-fs-host");
      buildClassic(fe, fsVideo);
      setTimeout(function () {
        applyRot(fsVideo);
      }, 80);
    } else {
      const v = fsVideo;
      removeClassic();
      const hosts = document.querySelectorAll(".igc-fs-host");
      for (let i = 0; i < hosts.length; i++) hosts[i].classList.remove("igc-fs-host");
      if (v) applyRot(v); // limpa o dimensionamento de tela cheia e reaplica a rotacao normal
      setTimeout(reapplyRotations, 100);
      fsVideo = null;
    }
  });
})();
