@echo off
rem Opens the Blue Gallery prototype on a local web server.
rem Videos only play inside the page when it is served like this, not opened as a file.
cd /d "%~dp0"
start "" http://localhost:8123/index.html
python -m http.server 8123 --bind 127.0.0.1
