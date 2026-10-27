// Tablón: cuadrícula, notas, arrastrar y redimensionar.
// Es un módulo: exporta lo que necesita el editor (tablon, COLORES, datosNota...).

// ---------- Tablón: crear una nota con doble clic ----------
// Estado compartido con el editor: true justo después de arrastrar o redimensionar (para no abrir la nota)
export const estado = { ignorarClic: false };

export const tablon = document.querySelector(".tablon");
const meta = document.querySelector(".meta");

// Tamaño por defecto de una nota nueva, en celdas
const ANCHO_NOTA = 7;
const ALTO_NOTA = 6;
export const COLORES = [
  "nota--amarilla",
  "nota--naranja",
  "nota--coral",
  "nota--rosa",
  "nota--lila",
  "nota--azul",
  "nota--celeste",
  "nota--turquesa",
  "nota--verde",
  "nota--lima",
  "nota--arena",
  "nota--gris",
]; // orden en el que aparecen en el editor
let contadorColor = 0;

// Lee el tamaño de celda de la variable CSS --celda (en píxeles)
function tamanoCelda() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--celda"));
}

// Convierte la posición del ratón en columna y fila de la cuadrícula (empiezan en 1)
function celdaDesdeRaton(evento) {
  const celda = tamanoCelda();
  const caja = tablon.getBoundingClientRect();
  const x = evento.clientX - caja.left + tablon.scrollLeft;
  const y = evento.clientY - caja.top + tablon.scrollTop;

  let col = Math.floor(x / celda) + 1;
  const fila = Math.floor(y / celda) + 1;

  // Evita que la nota se salga por la derecha
  const columnasTotales = Math.floor(tablon.clientWidth / celda);
  col = Math.max(1, Math.min(col, columnasTotales - ANCHO_NOTA + 1));

  return { col, fila };
}

function crearNota(col, fila) {
  const nota = document.createElement("article");
  nota.className = "nota " + COLORES[contadorColor % COLORES.length];
  contadorColor++;
  nota.dataset.id = crypto.randomUUID(); // identificador para guardarla más adelante
  nota.style.setProperty("--col", col);
  nota.style.setProperty("--fila", fila);
  nota.style.setProperty("--ancho", ANCHO_NOTA);
  nota.style.setProperty("--alto", ALTO_NOTA);
  nota.innerHTML =
    '<h2 class="nota-titulo">Nueva nota</h2>' +
    '<div class="nota-cuerpo" data-vacio="true"><p>Escribe aquí…</p></div>' +
    '<p class="nota-fecha">Ahora</p>';
  tablon.appendChild(nota);
  return nota;
}

export function actualizarContador() {
  const total = tablon.querySelectorAll(".nota").length;
  meta.textContent = total + (total === 1 ? " nota" : " notas") + " · actualizado ahora";
}

tablon.addEventListener("dblclick", (evento) => {
  // Si el doble clic cae sobre una nota existente, no se crea otra
  if (evento.target.closest(".nota")) return;
  // En la vista de lista no hay cuadrícula: se crea con el botón "Nueva nota"
  if (tablon.dataset.vista === "lista") return;

  const { col, fila } = celdaDesdeRaton(evento);
  crearNota(col, fila);
  actualizarContador();
  window.getSelection().removeAllRanges(); // quita la selección de texto del doble clic
});

// ---------- Cabecera: botón "Nueva nota" y cambio de vista ----------
export function numero(nota, variable) {
  return parseInt(nota.style.getPropertyValue(variable), 10);
}

// ¿Una nota nueva en (col, fila) se solaparía con alguna existente?
function hayChoque(col, fila) {
  return [...tablon.querySelectorAll(".nota")].some((nota) => {
    const c = numero(nota, "--col");
    const f = numero(nota, "--fila");
    const a = numero(nota, "--ancho");
    const h = numero(nota, "--alto");
    return col < c + a && col + ANCHO_NOTA > c && fila < f + h && fila + ALTO_NOTA > f;
  });
}

// Busca de izquierda a derecha y de arriba abajo el primer hueco libre
function primerHuecoLibre() {
  const columnasTotales = Math.floor(tablon.clientWidth / tamanoCelda());
  const maxCol = Math.max(1, columnasTotales - ANCHO_NOTA + 1);
  for (let fila = 1; fila < 500; fila += 1) {
    for (let col = 1; col <= maxCol; col += 1) {
      if (!hayChoque(col, fila)) return { col, fila };
    }
  }
  return { col: 1, fila: 1 };
}

document.getElementById("btn-nueva-nota").addEventListener("click", () => {
  const { col, fila } = primerHuecoLibre();
  const nota = crearNota(col, fila);
  actualizarContador();
  nota.scrollIntoView({ block: "nearest", inline: "nearest" });
});

const botonesVista = document.querySelectorAll(".vista");
botonesVista.forEach((boton) => {
  boton.addEventListener("click", () => {
    tablon.dataset.vista = boton.dataset.vista;
    botonesVista.forEach((b) => b.setAttribute("aria-pressed", String(b === boton)));
  });
});

