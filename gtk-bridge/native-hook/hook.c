// libgtk-hook.so — LD_PRELOAD-хук для перехвата GTK-окон.
// Multi-window: каждое GtkWindow трекается отдельно, свой windowId.
// Отправляет: window-added / frame / geometry / window-removed.
// Координаты контента корректируются на _GTK_FRAME_EXTENTS (CSD-тень GTK4).
// Изображения: icon_name → gicon → paintable → widget render → PNG data-URI.
// Length-prefixed framing: [uint32 LE длина][N байт JSON]

#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>

#include <gtk/gtk.h>
#include <graphene.h>

#ifdef GDK_WINDOWING_X11
#include <gdk/x11/gdkx.h>
#include <X11/Xlib.h>
#include <X11/Xatom.h>
// Подавляем deprecated warnings от gdk_x11_* — они нужны, API другой нет
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
#endif

/* ---------- forward declarations --------------------------------------- */

static gboolean emit_all_frames(gpointer data);

/* ---------- flags -------------------------------------------------------- */

static int    g_debug         = 0;
static int    g_emit_calls    = 0;
static int    g_hide_original = 0;
static double g_hide_opacity  = 0.01;

/* ---------- socket ------------------------------------------------------- */

static int sock_fd = -1;

static int connect_daemon(void) {
    const char *path = getenv("GTK_BRIDGE_SOCKET");
    if (!path) path = "/tmp/gtk-bridge.sock";

    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return -1;

    struct sockaddr_un addr = {0};
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, path, sizeof(addr.sun_path) - 1);

    if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        fprintf(stderr, "[hook] connect(%s) failed: %s\n", path, strerror(errno));
        close(fd);
        return -1;
    }
    fprintf(stderr, "[hook] connected to daemon at %s\n", path);
    return fd;
}

static gboolean send_all(int fd, const void *buf, size_t len) {
    const char *p = (const char *)buf;
    size_t left = len;
    while (left > 0) {
        ssize_t n = send(fd, p, left, MSG_NOSIGNAL);
        if (n < 0) { if (errno == EINTR) continue; return FALSE; }
        if (n == 0) return FALSE;
        p += n; left -= (size_t)n;
    }
    return TRUE;
}

static gboolean send_frame(int fd, const char *json) {
    size_t len = strlen(json);
    if (len > 64u * 1024u * 1024u) return FALSE;
    uint32_t l = (uint32_t)len;
    unsigned char hdr[4] = {
        (unsigned char)(l & 0xff),
        (unsigned char)((l >> 8) & 0xff),
        (unsigned char)((l >> 16) & 0xff),
        (unsigned char)((l >> 24) & 0xff),
    };
    if (!send_all(fd, hdr, 4)) return FALSE;
    if (!send_all(fd, json, len)) return FALSE;
    return TRUE;
}

/* ---------- JSON helpers ------------------------------------------------- */

static void jstr(GString *o, const char *s) {
    if (!s) s = "";
    g_string_append_c(o, '"');
    for (; *s; s++) {
        switch (*s) {
            case '"':  g_string_append(o, "\\\""); break;
            case '\\': g_string_append(o, "\\\\"); break;
            case '\n': g_string_append(o, "\\n");  break;
            case '\r': g_string_append(o, "\\r");  break;
            case '\t': g_string_append(o, "\\t");  break;
            case '\b': g_string_append(o, "\\b");  break;
            case '\f': g_string_append(o, "\\f");  break;
            default:
                if ((unsigned char)*s < 0x20)
                    g_string_append_printf(o, "\\u%04x", (unsigned char)*s);
                else
                    g_string_append_c(o, *s);
        }
    }
    g_string_append_c(o, '"');
}

static void jkey(GString *o, const char *k) { jstr(o, k); g_string_append_c(o, ':'); }

static void jdouble(GString *o, double v) {
    char buf[G_ASCII_DTOSTR_BUF_SIZE];
    g_ascii_formatd(buf, sizeof(buf), "%.2f", v);
    g_string_append(o, buf);
}

/* ---------- image render cache ------------------------------------------ */

typedef struct {
    int width;
    int height;
    char *uri;
} WidgetUriEntry;

