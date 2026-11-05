using System.Text.Json;

namespace TablonNotas;

/// <summary>Sobre común de todos los mensajes entre JavaScript y C#: { "tipo": "...", "datos": { ... } }</summary>
public record Mensaje(string Tipo, JsonElement Datos);

/// <summary>
/// Una nota completa. Se usa en "nota.guardar" (JavaScript a C#)
/// y dentro de "tablon.cargar" (C# a JavaScript).
/// </summary>
public record NotaDatos(
    string Id,
    string TablonId,
    int Col,
    int Fila,
    int Ancho,
    int Alto,
    string Color,      // "amarilla", "azul", "verde"... (sin el prefijo "nota--")
    string Titulo,
    string Html,       // contenido de la nota con su formato
    string? Modificada = null);  // fecha ISO 8601; la pone C# al guardar

/// <summary>Datos de "nota.eliminar".</summary>
public record NotaEliminada(string Id);

/// <summary>Datos de "tablon.cargar".</summary>
public record TablonCargado(string TablonId, string Nombre, List<NotaDatos> Notas);

/// <summary>Datos de "error".</summary>
public record ErrorPuente(string Mensaje);

/// <summary>Nombres de los tipos de mensaje, para no escribirlos a mano en dos sitios.</summary>
public static class TipoMensaje
{
    // JavaScript -> C#
    public const string AppLista = "app.lista";
    public const string NotaGuardar = "nota.guardar";
    public const string NotaEliminar = "nota.eliminar";

    // C# -> JavaScript
    public const string TablonCargar = "tablon.cargar";
    public const string Error = "error";
}

public static class PuenteJson
{
    // camelCase en el JSON (tipo, datos, tablonId...) y PascalCase en C# (Tipo, Datos, TablonId...)
    public static readonly JsonSerializerOptions Opciones = new(JsonSerializerDefaults.Web);
}