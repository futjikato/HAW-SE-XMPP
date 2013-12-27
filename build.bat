call del app.nw
call lessc frontend/style.less --no-color frontend/style.css
call 7z.exe a -tzip app.nw * -r