static GHashTable *g_widget_uri_cache = NULL;

static void on_widget_destroyed(gpointer data, GObject *w) {
    (void)data;
    if (!g_widget_uri_cache) return;
    WidgetUriEntry *e = g_hash_table_lookup(g_widget_uri_cache, w);
    if (e) {
        g_free(e->uri);
        g_free(e);
        g_hash_table_remove(g_widget_uri_cache, w);
    }
}

static GdkTexture *render_widget_to_texture(GtkWidget *w, int w_px, int h_px) {
    if (w_px <= 0 || h_px <= 0) return NULL;

    GtkSnapshot *snap = gtk_snapshot_new();
    GdkPaintable *p = gtk_widget_paintable_new(w);
    gdk_paintable_snapshot(p, snap, (double)w_px, (double)h_px);
    g_object_unref(p);

    GskRenderNode *node = gtk_snapshot_free_to_node(snap);
    if (!node) return NULL;

    GskRenderer *r = gsk_cairo_renderer_new();
    GError *err = NULL;
    if (!gsk_renderer_realize(r, NULL, &err)) {
        if (err) g_error_free(err);
        g_object_unref(r);
        gsk_render_node_unref(node);
        return NULL;
    }

    graphene_rect_t bounds;
    graphene_rect_init(&bounds, 0, 0, (float)w_px, (float)h_px);

    GdkTexture *tex = gsk_renderer_render_texture(r, node, &bounds);

    gsk_renderer_unrealize(r);
    g_object_unref(r);
    gsk_render_node_unref(node);
    return tex;
}

static const char *widget_uri_cached(GtkWidget *w, int w_px, int h_px) {
    if (!g_widget_uri_cache)
        g_widget_uri_cache = g_hash_table_new(g_direct_hash, g_direct_equal);

    WidgetUriEntry *e = g_hash_table_lookup(g_widget_uri_cache, w);
    if (e && e->width == w_px && e->height == h_px) return e->uri;

    GdkTexture *tex = render_widget_to_texture(w, w_px, h_px);
    if (!tex) return NULL;

    GBytes *bytes = gdk_texture_save_to_png_bytes(tex);
    g_object_unref(tex);
    if (!bytes) return NULL;

    gsize size = 0;
    const void *data = g_bytes_get_data(bytes, &size);
    gchar *b64 = g_base64_encode(data, size);
    gchar *uri = g_strdup_printf("data:image/png;base64,%s", b64);
    g_free(b64);
    g_bytes_unref(bytes);

    if (e) {
        g_free(e->uri);
        e->width = w_px;
        e->height = h_px;
        e->uri = uri;
    } else {
        e = g_new0(WidgetUriEntry, 1);
        e->width = w_px;
        e->height = h_px;
        e->uri = uri;
        g_hash_table_insert(g_widget_uri_cache, w, e);
        g_object_weak_ref(G_OBJECT(w), on_widget_destroyed, NULL);
    }

    if (g_debug)
        fprintf(stderr, "[hook] rendered widget %s %dx%d → %u-byte URI\n",
                G_OBJECT_TYPE_NAME(w), w_px, h_px, (unsigned)strlen(uri));
    return uri;
}

/* ---------- GIcon → name/path ------------------------------------------- */

static char *icon_name_from_gicon(GIcon *gicon) {
    if (!gicon) return NULL;

    if (G_IS_THEMED_ICON(gicon)) {
        GThemedIcon *themed = G_THEMED_ICON(gicon);
        const char * const *names = g_themed_icon_get_names(themed);
        if (names && names[0]) return g_strdup(names[0]);
    }

    if (G_IS_FILE_ICON(gicon)) {
        GFileIcon *file_icon = G_FILE_ICON(gicon);
        GFile *f = g_file_icon_get_file(file_icon);
        if (f) {
            char *path = g_file_get_path(f);
            if (path) return path;
        }
    }

    return NULL;
}

/* ---------- image-like detection ---------------------------------------- */

static gboolean widget_is_image_like(GtkWidget *w) {
    if (GTK_IS_IMAGE(w)) return TRUE;
    const char *name = G_OBJECT_TYPE_NAME(w);
    if (name && strstr(name, "Image") != NULL) return TRUE;
    return FALSE;
}

