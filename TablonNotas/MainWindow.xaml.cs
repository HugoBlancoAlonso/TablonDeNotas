using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.IO;
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

        string carpetaWeb = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        Navegador.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "app.local", carpetaWeb, CoreWebView2HostResourceAccessKind.Allow);

        Navegador.CoreWebView2.Navigate("https://app.local/index.html");
    }
}