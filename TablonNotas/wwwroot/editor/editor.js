// Editor de notas: ventana que se abre al hacer clic en una nota.
// El marcado está en editor.html y los estilos en editor.css.
import { tablon, COLORES, datosNota, datosCompletos, actualizarContador, normalizarNota, estado } from "../tablon.js";
import { enviar } from "../puente.js";

// El marcado de la ventana se carga una vez y se añade a la página
const respuesta = await fetch(new URL("editor.html", import.meta.url));
if (!respuesta.ok) throw new Error("No se pudo cargar editor/editor.html");
document.body.insertAdjacentHTML("beforeend", await respuesta.text());

// ---------- Editor de notas: se abre al hacer un solo clic en una nota ----------
let notaEnEdicion = null;
let colorElegido = COLORES[0];
let rangoGuardado = null;
let temporizadorEliminar = null;

const editor = document.getElementById("editor");
const campoTitulo = document.getElementById("editor-titulo");
const metaEditor = document.getElementById("editor-meta");
const cuerpoEditor = document.getElementById("editor-cuerpo");
const barraFormato = document.getElementById("editor-barra");
const botonEliminar = document.getElementById("editor-eliminar");
const TEXTO_ELIMINAR = botonEliminar.textContent;


function horaActual() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

// Avisan a C# para que guarde los cambios
function notaEditada(nota) {
  enviar("nota.guardar", datosCompletos(nota));
}
function notaEliminada(datos) {
  enviar("nota.eliminar", { id: datos.id });
}

// --- Abrir con un clic (si no venimos de arrastrar o redimensionar) ---
tablon.addEventListener("pointerdown", () => { estado.ignorarClic = false; }, true);
// --- Casillas de las tareas (funcionan en la nota del tablón y dentro del editor) ---
const ZONA_CASILLA = 26; // píxeles, desde el borde izquierdo de la tarea, donde está la casilla

function enCasilla(tarea, evento) {
  return evento.clientX - tarea.getBoundingClientRect().left <= ZONA_CASILLA;
}

function alternarTarea(tarea) {
  if (tarea.dataset.hecho === "true") tarea.removeAttribute("data-hecho");
  else tarea.dataset.hecho = "true";
}

tablon.addEventListener("click", (evento) => {
  const nota = evento.target.closest(".nota");
  if (!nota) return;
  if (estado.ignorarClic) { estado.ignorarClic = false; return; }

  // Clic en la casilla de una tarea: se marca o desmarca sin abrir la nota.
  // Se usa elementFromPoint porque, tras un clic con captura de puntero, evento.target es la nota entera.
  const bajoRaton = document.elementFromPoint(evento.clientX, evento.clientY);
  const tarea = bajoRaton && bajoRaton.closest(".tareas > li");
  if (tarea && nota.contains(tarea) && enCasilla(tarea, evento)) {
    alternarTarea(tarea);
    notaEditada(nota); // en la fase 4 se enviará a C# para guardar el cambio
    return;
  }
  abrirNota(nota);
});

// El cursor se convierte en una mano al pasar por una casilla (se ejecuta después del cursor de bordes de tablon.js)
tablon.addEventListener("pointermove", (evento) => {
  if (evento.buttons) return; // no durante un arrastre
  const tarea = evento.target.closest(".tareas > li");
  if (!tarea || !enCasilla(tarea, evento)) return;
  const nota = tarea.closest(".nota");
  if (nota) nota.style.cursor = "pointer";
});

function ponerCursorAlFinal() {
  const rango = document.createRange();
  rango.selectNodeContents(cuerpoEditor);
  rango.collapse(false);
  const seleccion = window.getSelection();
  seleccion.removeAllRanges();
  seleccion.addRange(rango);
}

// El color elegido tiñe toda la ventana: se le pone la misma clase de color que usa la nota
function marcarColor() {
  COLORES.forEach((c) => editor.classList.toggle(c, c === colorElegido));
  editor.querySelectorAll(".muestra").forEach((m) =>
    m.setAttribute("aria-pressed", String(m.dataset.color === colorElegido))
  );
}