static GdkPaintable *get_paintable_via_property(GtkWidget *w) {
    GObjectClass *klass = G_OBJECT_GET_CLASS(w);
    if (!klass) return NULL;
    GParamSpec *pspec = g_object_class_find_property(klass, "paintable");
    if (!pspec) return NULL;

    GValue v = G_VALUE_INIT;
    g_value_init(&v, G_PARAM_SPEC_VALUE_TYPE(pspec));
    g_object_get_property(G_OBJECT(w), "paintable", &v);
    GdkPaintable *p = g_value_get_object(&v);
    if (p) g_object_ref(p);
    g_value_unset(&v);
    return p;
}

static char *paintable_to_uri(GdkPaintable *p) {
    if (!p || !GDK_IS_TEXTURE(p)) return NULL;
    GBytes *bytes = gdk_texture_save_to_png_bytes(GDK_TEXTURE(p));
    if (!bytes) return NULL;
    gsize sz = 0;
    const void *data = g_bytes_get_data(bytes, &sz);
    gchar *b64 = g_base64_encode(data, sz);
    char *uri = g_strdup_printf("data:image/png;base64,%s", b64);
    g_free(b64);
    g_bytes_unref(bytes);
    return uri;
}

static char *resolve_image_src(GtkWidget *w, int w_px, int h_px) {
    if (GTK_IS_IMAGE(w)) {
        GtkImageType st = gtk_image_get_storage_type(GTK_IMAGE(w));
        if (st == GTK_IMAGE_ICON_NAME) {
            const char *name = gtk_image_get_icon_name(GTK_IMAGE(w));
            if (name) return g_strdup_printf("icon:%s", name);
        }
        if (st == GTK_IMAGE_GICON) {
            GIcon *gicon = gtk_image_get_gicon(GTK_IMAGE(w));
            char *nm = icon_name_from_gicon(gicon);
            if (nm) {
                char *out = (nm[0] == '/')
                    ? g_strdup_printf("file:%s", nm)
                    : g_strdup_printf("icon:%s", nm);
                g_free(nm);
                return out;
            }
        }
        if (st == GTK_IMAGE_PAINTABLE) {
            GdkPaintable *p = gtk_image_get_paintable(GTK_IMAGE(w));
            char *uri = paintable_to_uri(p);
            if (uri) return uri;
        }
    }

    GdkPaintable *p = get_paintable_via_property(w);
    if (p) {
        char *uri = paintable_to_uri(p);
        g_object_unref(p);
        if (uri) return uri;
    }

    const char *uri = widget_uri_cached(w, w_px, h_px);
    if (uri) return g_strdup(uri);

    return NULL;
}

/* ---------- node type mapping ------------------------------------------- */

static const char *gtk_node_type(GtkWidget *w) {
    if (GTK_IS_APPLICATION_WINDOW(w) || GTK_IS_WINDOW(w)) return "window";
    if (GTK_IS_CHECK_BUTTON(w))  return "checkbox";
    if (GTK_IS_BUTTON(w))        return "button";
    if (GTK_IS_ENTRY(w))         return "entry";
    if (GTK_IS_SWITCH(w))        return "switch";
    if (GTK_IS_PROGRESS_BAR(w))  return "progress";
    if (GTK_IS_SEPARATOR(w))     return "separator";
    if (GTK_IS_SCROLLED_WINDOW(w)) return "scrolled";
    if (GTK_IS_LABEL(w))         return "label";
    if (widget_is_image_like(w)) return "image";
    if (GTK_IS_BOX(w))           return "box";
    return "invisible";
}

static gboolean widget_has_css_class(GtkWidget *w, const char *cls) {
    return gtk_widget_has_css_class(w, cls);
}

/* ---------- tree walk --------------------------------------------------- */

