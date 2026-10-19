CC     ?= gcc
CFLAGS ?= -shared -fPIC -O2 -Wall -Wno-deprecated-declarations
PKGS   := gtk4
TARGET := libgtk-hook.so

all: $(TARGET)

$(TARGET): hook.c
	$(CC) $(CFLAGS) -o $@ $< $(shell pkg-config --cflags --libs $(PKGS)) -ldl -lX11

clean:
	rm -f $(TARGET)

.PHONY: all clean