// ---------- Arrastrar notas con ajuste a la cuadrícula ----------
const UMBRAL_ARRASTRE = 4; // píxeles que hay que mover antes de empezar a arrastrar
const BORDE_LIBRE = 10;    // franja del borde y las esquinas para redimensionar
let zSuperior = 1;
let arrastre = null;

export function datosNota(nota) {
  return {
    id: nota.dataset.id,
    col: numero(nota, "--col"),
    fila: numero(nota, "--fila"),
    ancho: numero(nota, "--ancho"),
    alto: numero(nota, "--alto"),
  };
}

// En la fase 4 aquí se enviará el mensaje a C# para guardar la nueva posición
function notaMovida(nota) {
  console.log("Nota movida:", datosNota(nota));
}

// Columna y fila donde caería la nota si se soltara ahora
function destinoDeArrastre(dx, dy) {
  const celda = tamanoCelda();
  const { col, fila, ancho } = arrastre.datos;
  const columnasTotales = Math.floor(tablon.clientWidth / celda);
  const maxCol = Math.max(1, columnasTotales - ancho + 1);
  return {
    col: Math.max(1, Math.min(col + Math.round(dx / celda), maxCol)),
    fila: Math.max(1, fila + Math.round(dy / celda)),
  };
}

function empezarArrastre() {
  const { nota, datos } = arrastre;
  arrastre.empezado = true;
  nota.classList.add("arrastrando");
  nota.style.zIndex = ++zSuperior; // la nota arrastrada queda por encima de las demás
  tablon.classList.add("moviendo");
  window.getSelection().removeAllRanges();

  // Recuadro que muestra dónde se colocará la nota al soltar
  const fantasma = document.createElement("div");
  fantasma.className = "nota-fantasma";
  fantasma.style.setProperty("--ancho", datos.ancho);
  fantasma.style.setProperty("--alto", datos.alto);
  tablon.appendChild(fantasma);
  arrastre.fantasma = fantasma;
}

tablon.addEventListener("pointerdown", (evento) => {
  if (evento.button !== 0 || tablon.dataset.vista === "lista") return;
  const nota = evento.target.closest(".nota");
  if (!nota) return;
  if (evento.target.closest("button, input, textarea, a, [contenteditable='true']")) return;

  // Solo se arrastra desde el centro: el borde queda libre para redimensionar
  const caja = nota.getBoundingClientRect();
  const enCentro =
    evento.clientX > caja.left + BORDE_LIBRE && evento.clientX < caja.right - BORDE_LIBRE &&
    evento.clientY > caja.top + BORDE_LIBRE && evento.clientY < caja.bottom - BORDE_LIBRE;
  if (!enCentro) return;

  arrastre = {
    nota,
    pointerId: evento.pointerId,
    inicioX: evento.clientX,
    inicioY: evento.clientY,
    datos: datosNota(nota),
    empezado: false,
    fantasma: null,
    destino: null,
  };
  nota.setPointerCapture(evento.pointerId);
});