static gboolean walk_into(GString *o, GtkWidget *w,
                          const char *path, const char *parent_type,
                          gboolean *first_at_level)
{
    if (!w) return FALSE;
    if (!gtk_widget_get_visible(w)) return FALSE;

    if (GTK_IS_WINDOW(w) && !GTK_IS_APPLICATION_WINDOW(w)) {
        const char *tname = G_OBJECT_TYPE_NAME(w);
        if (tname && strcmp(tname, "GtkTooltipWindow") == 0) return FALSE;
    }

    GtkRoot *root = gtk_widget_get_root(w);
    if (!root) return FALSE;
    GtkWidget *root_widget = GTK_WIDGET(root);

    graphene_rect_t b;
    if (!gtk_widget_compute_bounds(w, root_widget, &b)) return FALSE;
    if (b.size.width <= 0 || b.size.height <= 0) return FALSE;

    const char *type = gtk_node_type(w);

    if (!*first_at_level) g_string_append_c(o, ',');
    *first_at_level = FALSE;

    g_string_append_c(o, '{');
    jkey(o, "id");    jstr(o, path);                       g_string_append_c(o, ',');
    jkey(o, "type");  jstr(o, type);                       g_string_append_c(o, ',');
    jkey(o, "gtk");   jstr(o, G_OBJECT_TYPE_NAME(w));      g_string_append_c(o, ',');
    jkey(o, "bounds");
    g_string_append(o, "{\"x\":"); jdouble(o, b.origin.x);
    g_string_append(o, ",\"y\":"); jdouble(o, b.origin.y);
    g_string_append(o, ",\"w\":"); jdouble(o, b.size.width);
    g_string_append(o, ",\"h\":"); jdouble(o, b.size.height);
    g_string_append_c(o, '}');

    if (!gtk_widget_get_sensitive(w)) {
        g_string_append(o, ","); jkey(o, "sensitive"); g_string_append(o, "false");
    }
    double op = gtk_widget_get_opacity(w);
    if (op < 1.0) { g_string_append(o, ","); jkey(o, "opacity"); jdouble(o, op); }

    if (GTK_IS_LABEL(w)) {
        const char *t = gtk_label_get_text(GTK_LABEL(w));
        g_string_append(o, ",");
        jkey(o, "text"); jstr(o, t ? t : "");
        g_string_append(o, ",");
        jkey(o, "size"); g_string_append(o, "14");
        g_string_append(o, ",");
        jkey(o, "color"); jstr(o, "#cdd6f4");
        g_string_append(o, ",");
        jkey(o, "align");
        jstr(o, (parent_type && strcmp(parent_type, "button") == 0) ? "center" : "left");
    }
    else if (widget_is_image_like(w)) {
        char *resolved = resolve_image_src(w, (int)b.size.width, (int)b.size.height);
        g_string_append(o, ",");
        jkey(o, "src");
        jstr(o, resolved ? resolved : "icon:Image");
        if (resolved) g_free(resolved);
        g_string_append(o, ",");
        jkey(o, "color"); jstr(o, "#a6adc8");
    }
    else if (GTK_IS_ENTRY(w)) {
        const char *t  = gtk_editable_get_text(GTK_EDITABLE(w));
        const char *ph = gtk_entry_get_placeholder_text(GTK_ENTRY(w));
        g_string_append(o, ","); jkey(o, "text"); jstr(o, t ? t : "");
        g_string_append(o, ","); jkey(o, "placeholder"); jstr(o, ph ? ph : "");
        g_string_append(o, ","); jkey(o, "bg"); jstr(o, "#181825");
        g_string_append(o, ","); jkey(o, "borderColor"); jstr(o, "#585b70");
        g_string_append(o, ","); jkey(o, "borderWidth"); g_string_append(o, "1");
        g_string_append(o, ","); jkey(o, "radius"); g_string_append(o, "6");
        g_string_append(o, ","); jkey(o, "color"); jstr(o, "#cdd6f4");
        g_string_append(o, ",\"children\":[]}");
        return TRUE;
    }
    else if (GTK_IS_CHECK_BUTTON(w)) {
        gboolean active = gtk_check_button_get_active(GTK_CHECK_BUTTON(w));
        const char *t = gtk_button_get_label(GTK_BUTTON(w));
        g_string_append(o, ","); jkey(o, "checked");
        g_string_append(o, active ? "true" : "false");
        g_string_append(o, ","); jkey(o, "text"); jstr(o, t ? t : "");
        g_string_append(o, ","); jkey(o, "color"); jstr(o, "#cdd6f4");
        g_string_append(o, ","); jkey(o, "borderColor"); jstr(o, "#585b70");
        g_string_append(o, ","); jkey(o, "borderWidth"); g_string_append(o, "1");
        g_string_append(o, ","); jkey(o, "radius"); g_string_append(o, "4");
        g_string_append(o, ",\"children\":[]}");
        return TRUE;
    }
    else if (GTK_IS_SWITCH(w)) {
        gboolean active = gtk_switch_get_active(GTK_SWITCH(w));
        g_string_append(o, ","); jkey(o, "checked");
        g_string_append(o, active ? "true" : "false");
        g_string_append(o, ",\"children\":[]}");
        return TRUE;
    }
    else if (GTK_IS_PROGRESS_BAR(w)) {
        double frac = gtk_progress_bar_get_fraction(GTK_PROGRESS_BAR(w));
        g_string_append(o, ","); jkey(o, "fraction"); jdouble(o, frac);
        g_string_append(o, ",\"children\":[]}");
        return TRUE;
    }
    else if (GTK_IS_SEPARATOR(w)) {
        GtkOrientation orient = gtk_orientable_get_orientation(GTK_ORIENTABLE(w));
        g_string_append(o, ","); jkey(o, "orientation");
        jstr(o, orient == GTK_ORIENTATION_VERTICAL ? "vertical" : "horizontal");
        g_string_append(o, ",\"children\":[]}");
        return TRUE;
    }
    else if (GTK_IS_BUTTON(w)) {
        g_string_append(o, ","); jkey(o, "radius"); g_string_append(o, "6");
        g_string_append(o, ","); jkey(o, "bg");
        if (widget_has_css_class(w, "suggested-action"))       jstr(o, "#89b4fa");
        else if (widget_has_css_class(w, "destructive-action")) jstr(o, "#f38ba8");
        else if (widget_has_css_class(w, "flat"))               jstr(o, "");
        else                                                    jstr(o, "#45475a");
    }
    else if (GTK_IS_WINDOW(w)) {
        g_string_append(o, ","); jkey(o, "bg"); jstr(o, "#1e1e2e");
    }

    g_string_append(o, ",\"children\":[");
    gboolean child_first = TRUE;
    int idx = 0;
    for (GtkWidget *c = gtk_widget_get_first_child(w);
         c; c = gtk_widget_get_next_sibling(c))
    {
        char cpath[256];
        snprintf(cpath, sizeof(cpath), "%s.%d", path, idx);
        walk_into(o, c, cpath, type, &child_first);
        idx++;
    }
    g_string_append(o, "]}");
    return TRUE;
}

