// Prismfall portable launcher.
// One self-contained .exe: the whole game is embedded. It serves the game on
// 127.0.0.1 with a fixed port (so browser saves stay on one origin), opens the default
// browser, and quits on its own about three minutes after the game tab stops
// sending heartbeats.
package main

import (
	"embed"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"sync/atomic"
	"time"
)

//go:embed all:game
var gameFS embed.FS

const addr = "127.0.0.1:47613"

func openBrowser(url string) {
	switch runtime.GOOS {
	case "windows":
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		exec.Command("open", url).Start()
	default:
		exec.Command("xdg-open", url).Start()
	}
}

func main() {
	url := "http://" + addr + "/?launcher=1"
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		// Already running (or the port is taken): just open the game.
		openBrowser(url)
		return
	}
	sub, _ := fs.Sub(gameFS, "game")
	var last atomic.Int64
	last.Store(time.Now().Unix())
	files := http.FileServer(http.FS(sub))
	mux := http.NewServeMux()
	mux.HandleFunc("/__ping", func(w http.ResponseWriter, r *http.Request) {
		last.Store(time.Now().Unix())
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		last.Store(time.Now().Unix())
		w.Header().Set("Cache-Control", "no-cache")
		files.ServeHTTP(w, r)
	})
	go func() {
		for {
			time.Sleep(15 * time.Second)
			if time.Now().Unix()-last.Load() > 180 {
				os.Exit(0)
			}
		}
	}()
	openBrowser(url)
	http.Serve(ln, mux)
}