function abrirNota(nota) {
  normalizarNota(nota);
  const cuerpo = nota.querySelector(".nota-cuerpo");
  const fecha = nota.querySelector(".nota-fecha");
  notaEnEdicion = nota;

  campoTitulo.value = nota.querySelector(".nota-titulo").textContent;
  cuerpoEditor.innerHTML = cuerpo.dataset.vacio ? "" : cuerpo.innerHTML; // nota recién creada: empieza vacía
  colorElegido = COLORES.find((c) => nota.classList.contains(c)) || COLORES[0];
  marcarColor();
  metaEditor.textContent =
    (fecha ? fecha.textContent + " · " : "") + "Tablón " + document.querySelector(".titulo").textContent;
  restablecerEliminar();
  rangoGuardado = null;

  editor.showModal();
  cuerpoEditor.focus();
  document.execCommand("styleWithCSS", false, true); // el formato se guarda como estilos CSS
  ponerCursorAlFinal();
  actualizarBarra();
}

// --- Aceptar, cancelar y eliminar ---
function guardarNota() {
  const nota = notaEnEdicion;
  if (!nota) return;
  nota.querySelector(".nota-titulo").textContent = campoTitulo.value.trim() || "Sin título";
  const cuerpo = nota.querySelector(".nota-cuerpo");
  cuerpo.innerHTML = cuerpoEditor.innerHTML;
  delete cuerpo.dataset.vacio;
  COLORES.forEach((c) => nota.classList.toggle(c, c === colorElegido));
  nota.querySelector(".nota-fecha").textContent = "Hoy · " + horaActual();
  notaEditada(nota);
  editor.close();
}

function restablecerEliminar() {
  clearTimeout(temporizadorEliminar);
  botonEliminar.textContent = TEXTO_ELIMINAR;
  botonEliminar.dataset.confirmar = "";
}

botonEliminar.addEventListener("click", () => {
  if (!botonEliminar.dataset.confirmar) { // primer clic: pide confirmación
    botonEliminar.dataset.confirmar = "si";
    botonEliminar.textContent = "¿Seguro? Pulsa otra vez";
    temporizadorEliminar = setTimeout(restablecerEliminar, 3000);
    return;
  }
  const nota = notaEnEdicion;
  const datos = datosNota(nota);
  editor.close();
  nota.remove();
  actualizarContador();
  notaEliminada(datos);
});

document.getElementById("editor-aceptar").addEventListener("click", guardarNota);
document.getElementById("editor-cancelar").addEventListener("click", () => editor.close());
editor.addEventListener("close", () => { // también se cierra con la tecla Esc (equivale a cancelar)
  restablecerEliminar();
  notaEnEdicion = null;
});
editor.addEventListener("keydown", (evento) => {
  if (evento.ctrlKey && evento.key === "Enter") { evento.preventDefault(); guardarNota(); }
});
campoTitulo.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") { evento.preventDefault(); cuerpoEditor.focus(); ponerCursorAlFinal(); }
});
// Los círculos de color se crean a partir de la lista COLORES (en tablon.js)
const contenedorColores = document.getElementById("editor-colores");
COLORES.forEach((clase) => {
  const nombre = clase.replace("nota--", "");
  const muestra = document.createElement("button");
  muestra.type = "button";
  muestra.className = "muestra";
  muestra.dataset.color = clase;
  muestra.style.setProperty("--c", "var(--nota-" + nombre + ")");
  muestra.title = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  muestra.setAttribute("aria-label", "Color " + nombre);
  muestra.setAttribute("aria-pressed", "false");
  muestra.addEventListener("click", () => { colorElegido = clase; marcarColor(); });
  contenedorColores.appendChild(muestra);
});

// --- Barra de formato ---
// Se guarda la selección del texto para poder aplicar formato desde listas desplegables y selectores de color
document.addEventListener("selectionchange", () => {
  const seleccion = window.getSelection();
  if (seleccion.rangeCount && cuerpoEditor.contains(seleccion.anchorNode)) {
    rangoGuardado = seleccion.getRangeAt(0).cloneRange();
    actualizarBarra();
  }
});

function restaurarSeleccion() {
  cuerpoEditor.focus();
  if (!rangoGuardado) return;
  const seleccion = window.getSelection();
  seleccion.removeAllRanges();
  seleccion.addRange(rangoGuardado);
}

function ejecutar(comando, valor = null) {
  restaurarSeleccion();
  document.execCommand(comando, false, valor);
  actualizarBarra();
}