/* ---------- X11 geometry (с учётом CSD) --------------------------------- */

// Читает _GTK_FRAME_EXTENTS у X11-окна.
// Возвращает TRUE и заполняет out_left/top/right/bottom, если свойство есть.
static gboolean read_gtk_frame_extents(Display *dpy, Window xid,
                                       int *out_left, int *out_top,
                                       int *out_right, int *out_bottom) {
    *out_left = *out_top = *out_right = *out_bottom = 0;
    Atom a = XInternAtom(dpy, "_GTK_FRAME_EXTENTS", False);
    if (a == None) return FALSE;

    Atom actual_type;
    int actual_format;
    unsigned long nitems, bytes_after;
    unsigned char *data = NULL;

    if (XGetWindowProperty(dpy, xid, a, 0, 4, False, XA_CARDINAL,
                           &actual_type, &actual_format, &nitems,
                           &bytes_after, &data) != Success) {
        if (data) XFree(data);
        return FALSE;
    }
    if (!data) return FALSE;

    gboolean ok = FALSE;
    if (nitems >= 4) {
        unsigned long *e = (unsigned long *)data;
        *out_left   = (int)e[0];
        *out_right  = (int)e[1];
        *out_top    = (int)e[2];
        *out_bottom = (int)e[3];
        ok = TRUE;
    }
    XFree(data);
    return ok;
}

