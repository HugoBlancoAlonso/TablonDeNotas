// Puente con C#: mensajes JSON en los dos sentidos (ver Mensajes.cs).
// Formato de todos los mensajes: { tipo: "nota.guardar", datos: { ... } }

// ---------- JavaScript -> C# ----------
export function enviar(tipo, datos = {}) {
  const mensaje = { tipo, datos };
  console.log("→ C#", mensaje); // útil para depurar con F12
  // Dentro de la app existe window.chrome.webview; en un navegador normal no, y solo se ve el log
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage(mensaje);
  }
}

// ---------- C# -> JavaScript ----------
const manejadores = new Map();

// Registra qué hacer cuando llega un mensaje de un tipo (por ejemplo "tablon.cargar")
export function alRecibir(tipo, funcion) {
  manejadores.set(tipo, funcion);
}

// C# envía el mensaje con PostWebMessageAsJson, así que evento.data ya es un objeto { tipo, datos }
if (window.chrome && window.chrome.webview) {
  window.chrome.webview.addEventListener("message", (evento) => {
    const { tipo, datos } = evento.data;
    console.log("← C#", evento.data);
    const manejador = manejadores.get(tipo);
    if (manejador) manejador(datos);
    else console.warn("Mensaje de C# sin manejador:", tipo);
  });
}