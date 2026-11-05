using System.Diagnostics;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace TablonNotas;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await Navegador.EnsureCoreWebView2Async();

        // Hay que suscribirse ANTES de navegar, para no perder el primer mensaje (app.lista)
        Navegador.CoreWebView2.WebMessageReceived += Navegador_MensajeRecibido;

        string carpetaWeb = System.IO.Path.Combine(AppContext.BaseDirectory, "wwwroot");
        Navegador.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "app.local", carpetaWeb, CoreWebView2HostResourceAccessKind.Allow);

        Navegador.CoreWebView2.Navigate("https://app.local/index.html");
    }

    // ---------- C# -> JavaScript ----------
    // Envía { "tipo": "...", "datos": { ... } } a la página
    private void EnviarAJs<T>(string tipo, T datos)
    {
        string json = JsonSerializer.Serialize(new { tipo, datos }, PuenteJson.Opciones);
        Navegador.CoreWebView2.PostWebMessageAsJson(json);
        Debug.WriteLine($"[C# -> JS] {tipo}");
    }

    // Datos de prueba: en la fase 5 vendrán de la base de datos SQLite
    private static TablonCargado TablonDePrueba()
    {
        string ahora = DateTime.UtcNow.ToString("o");
        return new TablonCargado("ideas-de-la-app", "Ideas de la app", new List<NotaDatos>
        {
            new("00000000-0000-0000-0000-000000000001", "ideas-de-la-app", 2, 2, 7, 7, "amarilla",
                "Lista de la compra",
                "<ul class=\"tareas\"><li>Leche</li><li>Pan integral</li><li>Huevos</li><li>Fruta de temporada</li><li>Café</li></ul>",
                ahora),
            new("00000000-0000-0000-0000-000000000002", "ideas-de-la-app", 10, 2, 7, 4, "azul",
                "Recordatorio",
                "<p>Llamar para pedir cita. Mañana a las 10:00.</p>",
                ahora),
            new("00000000-0000-0000-0000-000000000003", "ideas-de-la-app", 17, 2, 7, 7, "verde",
                "Rutina de entreno",
                "<p><b>Lunes</b><br>Pecho y tríceps</p><p><b>Martes</b><br>Pierna</p><p><b>Jueves</b><br>Espalda y bíceps</p>",
                ahora),
        });
    }

    // ---------- JavaScript -> C# ----------
    // Llega un mensaje de JavaScript: { "tipo": "...", "datos": { ... } }
    private void Navegador_MensajeRecibido(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var mensaje = JsonSerializer.Deserialize<Mensaje>(e.WebMessageAsJson, PuenteJson.Opciones);
            if (mensaje is null) return;

            switch (mensaje.Tipo)
            {
                case TipoMensaje.AppLista:
                    Debug.WriteLine("[JS -> C#] app.lista: la página está lista");
                    EnviarAJs(TipoMensaje.TablonCargar, TablonDePrueba());
                    break;

                case TipoMensaje.NotaGuardar:
                    var nota = mensaje.Datos.Deserialize<NotaDatos>(PuenteJson.Opciones);
                    if (nota is null) break;
                    Debug.WriteLine(
                        $"[JS -> C#] nota.guardar: \"{nota.Titulo}\" ({nota.Id}) " +
                        $"col={nota.Col} fila={nota.Fila} tamaño={nota.Ancho}x{nota.Alto} color={nota.Color}");
                    break;

                case TipoMensaje.NotaEliminar:
                    var eliminada = mensaje.Datos.Deserialize<NotaEliminada>(PuenteJson.Opciones);
                    Debug.WriteLine($"[JS -> C#] nota.eliminar: {eliminada?.Id}");
                    break;

                default:
                    Debug.WriteLine($"[JS -> C#] mensaje desconocido: {mensaje.Tipo}");
                    break;
            }
        }
        catch (JsonException ex)
        {
            Debug.WriteLine($"[JS -> C#] mensaje no válido: {ex.Message}");
        }
    }
}