// Возвращает позицию ВИДИМОГО КОНТЕНТА окна на экране (с поправкой на CSD-тень).
static gboolean window_get_x11_info(GtkWindow *win,
                                    int *out_x, int *out_y,
                                    unsigned long *out_xid) {
#ifdef GDK_WINDOWING_X11
    GdkSurface *surface = gtk_native_get_surface(GTK_NATIVE(win));
    if (!surface) return FALSE;

    GdkDisplay *display = gdk_surface_get_display(surface);
    if (!GDK_IS_X11_DISPLAY(display)) return FALSE;

    Window xid = gdk_x11_surface_get_xid(surface);
    if (!xid) return FALSE;

    Display *dpy = gdk_x11_display_get_xdisplay(display);
    if (!dpy) return FALSE;

    XWindowAttributes attrs;
    if (!XGetWindowAttributes(dpy, xid, &attrs)) return FALSE;

    int rx = 0, ry = 0;
    Window child = 0;
    if (!XTranslateCoordinates(dpy, xid, attrs.root, 0, 0, &rx, &ry, &child))
        return FALSE;

    // Корректируем на CSD-тень: позиция видимого контента = позиция X11-окна + (left, top)
    int left = 0, top = 0, right = 0, bottom = 0;
    if (read_gtk_frame_extents(dpy, xid, &left, &top, &right, &bottom)) {
        if (g_debug)
            fprintf(stderr, "[hook] _GTK_FRAME_EXTENTS = %d,%d,%d,%d\n",
                    left, right, top, bottom);
    }
    rx += left;
    ry += top;

    *out_x = rx;
    *out_y = ry;
    *out_xid = (unsigned long)xid;
    return TRUE;
#else
    (void)win; (void)out_x; (void)out_y; (void)out_xid;
    return FALSE;
#endif
}

/* ---------- multi-window tracking --------------------------------------- */

typedef struct {
    int   id;
    guint last_hash;
    guint frame_counter;
    int   last_screen_x;
    int   last_screen_y;
    int   last_screen_w;
    int   last_screen_h;
    gboolean geom_valid;
} WindowEntry;

static GHashTable *g_windows     = NULL;
static int         g_next_win_id = 1;
static guint       g_global_tick = 0;

static void window_entry_free(gpointer p) { g_free(p); }

static void window_id_str(int id, char *out, size_t out_sz) {
    snprintf(out, out_sz, "gtk-%d-%d", (int)getpid(), id);
}

static void on_window_destroy(GtkWidget *w, gpointer data) {
    (void)data;
    if (!g_windows) return;
    WindowEntry *e = g_hash_table_lookup(g_windows, w);
    if (!e) return;

    char wid[64];
    window_id_str(e->id, wid, sizeof(wid));
    fprintf(stderr, "[hook] window destroyed: %s\n", wid);

    if (sock_fd >= 0) {
        GString *o = g_string_new(NULL);
        g_string_append(o, "{\"type\":\"window-removed\",");
        jkey(o, "windowId"); jstr(o, wid);
        g_string_append_c(o, '}');
        send_frame(sock_fd, o->str);
        g_string_free(o, TRUE);
    }
    g_hash_table_remove(g_windows, w);
}

static void ensure_socket(void) {
    if (sock_fd < 0) sock_fd = connect_daemon();
}

static void announce_window(GtkWindow *win, WindowEntry *e) {
    char wid[64];
    window_id_str(e->id, wid, sizeof(wid));

    const char *title = gtk_window_get_title(win);
    fprintf(stderr, "[hook] tracking window: %s id=%s (\"%s\")\n",
            G_OBJECT_TYPE_NAME(win), wid, title ? title : "");

    ensure_socket();
    if (sock_fd < 0) return;

    GString *o = g_string_new(NULL);
    g_string_append(o, "{\"type\":\"window-added\",");
    jkey(o, "windowId"); jstr(o, wid);
    g_string_append_c(o, ',');
    jkey(o, "title"); jstr(o, title ? title : "Untitled");
    g_string_append_c(o, '}');
    send_frame(sock_fd, o->str);
    g_string_free(o, TRUE);
}