function listaActual() {
  const seleccion = window.getSelection();
  let nodo = seleccion.anchorNode;
  if (!nodo) return null;
  // Con el editor vacío, tras crear una lista el cursor puede quedar en el propio editor y no dentro del <li>
  if (nodo === cuerpoEditor) nodo = cuerpoEditor.childNodes[seleccion.anchorOffset] || cuerpoEditor.lastChild;
  if (nodo && nodo.nodeType !== 1) nodo = nodo.parentElement;
  const lista = nodo && nodo.closest("ul, ol");
  return lista && cuerpoEditor.contains(lista) ? lista : null;
}

// Lista de tareas = lista con viñetas a la que se le añade la clase "tareas" (las casillas las dibuja el CSS)
function alternarTareas() {
  restaurarSeleccion();
  const lista = listaActual();
  if (lista && lista.classList.contains("tareas")) {
    document.execCommand("insertUnorderedList"); // quita la lista
  } else if (lista && lista.tagName === "UL") {
    lista.classList.add("tareas");
  } else {
    const antes = new Set(cuerpoEditor.querySelectorAll("ul"));
    document.execCommand("insertUnorderedList");
    // La lista nueva no siempre está bajo el cursor (pasa con el editor vacío): se busca también por diferencia
    const nueva = listaActual() || [...cuerpoEditor.querySelectorAll("ul")].find((ul) => !antes.has(ul));
    if (nueva) nueva.classList.add("tareas");
  }
  actualizarBarra();
}

const COMANDOS_ESTADO = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"];
function actualizarBarra() {
  const lista = listaActual();
  const enTareas = !!lista && lista.classList.contains("tareas");
  COMANDOS_ESTADO.forEach((comando) => {
    const boton = barraFormato.querySelector('[data-cmd="' + comando + '"]');
    if (!boton) return;
    let activo = document.queryCommandState(comando);
    if (comando === "insertUnorderedList" && enTareas) activo = false;
    boton.setAttribute("aria-pressed", String(activo));
  });
  document.getElementById("fmt-tareas").setAttribute("aria-pressed", String(enTareas));
}

// Evita que los botones quiten el foco (y la selección) del texto
barraFormato.addEventListener("mousedown", (evento) => {
  if (evento.target.closest("button")) evento.preventDefault();
});
barraFormato.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button");
  if (!boton) return;
  if (boton.dataset.cmd) ejecutar(boton.dataset.cmd);
  else if (boton.id === "fmt-tareas") alternarTareas();
});

document.getElementById("fmt-fuente").addEventListener("change", (evento) => {
  ejecutar("fontName", evento.target.value);
  evento.target.value = "";
});
document.getElementById("fmt-tamano").addEventListener("change", (evento) => {
  ejecutar("fontSize", evento.target.value);
  evento.target.value = "";
});
document.getElementById("fmt-color").addEventListener("input", (evento) => {
  ejecutar("foreColor", evento.target.value);
  evento.target.parentElement.style.setProperty("--c", evento.target.value);
});
document.getElementById("fmt-resalte").addEventListener("input", (evento) => {
  ejecutar("hiliteColor", evento.target.value);
  evento.target.parentElement.style.setProperty("--c", evento.target.value);
});

// --- Comportamiento del texto ---
// Clic en la casilla (zona izquierda de la tarea): marca o desmarca
cuerpoEditor.addEventListener("click", (evento) => {
  const tarea = evento.target.closest(".tareas > li");
  if (!tarea || !cuerpoEditor.contains(tarea)) return;
  if (enCasilla(tarea, evento)) alternarTarea(tarea);
});

// Al pulsar Enter en una tarea, la nueva tarea empieza sin marcar
cuerpoEditor.addEventListener("input", (evento) => {
  if (evento.inputType !== "insertParagraph") return;
  const seleccion = window.getSelection();
  const nodo = seleccion.anchorNode && (seleccion.anchorNode.nodeType === 1 ? seleccion.anchorNode : seleccion.anchorNode.parentElement);
  const tarea = nodo && nodo.closest(".tareas > li");
  if (tarea) tarea.removeAttribute("data-hecho");
});

// Pegar solo texto (sin estilos de otras webs o programas) y no admitir archivos arrastrados
cuerpoEditor.addEventListener("paste", (evento) => {
  evento.preventDefault();
  document.execCommand("insertText", false, evento.clipboardData.getData("text/plain"));
});
cuerpoEditor.addEventListener("drop", (evento) => {
  if (evento.dataTransfer && evento.dataTransfer.files.length) evento.preventDefault();
});