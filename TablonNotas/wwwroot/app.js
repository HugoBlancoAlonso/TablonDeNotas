// Punto de entrada de la app: carga el tablón y el editor de notas y se conecta con C#.
import { cargarTablon } from "./tablon.js";
import "./editor/editor.js";
import { enviar, alRecibir } from "./puente.js";

console.log("Tablón de notas cargado");

// Primero se dice qué hacer con lo que llegue de C#, y solo después se avisa de que estamos listos
alRecibir("tablon.cargar", cargarTablon);
alRecibir("error", (datos) => console.error("Error desde C#:", datos.mensaje));
enviar("app.lista");