static void install_hook(GtkWidget *win) {
    if (!win) return;
    if (!GTK_IS_WINDOW(win)) return;

    void *gtk4 = dlopen("libgtk-4.so.1", RTLD_NOLOAD | RTLD_LAZY);
    if (!gtk4) {
        static int warned = 0;
        if (!warned) {
            warned = 1;
            fprintf(stderr, "[hook] GTK4 not loaded — hook disabled\n");
        }
        return;
    }
    dlclose(gtk4);

    if (!gdk_display_get_default()) return;

    if (!g_windows)
        g_windows = g_hash_table_new_full(g_direct_hash, g_direct_equal,
                                          NULL, window_entry_free);

    if (g_hash_table_contains(g_windows, win)) return;

    WindowEntry *e = g_new0(WindowEntry, 1);
    e->id = g_next_win_id++;
    e->last_hash = 0;
    e->frame_counter = 0;
    e->geom_valid = FALSE;

    g_hash_table_insert(g_windows, win, e);
    g_signal_connect(win, "destroy", G_CALLBACK(on_window_destroy), NULL);

    if (g_hide_original) {
        if (g_debug)
            fprintf(stderr, "[hook] hiding original via opacity=%.4f\n", g_hide_opacity);
        gtk_widget_set_opacity(GTK_WIDGET(win), g_hide_opacity);
        gtk_widget_queue_draw(GTK_WIDGET(win));
    }

    announce_window(GTK_WINDOW(win), e);

    if (g_global_tick == 0) {
        g_global_tick = g_timeout_add(100, emit_all_frames, NULL);
        fprintf(stderr, "[hook] global emit timer started\n");
    }
}

/* ---------- frame emission ---------------------------------------------- */

static void emit_geometry_if_changed(GtkWindow *win, WindowEntry *e) {
    if (sock_fd < 0) return;

    int sx = 0, sy = 0;
    unsigned long xid = 0;
    if (!window_get_x11_info(win, &sx, &sy, &xid)) return;

    GtkRoot *root = gtk_widget_get_root(GTK_WIDGET(win));
    if (!root) return;
    graphene_rect_t rb;
    if (!gtk_widget_compute_bounds(GTK_WIDGET(win), GTK_WIDGET(root), &rb)) return;

    int sw = (int)rb.size.width;
    int sh = (int)rb.size.height;

    if (e->geom_valid &&
        sx == e->last_screen_x && sy == e->last_screen_y &&
        sw == e->last_screen_w && sh == e->last_screen_h)
        return;

    e->last_screen_x = sx;
    e->last_screen_y = sy;
    e->last_screen_w = sw;
    e->last_screen_h = sh;
    e->geom_valid = TRUE;

    char wid[64];
    window_id_str(e->id, wid, sizeof(wid));

    GString *o = g_string_new(NULL);
    g_string_append(o, "{\"type\":\"geometry\",");
    jkey(o, "windowId"); jstr(o, wid);
    g_string_append_c(o, ',');
    g_string_append_printf(o,
        "\"x\":%d,\"y\":%d,\"width\":%d,\"height\":%d,\"xid\":\"0x%lx\"",
        sx, sy, sw, sh, xid);
    g_string_append_c(o, '}');

    if (g_debug)
        fprintf(stderr, "[hook] %s GEOM %d,%d %dx%d\n", wid, sx, sy, sw, sh);

    send_frame(sock_fd, o->str);
    g_string_free(o, TRUE);
}