tablon.addEventListener("pointermove", (evento) => {
  if (!arrastre || evento.pointerId !== arrastre.pointerId) return;
  const dx = evento.clientX - arrastre.inicioX;
  const dy = evento.clientY - arrastre.inicioY;

  if (!arrastre.empezado) {
    if (Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return; // así un clic simple no mueve nada
    empezarArrastre();
  }

  arrastre.nota.style.transform = "translate(" + dx + "px, " + dy + "px)";
  arrastre.destino = destinoDeArrastre(dx, dy);
  arrastre.fantasma.style.setProperty("--col", arrastre.destino.col);
  arrastre.fantasma.style.setProperty("--fila", arrastre.destino.fila);
});

function terminarArrastre(evento) {
  if (!arrastre || evento.pointerId !== arrastre.pointerId) return;
  const { nota, fantasma, destino, empezado } = arrastre;
  arrastre = null;
  if (empezado) estado.ignorarClic = true; // tras arrastrar no se abre la nota

  if (nota.hasPointerCapture(evento.pointerId)) nota.releasePointerCapture(evento.pointerId);
  if (!empezado) return;

  nota.style.transform = "";
  nota.classList.remove("arrastrando");
  tablon.classList.remove("moviendo");
  fantasma.remove();

  // Si se cancela el gesto (pointercancel), la nota vuelve a su sitio
  if (evento.type === "pointerup" && destino) {
    nota.style.setProperty("--col", destino.col);
    nota.style.setProperty("--fila", destino.fila);
    notaMovida(nota);
    actualizarContador();
  }
}
tablon.addEventListener("pointerup", terminarArrastre);
tablon.addEventListener("pointercancel", terminarArrastre);

// ---------- Redimensionar notas por celdas ----------
const MIN_ANCHO = 4; // tamaño mínimo de una nota, en celdas
const MIN_ALTO = 3;
const CURSORES = {
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
  ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize",
};
let redimension = null;

// Devuelve en qué borde o esquina está el ratón: "n", "s", "e", "w", "ne", "nw", "se", "sw" ("" = centro)
function zonaDeBorde(nota, evento) {
  const caja = nota.getBoundingClientRect();
  let zona = "";
  if (evento.clientY - caja.top <= BORDE_LIBRE) zona += "n";
  else if (caja.bottom - evento.clientY <= BORDE_LIBRE) zona += "s";
  if (evento.clientX - caja.left <= BORDE_LIBRE) zona += "w";
  else if (caja.right - evento.clientX <= BORDE_LIBRE) zona += "e";
  return zona;
}

function aplicarMedidas(nota, medidas) {
  nota.style.setProperty("--col", medidas.col);
  nota.style.setProperty("--fila", medidas.fila);
  nota.style.setProperty("--ancho", medidas.ancho);
  nota.style.setProperty("--alto", medidas.alto);
}

// En la fase 4 aquí se enviará el mensaje a C# para guardar el nuevo tamaño
function notaRedimensionada(nota) {
  console.log("Nota redimensionada:", datosNota(nota));
}

// Nueva posición y tamaño, en celdas, según el borde que se arrastra y lo que se ha movido el ratón
function destinoDeRedimension(dx, dy) {
  const celda = tamanoCelda();
  const { zona, datos } = redimension;
  const columnasTotales = Math.floor(tablon.clientWidth / celda);
  let { col, fila, ancho, alto } = datos;
  const derecha = col + ancho; // el borde opuesto queda fijo al tirar de la izquierda
  const abajo = fila + alto;
  const dCols = Math.round(dx / celda);
  const dFilas = Math.round(dy / celda);

  if (zona.includes("e")) ancho = Math.max(MIN_ANCHO, Math.min(ancho + dCols, columnasTotales - col + 1));
  if (zona.includes("w")) { col = Math.max(1, Math.min(col + dCols, derecha - MIN_ANCHO)); ancho = derecha - col; }
  if (zona.includes("s")) alto = Math.max(MIN_ALTO, alto + dFilas);
  if (zona.includes("n")) { fila = Math.max(1, Math.min(fila + dFilas, abajo - MIN_ALTO)); alto = abajo - fila; }

  return { col, fila, ancho, alto };
}

tablon.addEventListener("pointerdown", (evento) => {
  if (evento.button !== 0 || tablon.dataset.vista === "lista") return;
  const nota = evento.target.closest(".nota");
  if (!nota) return;
  const zona = zonaDeBorde(nota, evento);
  if (!zona) return; // en el centro se arrastra (código de arriba)

  redimension = {
    nota,
    zona,
    pointerId: evento.pointerId,
    inicioX: evento.clientX,
    inicioY: evento.clientY,
    datos: datosNota(nota),
    destino: null,
  };
  nota.style.zIndex = ++zSuperior;
  tablon.classList.add("moviendo"); // evita seleccionar texto mientras se redimensiona
  nota.setPointerCapture(evento.pointerId);
  evento.preventDefault();
});

tablon.addEventListener("pointermove", (evento) => {
  if (redimension) {
    if (evento.pointerId !== redimension.pointerId) return;
    redimension.destino = destinoDeRedimension(
      evento.clientX - redimension.inicioX,
      evento.clientY - redimension.inicioY
    );
    aplicarMedidas(redimension.nota, redimension.destino); // la nota cambia celda a celda
    return;
  }

  // Sin gesto en curso: el cursor avisa de que el borde permite redimensionar
  if (arrastre || tablon.dataset.vista === "lista") return;
  const nota = evento.target.closest(".nota");
  if (!nota) return;
  nota.style.cursor = CURSORES[zonaDeBorde(nota, evento)] || "";
});

function terminarRedimension(evento) {
  if (!redimension || evento.pointerId !== redimension.pointerId) return;
  const { nota, datos } = redimension;
  redimension = null;
  estado.ignorarClic = true; // tras redimensionar no se abre la nota

  if (nota.hasPointerCapture(evento.pointerId)) nota.releasePointerCapture(evento.pointerId);
  tablon.classList.remove("moviendo");

  // Si se cancela el gesto, la nota recupera su tamaño anterior
  if (evento.type === "pointercancel") {
    aplicarMedidas(nota, datos);
    return;
  }
  const nuevos = datosNota(nota);
  if (nuevos.col !== datos.col || nuevos.fila !== datos.fila ||
      nuevos.ancho !== datos.ancho || nuevos.alto !== datos.alto) {
    notaRedimensionada(nota);
    actualizarContador();
  }
}
tablon.addEventListener("pointerup", terminarRedimension);
tablon.addEventListener("pointercancel", terminarRedimension);

// ---------- Estructura de cada nota ----------
// Todas las notas tienen: título (h2), cuerpo (div) y fecha (p). Las de ejemplo se adaptan aquí.
export function normalizarNota(nota) {
  if (nota.querySelector(".nota-cuerpo")) return;
  const titulo = nota.querySelector(".nota-titulo");
  const fecha = nota.querySelector(".nota-fecha");
  const cuerpo = document.createElement("div");
  cuerpo.className = "nota-cuerpo";
  [...nota.children].forEach((hijo) => {
    if (hijo !== titulo && hijo !== fecha) cuerpo.appendChild(hijo);
  });
  nota.insertBefore(cuerpo, fecha);
}
document.querySelectorAll(".nota").forEach(normalizarNota);