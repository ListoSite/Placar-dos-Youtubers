// Gravar um espetáculo do Palco em vídeo, no próprio browser.
//
// O browser partilha este separador (getDisplayMedia). Cada imagem é recortada à tela do Palco
// e desenhada num canvas com o tamanho final (1920×1080 ou 1080×1920). O som vem diretamente do
// motor de áudio do site. O MediaRecorder junta tudo num ficheiro MP4 (Chrome recente, Safari)
// ou WebM (outros).

import { som } from "../audio.js";
import { toast } from "../ui.js";

const TIPOS = ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

export function podeGravar() {
  return Boolean(navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && !matchMedia("(pointer: coarse)").matches);
}

export async function prepararGravacao(formato) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 60, displaySurface: "browser", width: { ideal: 3840 }, height: { ideal: 2160 } },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
      surfaceSwitching: "exclude",
    });
  } catch {
    toast("A gravação foi cancelada.");
    return null;
  }
  const faixa = stream.getVideoTracks()[0];
  if (faixa.getSettings().displaySurface && faixa.getSettings().displaySurface !== "browser") {
    toast("Para o vídeo ficar certo, escolhe partilhar este separador (não o ecrã inteiro).", { tempo: 6000 });
  }
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play().catch(() => {});

  const [W, H] = formato === "9x16" ? [1080, 1920] : [1920, 1080];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d", { alpha: false });
  g.imageSmoothingQuality = "high";
  const fluxo = canvas.captureStream(60);
  const audio = som.ligado ? som.fluxoGravacao() : null;
  audio?.getAudioTracks().forEach((t) => fluxo.addTrack(t));
  const mime = TIPOS.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  const gravador = new MediaRecorder(fluxo, { mimeType: mime || undefined, videoBitsPerSecond: 14_000_000, audioBitsPerSecond: 192_000 });
  const partes = [];
  gravador.ondataavailable = (e) => e.data?.size && partes.push(e.data);

  let palco = null;
  let ativo = true;
  const desenhar = () => {
    if (!ativo) return;
    if (palco && !palco.terminado && video.videoWidth) {
      const r = palco.tela.getBoundingClientRect();
      const kx = video.videoWidth / innerWidth;
      const ky = video.videoHeight / innerHeight;
      g.drawImage(video, r.left * kx, r.top * ky, r.width * kx, r.height * ky, 0, 0, W, H);
    }
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(desenhar);
    else requestAnimationFrame(desenhar);
  };

  return {
    comecar(p) {
      palco = p;
      p.raiz.classList.add("a-gravar", "sem-controlos");
      p.aoPausar = (pausado) => {
        if (gravador.state === "recording" && pausado) gravador.pause();
        else if (gravador.state === "paused" && !pausado) gravador.resume();
      };
      faixa.addEventListener("ended", () => p.sair());
      desenhar();
      // Pequena espera para a primeira imagem já estar no canvas
      setTimeout(() => gravador.state === "inactive" && gravador.start(1000), 150);
    },
    async parar() {
      ativo = false;
      if (gravador.state !== "inactive") {
        const fim = new Promise((r) => (gravador.onstop = r));
        gravador.stop();
        await fim;
      }
      stream.getTracks().forEach((t) => t.stop());
      if (!partes.length) return null;
      const tipo = (mime || "video/webm").split(";")[0];
      const blob = new Blob(partes, { type: tipo });
      return { blob, url: URL.createObjectURL(blob), ext: tipo.includes("mp4") ? "mp4" : "webm" };
    },
  };
}