static gboolean emit_one_window(GtkWindow *win, WindowEntry *e) {
    GtkRoot *root = gtk_widget_get_root(GTK_WIDGET(win));
    if (!root) return FALSE;

    graphene_rect_t rb;
    if (!gtk_widget_compute_bounds(GTK_WIDGET(win), GTK_WIDGET(root), &rb))
        return FALSE;
    if (rb.size.width <= 0 || rb.size.height <= 0) return FALSE;

    char wid[64];
    window_id_str(e->id, wid, sizeof(wid));

    GString *o = g_string_new(NULL);
    g_string_append(o, "{\"type\":\"frame\",");
    jkey(o, "windowId"); jstr(o, wid);
    g_string_append_c(o, ',');
    jkey(o, "frame"); g_string_append_printf(o, "%u", e->frame_counter++);
    g_string_append_c(o, ',');
    {
        const char *t = gtk_window_get_title(win);
        jkey(o, "title"); jstr(o, t ? t : "Untitled");
    }
    g_string_append_c(o, ',');
    g_string_append(o, "\"width\":");  jdouble(o, rb.size.width);
    g_string_append(o, ",\"height\":"); jdouble(o, rb.size.height);
    g_string_append_c(o, ',');
    jkey(o, "root");
    gboolean first = TRUE;
    if (!walk_into(o, GTK_WIDGET(win), "0", NULL, &first))
        g_string_append(o, "null");
    g_string_append_c(o, '}');

    guint h = g_str_hash(o->str);
    if (h != e->last_hash || e->frame_counter <= 5) {
        e->last_hash = h;
        if (g_debug && g_emit_calls <= 30)
            fprintf(stderr, "[hook] %s SEND %u bytes\n",
                    wid, (unsigned)o->len);
        if (!send_frame(sock_fd, o->str)) {
            fprintf(stderr, "[hook] send_frame failed: %s\n", strerror(errno));
            close(sock_fd); sock_fd = -1;
            GHashTableIter it;
            gpointer k, v;
            g_hash_table_iter_init(&it, g_windows);
            while (g_hash_table_iter_next(&it, &k, &v))
                ((WindowEntry*)v)->last_hash = 0;
        }
    }
    g_string_free(o, TRUE);
    return TRUE;
}

static gboolean emit_all_frames(gpointer data) {
    (void)data;
    g_emit_calls++;

    if (!gdk_display_get_default()) return G_SOURCE_CONTINUE;
    if (sock_fd < 0) {
        sock_fd = connect_daemon();
        if (sock_fd < 0) return G_SOURCE_CONTINUE;
    }
    if (!g_windows || g_hash_table_size(g_windows) == 0) return G_SOURCE_CONTINUE;

    GHashTableIter it;
    gpointer k, v;
    g_hash_table_iter_init(&it, g_windows);
    while (g_hash_table_iter_next(&it, &k, &v)) {
        emit_geometry_if_changed(GTK_WINDOW(k), (WindowEntry*)v);
        emit_one_window(GTK_WINDOW(k), (WindowEntry*)v);
    }
    return G_SOURCE_CONTINUE;
}

/* ---------- interceptors ------------------------------------------------ */

typedef GtkWidget *(*gtk_app_win_new_t)(GtkApplication *);
typedef GtkWidget *(*gtk_win_new_t)(void);
typedef void       (*gtk_window_present_t)(GtkWindow *);

GtkWidget *gtk_application_window_new(GtkApplication *app) {
    static gtk_app_win_new_t real = NULL;
    if (!real) real = (gtk_app_win_new_t)dlsym(RTLD_NEXT, "gtk_application_window_new");
    GtkWidget *win = real(app);
    install_hook(win);
    return win;
}

GtkWidget *gtk_window_new(void) {
    static gtk_win_new_t real = NULL;
    if (!real) real = (gtk_win_new_t)dlsym(RTLD_NEXT, "gtk_window_new");
    GtkWidget *win = real();
    install_hook(win);
    return win;
}

void gtk_window_present(GtkWindow *window) {
    static gtk_window_present_t real = NULL;
    if (!real) real = (gtk_window_present_t)dlsym(RTLD_NEXT, "gtk_window_present");
    real(window);
    install_hook(GTK_WIDGET(window));
}

__attribute__((constructor))
static void hook_init(void) {
    if (getenv("GTK_HOOK_DEBUG")) g_debug = 1;
    if (getenv("GTK_HOOK_HIDE"))  g_hide_original = 1;
    if (getenv("GTK_HOOK_HIDE_OPACITY")) {
        double v = atof(getenv("GTK_HOOK_HIDE_OPACITY"));
        if (v > 0.0 && v < 1.0) g_hide_opacity = v;
    }
    if (g_debug)
        fprintf(stderr, "[hook] loaded pid=%d hide=%d opacity=%.4f\n",
                (int)getpid(), g_hide_original, g_hide_opacity);
}
#ifdef GDK_WINDOWING_X11
#pragma GCC diagnostic pop
#endif