#!/bin/sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> building native-hook"
cd "$DIR/native-hook"
make clean && make

echo "==> building daemon"
cd "$DIR/daemon"
go build -o gtk-bridge-daemon .

echo "==> done"
ls -la "$DIR/native-hook/libgtk-hook.so" "$DIR/daemon/gtk-bridge-daemon"