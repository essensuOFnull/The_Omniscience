var $jscomp = $jscomp || {};
$jscomp.scope = {};
$jscomp.findInternal = function(b, d, e) {
    b instanceof String && (b = String(b));
    for (var g = b.length, h = 0; h < g; h++) {
        var l = b[h];
        if (d.call(e, l, h, b))
            return {
                i: h,
                v: l
            }
    }
    return {
        i: -1,
        v: void 0
    }
}
;
$jscomp.ASSUME_ES5 = !1;
$jscomp.ASSUME_NO_NATIVE_MAP = !1;
$jscomp.ASSUME_NO_NATIVE_SET = !1;
$jscomp.SIMPLE_FROUND_POLYFILL = !1;
$jscomp.ISOLATE_POLYFILLS = !1;
$jscomp.defineProperty = $jscomp.ASSUME_ES5 || "function" == typeof Object.defineProperties ? Object.defineProperty : function(b, d, e) {
    if (b == Array.prototype || b == Object.prototype)
        return b;
    b[d] = e.value;
    return b
}
;
$jscomp.getGlobal = function(b) {
    b = ["object" == typeof globalThis && globalThis, b, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
    for (var d = 0; d < b.length; ++d) {
        var e = b[d];
        if (e && e.Math == Math)
            return e
    }
    throw Error("Cannot find global object");
}
;
$jscomp.global = $jscomp.getGlobal(this);
$jscomp.IS_SYMBOL_NATIVE = "function" === typeof Symbol && "symbol" === typeof Symbol("x");
$jscomp.TRUST_ES6_POLYFILLS = !$jscomp.ISOLATE_POLYFILLS || $jscomp.IS_SYMBOL_NATIVE;
$jscomp.polyfills = {};
$jscomp.propertyToPolyfillSymbol = {};
$jscomp.POLYFILL_PREFIX = "$jscp$";
var $jscomp$lookupPolyfilledValue = function(b, d) {
    var e = $jscomp.propertyToPolyfillSymbol[d];
    if (null == e)
        return b[d];
    e = b[e];
    return void 0 !== e ? e : b[d]
};
$jscomp.polyfill = function(b, d, e, g) {
    d && ($jscomp.ISOLATE_POLYFILLS ? $jscomp.polyfillIsolated(b, d, e, g) : $jscomp.polyfillUnisolated(b, d, e, g))
}
;
$jscomp.polyfillUnisolated = function(b, d, e, g) {
    e = $jscomp.global;
    b = b.split(".");
    for (g = 0; g < b.length - 1; g++) {
        var h = b[g];
        if (!(h in e))
            return;
        e = e[h]
    }
    b = b[b.length - 1];
    g = e[b];
    d = d(g);
    d != g && null != d && $jscomp.defineProperty(e, b, {
        configurable: !0,
        writable: !0,
        value: d
    })
}
;
$jscomp.polyfillIsolated = function(b, d, e, g) {
    var h = b.split(".");
    b = 1 === h.length;
    g = h[0];
    g = !b && g in $jscomp.polyfills ? $jscomp.polyfills : $jscomp.global;
    for (var l = 0; l < h.length - 1; l++) {
        var k = h[l];
        if (!(k in g))
            return;
        g = g[k]
    }
    h = h[h.length - 1];
    e = $jscomp.IS_SYMBOL_NATIVE && "es6" === e ? g[h] : null;
    d = d(e);
    null != d && (b ? $jscomp.defineProperty($jscomp.polyfills, h, {
        configurable: !0,
        writable: !0,
        value: d
    }) : d !== e && ($jscomp.propertyToPolyfillSymbol[h] = $jscomp.IS_SYMBOL_NATIVE ? $jscomp.global.Symbol(h) : $jscomp.POLYFILL_PREFIX + h,
    h = $jscomp.propertyToPolyfillSymbol[h],
    $jscomp.defineProperty(g, h, {
        configurable: !0,
        writable: !0,
        value: d
    })))
}
;
$jscomp.polyfill("Array.prototype.find", function(b) {
    return b ? b : function(d, e) {
        return $jscomp.findInternal(this, d, e).v
    }
}, "es6", "es3");
$jscomp.arrayIteratorImpl = function(b) {
    var d = 0;
    return function() {
        return d < b.length ? {
            done: !1,
            value: b[d++]
        } : {
            done: !0
        }
    }
}
;
$jscomp.arrayIterator = function(b) {
    return {
        next: $jscomp.arrayIteratorImpl(b)
    }
}
;
$jscomp.initSymbol = function() {}
;
$jscomp.polyfill("Symbol", function(b) {
    if (b)
        return b;
    var d = function(h, l) {
        this.$jscomp$symbol$id_ = h;
        $jscomp.defineProperty(this, "description", {
            configurable: !0,
            writable: !0,
            value: l
        })
    };
    d.prototype.toString = function() {
        return this.$jscomp$symbol$id_
    }
    ;
    var e = 0
      , g = function(h) {
        if (this instanceof g)
            throw new TypeError("Symbol is not a constructor");
        return new d("jscomp_symbol_" + (h || "") + "_" + e++,h)
    };
    return g
}, "es6", "es3");
$jscomp.initSymbolIterator = function() {}
;
$jscomp.polyfill("Symbol.iterator", function(b) {
    if (b)
        return b;
    b = Symbol("Symbol.iterator");
    for (var d = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), e = 0; e < d.length; e++) {
        var g = $jscomp.global[d[e]];
        "function" === typeof g && "function" != typeof g.prototype[b] && $jscomp.defineProperty(g.prototype, b, {
            configurable: !0,
            writable: !0,
            value: function() {
                return $jscomp.iteratorPrototype($jscomp.arrayIteratorImpl(this))
            }
        })
    }
    return b
}, "es6", "es3");
$jscomp.initSymbolAsyncIterator = function() {}
;
$jscomp.iteratorPrototype = function(b) {
    b = {
        next: b
    };
    b[Symbol.iterator] = function() {
        return this
    }
    ;
    return b
}
;
$jscomp.iteratorFromArray = function(b, d) {
    b instanceof String && (b += "");
    var e = 0
      , g = {
        next: function() {
            if (e < b.length) {
                var h = e++;
                return {
                    value: d(h, b[h]),
                    done: !1
                }
            }
            g.next = function() {
                return {
                    done: !0,
                    value: void 0
                }
            }
            ;
            return g.next()
        }
    };
    g[Symbol.iterator] = function() {
        return g
    }
    ;
    return g
}
;
$jscomp.polyfill("Array.prototype.keys", function(b) {
    return b ? b : function() {
        return $jscomp.iteratorFromArray(this, function(d) {
            return d
        })
    }
}, "es6", "es3");
$jscomp.underscoreProtoCanBeSet = function() {
    var b = {
        a: !0
    }
      , d = {};
    try {
        return d.__proto__ = b,
        d.a
    } catch (e) {}
    return !1
}
;
$jscomp.setPrototypeOf = $jscomp.TRUST_ES6_POLYFILLS && "function" == typeof Object.setPrototypeOf ? Object.setPrototypeOf : $jscomp.underscoreProtoCanBeSet() ? function(b, d) {
    b.__proto__ = d;
    if (b.__proto__ !== d)
        throw new TypeError(b + " is not extensible");
    return b
}
: null;
$jscomp.polyfill("Object.setPrototypeOf", function(b) {
    return b || $jscomp.setPrototypeOf
}, "es6", "es5");
$jscomp.owns = function(b, d) {
    return Object.prototype.hasOwnProperty.call(b, d)
}
;
$jscomp.assign = $jscomp.TRUST_ES6_POLYFILLS && "function" == typeof Object.assign ? Object.assign : function(b, d) {
    for (var e = 1; e < arguments.length; e++) {
        var g = arguments[e];
        if (g)
            for (var h in g)
                $jscomp.owns(g, h) && (b[h] = g[h])
    }
    return b
}
;
$jscomp.polyfill("Object.assign", function(b) {
    return b || $jscomp.assign
}, "es6", "es3");
$jscomp.checkEs6ConformanceViaProxy = function() {
    try {
        var b = {}
          , d = Object.create(new $jscomp.global.Proxy(b,{
            get: function(e, g, h) {
                return e == b && "q" == g && h == d
            }
        }));
        return !0 === d.q
    } catch (e) {
        return !1
    }
}
;
$jscomp.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS = !1;
$jscomp.ES6_CONFORMANCE = $jscomp.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS && $jscomp.checkEs6ConformanceViaProxy();
$jscomp.makeIterator = function(b) {
    var d = "undefined" != typeof Symbol && Symbol.iterator && b[Symbol.iterator];
    return d ? d.call(b) : $jscomp.arrayIterator(b)
}
;
$jscomp.polyfill("WeakMap", function(b) {
    function d() {
        if (!b || !Object.seal)
            return !1;
        try {
            var t = Object.seal({})
              , q = Object.seal({})
              , r = new b([[t, 2], [q, 3]]);
            if (2 != r.get(t) || 3 != r.get(q))
                return !1;
            r.delete(t);
            r.set(q, 4);
            return !r.has(t) && 4 == r.get(q)
        } catch (w) {
            return !1
        }
    }
    function e() {}
    function g(t) {
        var q = typeof t;
        return "object" === q && null !== t || "function" === q
    }
    function h(t) {
        if (!$jscomp.owns(t, k)) {
            var q = new e;
            $jscomp.defineProperty(t, k, {
                value: q
            })
        }
    }
    function l(t) {
        if (!$jscomp.ISOLATE_POLYFILLS) {
            var q = Object[t];
            q && (Object[t] = function(r) {
                if (r instanceof e)
                    return r;
                Object.isExtensible(r) && h(r);
                return q(r)
            }
            )
        }
    }
    if ($jscomp.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS) {
        if (b && $jscomp.ES6_CONFORMANCE)
            return b
    } else if (d())
        return b;
    var k = "$jscomp_hidden_" + Math.random();
    l("freeze");
    l("preventExtensions");
    l("seal");
    var u = 0
      , m = function(t) {
        this.id_ = (u += Math.random() + 1).toString();
        if (t) {
            t = $jscomp.makeIterator(t);
            for (var q; !(q = t.next()).done; )
                q = q.value,
                this.set(q[0], q[1])
        }
    };
    m.prototype.set = function(t, q) {
        if (!g(t))
            throw Error("Invalid WeakMap key");
        h(t);
        if (!$jscomp.owns(t, k))
            throw Error("WeakMap key fail: " + t);
        t[k][this.id_] = q;
        return this
    }
    ;
    m.prototype.get = function(t) {
        return g(t) && $jscomp.owns(t, k) ? t[k][this.id_] : void 0
    }
    ;
    m.prototype.has = function(t) {
        return g(t) && $jscomp.owns(t, k) && $jscomp.owns(t[k], this.id_)
    }
    ;
    m.prototype.delete = function(t) {
        return g(t) && $jscomp.owns(t, k) && $jscomp.owns(t[k], this.id_) ? delete t[k][this.id_] : !1
    }
    ;
    return m
}, "es6", "es3");
$jscomp.MapEntry = function() {}
;
$jscomp.polyfill("Map", function(b) {
    function d() {
        if ($jscomp.ASSUME_NO_NATIVE_MAP || !b || "function" != typeof b || !b.prototype.entries || "function" != typeof Object.seal)
            return !1;
        try {
            var m = Object.seal({
                x: 4
            })
              , t = new b($jscomp.makeIterator([[m, "s"]]));
            if ("s" != t.get(m) || 1 != t.size || t.get({
                x: 4
            }) || t.set({
                x: 4
            }, "t") != t || 2 != t.size)
                return !1;
            var q = t.entries()
              , r = q.next();
            if (r.done || r.value[0] != m || "s" != r.value[1])
                return !1;
            r = q.next();
            return r.done || 4 != r.value[0].x || "t" != r.value[1] || !q.next().done ? !1 : !0
        } catch (w) {
            return !1
        }
    }
    if ($jscomp.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS) {
        if (b && $jscomp.ES6_CONFORMANCE)
            return b
    } else if (d())
        return b;
    var e = new WeakMap
      , g = function(m) {
        this.data_ = {};
        this.head_ = k();
        this.size = 0;
        if (m) {
            m = $jscomp.makeIterator(m);
            for (var t; !(t = m.next()).done; )
                t = t.value,
                this.set(t[0], t[1])
        }
    };
    g.prototype.set = function(m, t) {
        m = 0 === m ? 0 : m;
        var q = h(this, m);
        q.list || (q.list = this.data_[q.id] = []);
        q.entry ? q.entry.value = t : (q.entry = {
            next: this.head_,
            previous: this.head_.previous,
            head: this.head_,
            key: m,
            value: t
        },
        q.list.push(q.entry),
        this.head_.previous.next = q.entry,
        this.head_.previous = q.entry,
        this.size++);
        return this
    }
    ;
    g.prototype.delete = function(m) {
        m = h(this, m);
        return m.entry && m.list ? (m.list.splice(m.index, 1),
        m.list.length || delete this.data_[m.id],
        m.entry.previous.next = m.entry.next,
        m.entry.next.previous = m.entry.previous,
        m.entry.head = null,
        this.size--,
        !0) : !1
    }
    ;
    g.prototype.clear = function() {
        this.data_ = {};
        this.head_ = this.head_.previous = k();
        this.size = 0
    }
    ;
    g.prototype.has = function(m) {
        return !!h(this, m).entry
    }
    ;
    g.prototype.get = function(m) {
        return (m = h(this, m).entry) && m.value
    }
    ;
    g.prototype.entries = function() {
        return l(this, function(m) {
            return [m.key, m.value]
        })
    }
    ;
    g.prototype.keys = function() {
        return l(this, function(m) {
            return m.key
        })
    }
    ;
    g.prototype.values = function() {
        return l(this, function(m) {
            return m.value
        })
    }
    ;
    g.prototype.forEach = function(m, t) {
        for (var q = this.entries(), r; !(r = q.next()).done; )
            r = r.value,
            m.call(t, r[1], r[0], this)
    }
    ;
    g.prototype[Symbol.iterator] = g.prototype.entries;
    var h = function(m, t) {
        var q = t && typeof t;
        "object" == q || "function" == q ? e.has(t) ? q = e.get(t) : (q = "" + ++u,
        e.set(t, q)) : q = "p_" + t;
        var r = m.data_[q];
        if (r && $jscomp.owns(m.data_, q))
            for (m = 0; m < r.length; m++) {
                var w = r[m];
                if (t !== t && w.key !== w.key || t === w.key)
                    return {
                        id: q,
                        list: r,
                        index: m,
                        entry: w
                    }
            }
        return {
            id: q,
            list: r,
            index: -1,
            entry: void 0
        }
    }
      , l = function(m, t) {
        var q = m.head_;
        return $jscomp.iteratorPrototype(function() {
            if (q) {
                for (; q.head != m.head_; )
                    q = q.previous;
                for (; q.next != q.head; )
                    return q = q.next,
                    {
                        done: !1,
                        value: t(q)
                    };
                q = null
            }
            return {
                done: !0,
                value: void 0
            }
        })
    }
      , k = function() {
        var m = {};
        return m.previous = m.next = m.head = m
    }
      , u = 0;
    return g
}, "es6", "es3");
$jscomp.polyfill("Set", function(b) {
    function d() {
        if ($jscomp.ASSUME_NO_NATIVE_SET || !b || "function" != typeof b || !b.prototype.entries || "function" != typeof Object.seal)
            return !1;
        try {
            var g = Object.seal({
                x: 4
            })
              , h = new b($jscomp.makeIterator([g]));
            if (!h.has(g) || 1 != h.size || h.add(g) != h || 1 != h.size || h.add({
                x: 4
            }) != h || 2 != h.size)
                return !1;
            var l = h.entries()
              , k = l.next();
            if (k.done || k.value[0] != g || k.value[1] != g)
                return !1;
            k = l.next();
            return k.done || k.value[0] == g || 4 != k.value[0].x || k.value[1] != k.value[0] ? !1 : l.next().done
        } catch (u) {
            return !1
        }
    }
    if ($jscomp.USE_PROXY_FOR_ES6_CONFORMANCE_CHECKS) {
        if (b && $jscomp.ES6_CONFORMANCE)
            return b
    } else if (d())
        return b;
    var e = function(g) {
        this.map_ = new Map;
        if (g) {
            g = $jscomp.makeIterator(g);
            for (var h; !(h = g.next()).done; )
                this.add(h.value)
        }
        this.size = this.map_.size
    };
    e.prototype.add = function(g) {
        g = 0 === g ? 0 : g;
        this.map_.set(g, g);
        this.size = this.map_.size;
        return this
    }
    ;
    e.prototype.delete = function(g) {
        g = this.map_.delete(g);
        this.size = this.map_.size;
        return g
    }
    ;
    e.prototype.clear = function() {
        this.map_.clear();
        this.size = 0
    }
    ;
    e.prototype.has = function(g) {
        return this.map_.has(g)
    }
    ;
    e.prototype.entries = function() {
        return this.map_.entries()
    }
    ;
    e.prototype.values = function() {
        return this.map_.values()
    }
    ;
    e.prototype.keys = e.prototype.values;
    e.prototype[Symbol.iterator] = e.prototype.values;
    e.prototype.forEach = function(g, h) {
        var l = this;
        this.map_.forEach(function(k) {
            return g.call(h, k, k, l)
        })
    }
    ;
    return e
}, "es6", "es3");
$jscomp.polyfill("Array.prototype.values", function(b) {
    return b ? b : function() {
        return $jscomp.iteratorFromArray(this, function(d, e) {
            return e
        })
    }
}, "es8", "es3");
$jscomp.FORCE_POLYFILL_PROMISE = !1;
$jscomp.polyfill("Promise", function(b) {
    function d() {
        this.batch_ = null
    }
    function e(k) {
        return k instanceof h ? k : new h(function(u, m) {
            u(k)
        }
        )
    }
    if (b && !$jscomp.FORCE_POLYFILL_PROMISE)
        return b;
    d.prototype.asyncExecute = function(k) {
        if (null == this.batch_) {
            this.batch_ = [];
            var u = this;
            this.asyncExecuteFunction(function() {
                u.executeBatch_()
            })
        }
        this.batch_.push(k)
    }
    ;
    var g = $jscomp.global.setTimeout;
    d.prototype.asyncExecuteFunction = function(k) {
        g(k, 0)
    }
    ;
    d.prototype.executeBatch_ = function() {
        for (; this.batch_ && this.batch_.length; ) {
            var k = this.batch_;
            this.batch_ = [];
            for (var u = 0; u < k.length; ++u) {
                var m = k[u];
                k[u] = null;
                try {
                    m()
                } catch (t) {
                    this.asyncThrow_(t)
                }
            }
        }
        this.batch_ = null
    }
    ;
    d.prototype.asyncThrow_ = function(k) {
        this.asyncExecuteFunction(function() {
            throw k;
        })
    }
    ;
    var h = function(k) {
        this.state_ = 0;
        this.result_ = void 0;
        this.onSettledCallbacks_ = [];
        var u = this.createResolveAndReject_();
        try {
            k(u.resolve, u.reject)
        } catch (m) {
            u.reject(m)
        }
    };
    h.prototype.createResolveAndReject_ = function() {
        function k(t) {
            return function(q) {
                m || (m = !0,
                t.call(u, q))
            }
        }
        var u = this
          , m = !1;
        return {
            resolve: k(this.resolveTo_),
            reject: k(this.reject_)
        }
    }
    ;
    h.prototype.resolveTo_ = function(k) {
        if (k === this)
            this.reject_(new TypeError("A Promise cannot resolve to itself"));
        else if (k instanceof h)
            this.settleSameAsPromise_(k);
        else {
            a: switch (typeof k) {
            case "object":
                var u = null != k;
                break a;
            case "function":
                u = !0;
                break a;
            default:
                u = !1
            }
            u ? this.resolveToNonPromiseObj_(k) : this.fulfill_(k)
        }
    }
    ;
    h.prototype.resolveToNonPromiseObj_ = function(k) {
        var u = void 0;
        try {
            u = k.then
        } catch (m) {
            this.reject_(m);
            return
        }
        "function" == typeof u ? this.settleSameAsThenable_(u, k) : this.fulfill_(k)
    }
    ;
    h.prototype.reject_ = function(k) {
        this.settle_(2, k)
    }
    ;
    h.prototype.fulfill_ = function(k) {
        this.settle_(1, k)
    }
    ;
    h.prototype.settle_ = function(k, u) {
        if (0 != this.state_)
            throw Error("Cannot settle(" + k + ", " + u + "): Promise already settled in state" + this.state_);
        this.state_ = k;
        this.result_ = u;
        this.executeOnSettledCallbacks_()
    }
    ;
    h.prototype.executeOnSettledCallbacks_ = function() {
        if (null != this.onSettledCallbacks_) {
            for (var k = 0; k < this.onSettledCallbacks_.length; ++k)
                l.asyncExecute(this.onSettledCallbacks_[k]);
            this.onSettledCallbacks_ = null
        }
    }
    ;
    var l = new d;
    h.prototype.settleSameAsPromise_ = function(k) {
        var u = this.createResolveAndReject_();
        k.callWhenSettled_(u.resolve, u.reject)
    }
    ;
    h.prototype.settleSameAsThenable_ = function(k, u) {
        var m = this.createResolveAndReject_();
        try {
            k.call(u, m.resolve, m.reject)
        } catch (t) {
            m.reject(t)
        }
    }
    ;
    h.prototype.then = function(k, u) {
        function m(w, y) {
            return "function" == typeof w ? function(B) {
                try {
                    t(w(B))
                } catch (x) {
                    q(x)
                }
            }
            : y
        }
        var t, q, r = new h(function(w, y) {
            t = w;
            q = y
        }
        );
        this.callWhenSettled_(m(k, t), m(u, q));
        return r
    }
    ;
    h.prototype.catch = function(k) {
        return this.then(void 0, k)
    }
    ;
    h.prototype.callWhenSettled_ = function(k, u) {
        function m() {
            switch (t.state_) {
            case 1:
                k(t.result_);
                break;
            case 2:
                u(t.result_);
                break;
            default:
                throw Error("Unexpected state: " + t.state_);
            }
        }
        var t = this;
        null == this.onSettledCallbacks_ ? l.asyncExecute(m) : this.onSettledCallbacks_.push(m)
    }
    ;
    h.resolve = e;
    h.reject = function(k) {
        return new h(function(u, m) {
            m(k)
        }
        )
    }
    ;
    h.race = function(k) {
        return new h(function(u, m) {
            for (var t = $jscomp.makeIterator(k), q = t.next(); !q.done; q = t.next())
                e(q.value).callWhenSettled_(u, m)
        }
        )
    }
    ;
    h.all = function(k) {
        var u = $jscomp.makeIterator(k)
          , m = u.next();
        return m.done ? e([]) : new h(function(t, q) {
            function r(B) {
                return function(x) {
                    w[B] = x;
                    y--;
                    0 == y && t(w)
                }
            }
            var w = []
              , y = 0;
            do
                w.push(void 0),
                y++,
                e(m.value).callWhenSettled_(r(w.length - 1), q),
                m = u.next();
            while (!m.done)
        }
        )
    }
    ;
    return h
}, "es6", "es3");
$jscomp.polyfill("Array.from", function(b) {
    return b ? b : function(d, e, g) {
        e = null != e ? e : function(u) {
            return u
        }
        ;
        var h = []
          , l = "undefined" != typeof Symbol && Symbol.iterator && d[Symbol.iterator];
        if ("function" == typeof l) {
            d = l.call(d);
            for (var k = 0; !(l = d.next()).done; )
                h.push(e.call(g, l.value, k++))
        } else
            for (l = d.length,
            k = 0; k < l; k++)
                h.push(e.call(g, d[k], k));
        return h
    }
}, "es6", "es3");
$jscomp.polyfill("Promise.allSettled", function(b) {
    function d(g) {
        return {
            status: "fulfilled",
            value: g
        }
    }
    function e(g) {
        return {
            status: "rejected",
            reason: g
        }
    }
    return b ? b : function(g) {
        var h = this;
        g = Array.from(g, function(l) {
            return h.resolve(l).then(d, e)
        });
        return h.all(g)
    }
}, "es_2020", "es3");
function PageCalculators() {}
PageCalculators.all = function() {
    return window.CurrentPageCalculators || []
}
;
PageCalculators.getById = function(b) {
    for (var d = PageCalculators.all(), e = 0; e < d.length; ++e)
        if (d[e].CalculatorID == b)
            return d[e];
    return null
}
;
PageCalculators.forEachCalc = function(b) {
    for (var d = PageCalculators.all(), e = 0; e < d.length; ++e)
        b(d[e])
}
;
function AjaxTable(b, d, e, g, h) {
    var l = this;
    l.Recordset = new Recordset(b,h);
    l.savedScroll = null;
    l.qc = l.Recordset.QueryContext;
    l.URL = d;
    var k = null;
    l.attachUpdateListener = function(u) {
        k = u
    }
    ;
    l.Renderer = new RecordsetRenderer(e,l.qc.items);
    l.OnSort = function(u) {
        l.qc.sortcolumn = u;
        l.qc.sortdirection = "ASC" == l.qc.sortdirection ? "DESC" : "ASC";
        l.Reload()
    }
    ;
    l.OnNavigate = function(u, m) {
        2 == arguments.length ? (l.qc.from = 0 > u ? 0 : u,
        l.qc.items = m) : l.qc.from = Number(u) * l.qc.items;
        l.Reload()
    }
    ;
    l.OnStartLoading = function() {
        l.savedScroll = BSGetScroll()
    }
    ;
    l.ReloadEx = function(u, m) {
        l.URL = m;
        for (var t in u)
            l.qc[t] = u[t];
        l.Reload()
    }
    ;
    l.Reload = function() {
        l.OnStartLoading();
        BSMakePOSTRequest(l.URL, l, l.qc)
    }
    ;
    l.ReloadFrom = function(u, m) {
        var t = l.URL;
        l.ReloadEx(u, m);
        l.URL = t
    }
    ;
    l.Render = function() {
        l.Renderer.Render(l.Recordset, l.OnSort, l.OnNavigate)
    }
    ;
    l.Update = function(u) {
        l.Recordset.LoadFromObject(u);
        null != l.savedScroll && window.scrollTo(l.savedScroll.x, l.savedScroll.y);
        l.Render();
        k && k(l, u)
    }
    ;
    l.OnResponse = function(u) {
        l.Update(u)
    }
}
function AjaxTableNoEmptyRows(b, d, e, g) {
    this.inheritFrom = AjaxTable;
    this.inheritFrom(b, d, e, g);
    this.Renderer = new AjaxTableNoEmptyRowsRenderer(e,this.Recordset.QueryContext.items);
    this.OnStartLoading = function() {}
}
function AjaxSetMessages(b, d, e, g) {
    this.inheritFrom = AjaxTable;
    this.inheritFrom(b, d, e, g);
    this.OnSort = null;
    this.Renderer = new CommentsRenderer(e,10);
    this.OnStartLoading = function() {}
}
function SaveObjectToURLParams(b) {
    function d(e, g) {
        var h = "", l;
        for (l in e) {
            var k = e[l];
            "object" == typeof k && (k = Value2Json(k, !0));
            "undefined" != typeof k && (h += "&" + l + g + "=" + encodeURIComponent(k))
        }
        return h
    }
    b = Array.isArray(b) ? b.reduce(function(e, g) {
        return e + d(g, "[]")
    }, "") : d(b, "");
    return b.length ? b.substring(1) : b
}
function BSAdviseEvent(b, d, e, g) {
    b.addEventListener(d, function(h) {
        e(g);
        return BSPreventDefaultAction(h)
    }, !1)
}
function BSGetDataSourceOrigin() {
    if (void 0 !== self.dataSourceDomain)
        return "//" + self.dataSourceDomain;
    var b = self.location.hostname;
    return "" == b ? self.location.origin : "//" + b
}
function BSAlert(b) {
    alert(b)
}
function BSJson2Object(b) {
    return eval("(" + b + ")")
}
function ProcessResponseError(b, d) {
    null != b.OnError ? b.OnError(d) : BSAlert("Error occured:" + d)
}
function ProcessResponseData(b, d) {
    d.error ? ProcessResponseError(b, d.error) : b.OnResponse(d)
}
function BrowserResponse(b, d) {
    this.OnResponse = function() {
        if (4 == b.readyState)
            if (200 == b.status) {
                if (d)
                    if (d.OnResponseText)
                        d.OnResponseText(b.responseText);
                    else {
                        var e = BSJson2Object(b.responseText);
                        ProcessResponseData(d, e)
                    }
            } else if (b.responseText)
                try {
                    e = BSJson2Object(b.responseText),
                    e.error && d && ProcessResponseError(d, e.error)
                } catch (g) {}
            else
                BSAlert("Oops! Data retrieving problem:\n" + b.statusText)
    }
}
function BSMakePOSTRequest(b, d, e, g) {
    var h = new XMLHttpRequest;
    h.onreadystatechange = (new BrowserResponse(h,d)).OnResponse;
    h.open("POST", b, !g);
    h.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    h.send(e ? SaveObjectToURLParams(e) : null)
}
function BSPoint(b, d) {
    this.x = b;
    this.y = d;
    this.xpx = b + "px";
    this.ypx = d + "px"
}
function BSGetScroll() {
    var b = 0
      , d = 0;
    "number" == typeof window.pageYOffset ? (d = window.pageYOffset,
    b = window.pageXOffset) : document.body && (document.body.scrollLeft || document.body.scrollTop) ? (d = document.body.scrollTop,
    b = document.body.scrollLeft) : document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop) && (d = document.documentElement.scrollTop,
    b = document.documentElement.scrollLeft);
    return new BSPoint(b,d)
}
function BSSetScroll(b) {
    window.scrollTo(b.x, b.y)
}
function BSGetElementSize(b) {
    return new BSPoint(b.clientWidth,b.clientHeight)
}
function BSGetEventTarget(b) {
    !(b = b.target ? b.target : b.srcElement) || 3 != b.nodeType && 4 != b.nodeType || (b = b.parentNode);
    return b
}
function BSPreventDefaultAction(b) {
    b.preventDefault && b.preventDefault();
    return !1
}
function BSGetTextSelection(b) {
    var d = {};
    if ("undefined" != typeof b.selectionStart)
        d.selectionStart = b.selectionStart,
        d.selectionEnd = b.selectionEnd;
    else {
        b.focus();
        var e = b.createTextRange();
        e.moveToBookmark(document.selection.createRange().getBookmark());
        for (var g = e.text.length, h = b.value, l = h.length, k = l - 1; 0 <= k; --k) {
            var u = h.charCodeAt(k);
            if (10 == u || 13 == u)
                l--;
            else
                break
        }
        e.moveEnd("character", b.value.length);
        d.selectionStart = l - e.text.length;
        e.moveEnd("character", -e.text.length + g);
        d.selectionEnd = d.selectionStart + g
    }
    return d
}
function BSGetPressedKeyCode(b) {
    if (window.event)
        return b.keyCode;
    if (b.which)
        return b.which
}
function BSGetPressedKey(b) {
    var d = "UNDEFINED RIGHT_ALT LEFT_ALT LEFT_CONTROL RIGHT_CONTROL LEFT_SHIFT RIGHT_SHIFT LEFT_META RIGHT_META CAPS_LOCK DELETE END ENTER ESCAPE HOME INSERT NUM_LOCK PAUSE PRINTSCREEN SCROLL_LOCK LEFT RIGHT UP DOWN PAGE_DOWN PAGE_UP F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 F13 F14 F15 F16 F17 F18 F19 F20 F21 F22 F23 F24".split(" ")
      , e = {};
    if ("undefined" != typeof b.which)
        e.charCode = b.which;
    else if (window.event)
        e.charCode = b.keyCode;
    else
        for (var g = 0; g < d.length; ++g)
            b[d[g]] == b.keyCode && (e.vk = "DOM_VK" + d[g]);
    return e
}
function BSGetTextContent(b) {
    return b.textContent ? b.textContent : b.innerText
}
function BSReplaceOptions(b, d) {
    if (b.outerHTML) {
        var e = b.outerHTML
          , g = e.search(/<option/i);
        b.outerHTML = -1 == g ? e.replace(/<\/select>/i, d + "</select>") : e.substr(0, g) + d + "</select>"
    } else
        b.innerHTML = d
}
function BSGetMaxWidthProperty() {
    return document.all ? "width" : "max-width"
}
function BSAddSelectOption(b, d, e) {
    var g = document.createElement("option");
    g.text = e;
    g.value = d;
    window.ActiveXObject ? b.add(g) : b.add(g, null)
}
function trim(b) {
    b = b.replace(/^\s+/, "");
    for (var d = b.length - 1; 0 <= d; d--)
        if (/\S/.test(b.charAt(d))) {
            b = b.substring(0, d + 1);
            break
        }
    return b
}
function leftpad(b, d, e) {
    for (b = new String(b); b.length < e; )
        b = d + b;
    return b
}
function String2Date(b, d) {
    var e = new Date;
    if ("string" == typeof b) {
        if (b = TryString2Date(b, d),
        b instanceof Date)
            return b
    } else
        e = new Date(b);
    return e
}
function String2Array(b, d) {
    if ("number" == typeof b)
        return [d(b)];
    if (Array.isArray(b))
        return b.map(d);
    b = b.trim();
    if (!b.length)
        return [];
    b = b.replace(/,/g, ".");
    b = b.split(/\s+/);
    for (var e = [], g, h = 0; h < b.length; ++h) {
        try {
            g = d(b[h])
        } catch (l) {
            g = b[h]
        }
        e.push(g)
    }
    return e
}
function Array2String(b) {
    return "string" === typeof b ? b : b.join(" ")
}
function String2Matrix(b, d) {
    function e(g) {
        return String2Array(g, d)
    }
    if (Array.isArray(b))
        return b.map(e);
    b = b.trim();
    return b.length ? b.split("\n").map(e) : []
}
function Matrix2String(b) {
    return "string" === typeof b ? b : b.map(function(d) {
        return d.join(" ")
    }).join("\n")
}
function ldateCreator(b, d, e, g, h, l, k) {
    g = new Date(b,d,e,g,h,l,k);
    g.setFullYear(b);
    g.setMonth(d);
    g.setDate(e);
    return g
}
function TryString2Date(b, d) {
    if (!b)
        return b;
    var e = trim(b);
    if (b = e.match(/^(\d{4})-(\d{2})-(\d{2})( [0-2]\d:[0-5]\d:[0-5]\d)?( BC)?/i)) {
        e = b[5];
        var g = b[4] ? trim(b[4]).split(":") : [0, 0, 0];
        return (d ? d : ldateCreator)(" BC" == e ? 1 - Number(b[1]) : Number(b[1]), Number(b[2]) - 1, b[3], Number(g[0]), Number(g[1]), Number(g[2]), 0)
    }
    return e
}
function Date2String(b) {
    var d = b.getFullYear()
      , e = 0 >= d ? " BC" : "";
    0 >= d && (d = 1 - d);
    return leftpad(d, "0", 4) + "-" + leftpad(b.getMonth() + 1, "0", 2) + "-" + leftpad(b.getDate(), "0", 2) + " " + leftpad(b.getHours(), "0", 2) + ":" + leftpad(b.getMinutes(), "0", 2) + ":" + leftpad(b.getSeconds(), "0", 2) + e
}
function BSDateParse(b) {
    return String2Date(b)
}
function BSIsSystemKey(b) {
    return 120 == b.charCode || 99 == b.charCode || 118 == b.charCode
}
function BSScrollToElement(b, d) {
    $("html,body").animate({
        scrollTop: b.offset().top - $(".q7").height()
    }, "slow", "swing", d)
}
function BSGetDataSourceDomain() {
    return void 0 !== self.dataSourceDomain ? self.dataSourceDomain : self.location.hostname
}
var BACK_SPACE_ASCII_CODE = 8
  , ENTER_ASCII_CODE = 13
  , TAB_ASCII_CODE = 9;
function ElementWithMessage() {
    var b = this;
    b.GetElementToShow = function() {
        var d = b.GetElement()
          , e = d.parentNode;
        if ("FOOTER" == e.tagName)
            return d;
        for (; e; ) {
            var g = e.classList;
            if (g && g.contains("x_") && !g.contains("pc-cell-inner"))
                return e;
            e = e.parentNode
        }
        return d.parentNode
    }
    ;
    b.Show = function() {
        return b.GetElementToShow().style.display = "block"
    }
    ;
    b.Hide = function() {
        return b.GetElementToShow().style.display = "none"
    }
    ;
    b.getMsgElement = function() {
        if (b.GetElement()) {
            var d = b.GetElementToShow().getElementsByClassName("e4");
            if (d.length)
                return d[0]
        }
    }
    ;
    b.ShowMessage = function(d) {
        var e = b.getMsgElement();
        if (e)
            return e.hasAttribute("data-original") || e.setAttribute("data-original", e.innerHTML),
            e.innerHTML = d,
            !0;
        alert(d)
    }
}
function ElementAccessorRadio() {
    var b = this
      , d = null;
    b.changeSources = function() {
        if (!d) {
            d = [];
            for (var e = 0, g; g = document.getElementById(b.id + e++); )
                d.push(g)
        }
        return d
    }
    ;
    b.GetElement = function() {
        return document.getElementById(b.id + "0")
    }
    ;
    b.GetValue = function() {
        for (var e = b.changeSources(), g = 0; g < e.length; ++g) {
            var h = e[g];
            if (h.checked)
                return h.value
        }
    }
    ;
    b.ResetValue = function() {
        b.changeSources().forEach(function(e) {
            e.checked = e.defaultChecked
        })
    }
    ;
    b.SetValue = function(e) {
        b.changeSources().forEach(function(g) {
            g.checked = g.value == e
        })
    }
    ;
    b.GetRawValue = function() {
        return b.GetValue()
    }
}
function ElementAccessorCheckbox() {
    var b = this;
    b.changeSources = function() {
        return [b.GetElement()]
    }
    ;
    b.GetElement = function() {
        return document.getElementById(b.id)
    }
    ;
    b.ResetValue = function() {
        var d = b.GetElement();
        d.checked = d.defaultChecked
    }
    ;
    b.GetValue = function() {
        return b.GetElement().checked ? 1 : 0
    }
    ;
    b.SetValue = function(d) {
        var e = b.GetElement();
        e.checked = Number(d) ? 1 : 0;
        d = $(e).parents(".x6");
        e.checked ? d.addClass("y6") : d.removeClass("y6")
    }
    ;
    b.GetParent = function() {
        return b.GetElement().parentNode.parentNode.parentNode.parentNode
    }
    ;
    b.GetRawValue = function() {
        return b.GetValue()
    }
}
function ElementAccessorDefault() {
    var b = this;
    b.GetElement = function() {
        return document.getElementById(b.id)
    }
    ;
    b.GetValue = function() {
        return b.GetRawValue()
    }
    ;
    b.GetRawValue = function() {
        var d = b.GetElement();
        if (d)
            return d.value
    }
    ;
    b.ResetValue = function() {
        var d = b.GetElement();
        d && void 0 !== d.defaultValue && (d.value = d.defaultValue)
    }
    ;
    b.SetValue = function(d) {
        var e = b.GetElement();
        e && (void 0 === e.type ? e.innerHTML = d : (e.value = d,
        "text" == e.type && (e = $(e).parent(),
        void 0 !== d && "" !== d ? (e.addClass("o1"),
        e.find("label").addClass("i3")) : e.find("label").removeClass("i3"))))
    }
}
function ElementAccessorInputImage() {
    var b = this;
    b.inheritFrom = ElementAccessorDefault;
    b.inheritFrom();
    b.GetParent = function() {
        return b.GetElement().parentNode.parentNode
    }
    ;
    b.GetRawValue = function() {
        return $(b.GetElement()).data("value")
    }
    ;
    b.SetValue = function(d) {
        var e = $(b.GetElement());
        e.data("value", d);
        d && "" != d ? (e.attr("src", d + "_thumb.png"),
        e.parent().find("span").hide()) : (e.hide(),
        e.parent().find("span").show())
    }
}
function ElementAccessorOutput() {
    var b = this;
    b.inheritFrom = ElementAccessorDefault;
    b.inheritFrom();
    b.GetRawValue = function() {
        var d = b.GetElement();
        return "undefined" == typeof d.type ? d.innerHTML : d.value
    }
}
function NullableInputHandler(b) {
    var d = $(b.GetElement())
      , e = this;
    e.nullable = d.hasClass("ve");
    e.showButton = function() {
        e.nullable && d.parent().find(".we").toggleClass("x", "" == d.val());
        return !0
    }
    ;
    e.nullable && (d.parent().find(".we").find("button").on("click", function() {
        b.SetValue("");
        if ("createEvent"in document) {
            var g = document.createEvent("HTMLEvents");
            g.initEvent("change", !1, !0);
            d[0].dispatchEvent(g)
        } else
            d[0].fireEvent("onchange")
    }),
    e.showButton(),
    d.on("change", function() {
        e.showButton()
    }))
}
function ElementAccessorText() {
    var b = this, d;
    b.inheritFrom = ElementAccessorDefault;
    b.inheritFrom();
    b.nullable = !1;
    b.changeSources = function() {
        return [b.GetElement()]
    }
    ;
    b.keypressSources = b.changeSources;
    b.GetValue = function() {
        var g = b.GetRawValue();
        "" == g && b.nullable && (g = void 0);
        return g
    }
    ;
    var e = b.SetValue;
    b.SetValue = function(g) {
        e.call(b, g);
        d && d.showButton()
    }
    ;
    b.init = function() {
        d = new NullableInputHandler(b);
        b.nullable = d.nullable
    }
}
function ElementAccessorNumber() {
    var b = this;
    b.inheritFrom = ElementAccessorText;
    b.inheritFrom();
    var d = b.GetValue;
    b.GetValue = function() {
        var e = d.call(b);
        return void 0 === e ? b.nullable ? e : 0 : Number(e.replace(",", "."))
    }
}
function ElementAccessorImage() {
    var b = this;
    b.inheritFrom = ElementAccessorDefault;
    b.inheritFrom();
    b.GetRawValue = function() {
        return b.GetElement().src
    }
    ;
    b.ResetValue = function() {}
    ;
    b.SetValue = function(d) {
        b.GetElement().src = d
    }
}
function ElementAccessorCalculator(b) {
    var d = this;
    d.changeSources = function() {
        return [b]
    }
    ;
    d.inheritFrom = ElementAccessorDefault;
    d.inheritFrom();
    d.GetParent = function() {
        return d.GetElement()
    }
    ;
    d.GetRawValue = function() {
        return b.Dialog.GetValues()
    }
    ;
    d.ResetValue = function() {}
    ;
    d.SetValue = function(e) {
        b.Dialog.SetValues(e)
    }
}
function ElementAccessorSelect(b) {
    var d = this;
    d.init = function() {
        b && d.SetValue(b())
    }
    ;
    d.changeSources = function() {
        return [d.GetElement()]
    }
    ;
    d.GetElement = function() {
        return document.getElementById(d.id)
    }
    ;
    d.GetValue = function() {
        return d.GetElement().value
    }
    ;
    d.forEachOption = function(e) {
        for (var g = d.GetElement(), h = 0; h < g.options.length; ++h) {
            var l = e(g.options[h], h);
            if (void 0 !== l)
                return l
        }
    }
    ;
    d.ResetValue = function() {
        var e;
        b && (e = b());
        d.forEachOption(function(g) {
            void 0 === e && (e = g.value);
            if (g.defaultSelected)
                return e = g.value,
                !0
        });
        void 0 !== e && d.SetValue(e)
    }
    ;
    d.SetValue = function(e) {
        var g;
        d.forEachOption(function(h) {
            if (h.value == e)
                return g = h.value,
                !0;
            h.text == e && (g = h.value)
        });
        void 0 !== g && (d.GetElement().value = g)
    }
    ;
    d.GetRawValue = function() {
        return d.GetValue()
    }
    ;
    d.showOptions = function(e) {
        var g = d.GetValue(), h, l = !0;
        d.forEachOption(function(k) {
            var u = !e[k.value];
            $(k).prop("disabled", u);
            l || (l = k.value == g);
            !u && l && (h = k.value,
            l = !1)
        });
        g !== h && (d.GetElement().value = h)
    }
    ;
    d.replaceOptions = function(e) {
        for (var g = d.GetElement(), h = d.GetValue(), l; g.options.length; )
            g.remove(0);
        for (var k in e)
            BSAddSelectOption(g, k, e[k]),
            k == h && (l = !0);
        l && (g.value = h)
    }
    ;
    d.getOptions = function() {
        var e = {};
        d.forEachOption(function(g) {
            e[g.value] = g.innerHTML
        });
        return e
    }
}
function ElementAccessorDate(b) {
    function d(C, E) {
        return C ? Number(C.value) : E
    }
    function e(C, E) {
        C && (C.value = E)
    }
    function g(C, E) {
        C = C.toString();
        var J = 3 > C.length ? "000".substr(C.length) : "";
        return (E ? "" : J) + C + (E ? J : "")
    }
    function h(C) {
        for (; C.options.length; )
            C.remove(0)
    }
    function l(C, E, J, O, F) {
        if (C) {
            h(C);
            for (var K = 0; K < E; ++K) {
                var N = F && !K ? F : K;
                BSAddSelectOption(C, K, (O && 10 > N ? "0" : "") + N)
            }
            C.value = J
        }
    }
    var k = this, u = {
        y: "FullYear",
        m: "Month",
        d: "Date",
        h: "Hours",
        n: "Minutes",
        s: "Seconds",
        w: "Day",
        i: "Milliseconds"
    }, m = b & 8 ? 1 : 0, t = b & 16 ? 1 : 0, q = 0 != (b & 4096) || 0 == (b & 8192) && PCF.is12hourClock(), r = m ? function(C, E, J, O, F, K, N) {
        return new Date(Date.UTC(C, E, J, O, F, K, N))
    }
    : ldateCreator, w = {}, y = {}, B = {}, x;
    for (x in u) {
        var A = (m ? "UTC" : "") + u[x];
        w[x] = Date.prototype["get" + A];
        "w" != x && (y[x] = Date.prototype["set" + A]);
        m != t && (B[x] = Date.prototype["get" + (t ? "UTC" : "") + u[x]])
    }
    m == t && (B = w);
    k.YearsGap = 100;
    k.CenturyGap = 25;
    k.changeSources = function() {
        var C = k.GetControls(), E = [], J;
        for (J in C)
            C[J] && E.push(C[J]);
        return E
    }
    ;
    k.GetElement = function() {
        return document.getElementById(k.id)
    }
    ;
    k.GetControls = function() {
        k.ctrls || (k.ctrls = {
            d: document.getElementById(k.id + "_day"),
            m: document.getElementById(k.id + "_month"),
            y: document.getElementById(k.id + "_year"),
            c: document.getElementById(k.id + "_century"),
            h: document.getElementById(k.id + "_hour"),
            n: document.getElementById(k.id + "_minute"),
            s: document.getElementById(k.id + "_second"),
            i: document.getElementById(k.id + "_millisecond"),
            a: document.getElementById(k.id + "_ampm")
        });
        return k.ctrls
    }
    ;
    k.GetValue = function() {
        var C = k.GetControls()
          , E = Number(C.y ? C.y.value : C.c ? C.c.value : 0)
          , J = r(E, d(C.m, 0), d(C.d, 1), d(C.h, 0) + (q ? 12 * d(C.a, 0) : 0), d(C.n, 0), d(C.s, 0), Number(g(d(C.i, "0"), !0)));
        0 <= E && 100 > E && (y.y.call(J, E),
        C.m && y.m.call(J, C.m.value),
        C.d && y.d.call(J, C.d.value));
        return J
    }
    ;
    k.GetRawValue = function() {
        return k.GetValue()
    }
    ;
    var D = new Date;
    k.ResetValue = function() {
        k.SetValue(D)
    }
    ;
    k.SetValue = function(C) {
        C = new Date(String2Date(C));
        var E = k.GetControls();
        e(E.m, w.m.call(C));
        e(E.d, w.d.call(C));
        var J = w.h.call(C);
        q ? (e(E.h, J),
        e(E.a, 11 < J ? 1 : 0)) : e(E.h, J);
        e(E.n, w.n.call(C));
        e(E.s, w.s.call(C));
        e(E.i, g(w.i.call(C)));
        k.UpdateY(C);
        k.UpdateD(C)
    }
    ;
    k.UpdateY = function(C) {
        var E = k.GetControls()
          , J = getFormattedMessage("b_c");
        J = J ? " " + J : "";
        C = w.y.call(C);
        if (E.y) {
            h(E.y);
            for (var O = -k.YearsGap; O <= k.YearsGap; ++O) {
                var F = C + O
                  , K = b & 1024 ? F.toString().slice(-2) : F;
                0 >= F && (K = 1 - F + J);
                BSAddSelectOption(E.y, F, K)
            }
            E.c || (E.y.value = C)
        }
        if (E.c) {
            h(E.c);
            for (O = -k.CenturyGap; O <= k.CenturyGap; ++O) {
                F = C + 100 * O;
                K = Math.floor((F - 1) / 100);
                if (0 <= K) {
                    var N = PCL.getOrdinal(K + 1);
                    K = N.replace("%1", K + 1)
                } else
                    N = PCL.getOrdinal(-K),
                    K = N.replace("%1", -K) + J;
                BSAddSelectOption(E.c, F, K)
            }
            E.c.value = C;
            E.y && (E.y.value = C)
        }
    }
    ;
    k.UpdateD = function(C) {
        var E = k.GetControls();
        if (E.d) {
            h(E.d);
            for (var J = 1; 31 >= J; ++J) {
                var O = new Date(C);
                y.d.call(O, J);
                if (w.m.call(C) != w.m.call(O))
                    break;
                var F = "";
                0 === (b & 64) && (F = getFormattedMessage((b & 2048 ? "l" : "") + "dow_" + w.w.call(O)) + " ");
                BSAddSelectOption(E.d, J, F + J)
            }
            E.d.value = w.d.call(C)
        }
    }
    ;
    k.init = function() {
        var C = document.getElementById(k.id + "_ampm");
        C && (q ? $(C).parent().removeClass("x") : $(C).parent().addClass("x"));
        var E = document.getElementById(k.id).getAttribute("data-value");
        "" != E ? E = String2Date(E, r) : (E = new Date,
        w != B && (E = r(B.y.call(E), B.m.call(E), B.d.call(E), B.h.call(E), B.n.call(E), B.s.call(E), B.i.call(E))));
        D = E;
        k.Initialize(E, q && C);
        var J = k.GetControls()
          , O = function(F) {
            var K = new Date(k.GetValue());
            F.currentTarget == J.c && y.y.call(K, J.c.value);
            F.currentTarget != J.d && k.UpdateY(K);
            k.UpdateD(K)
        };
        [J.c, J.y, J.m].forEach(function(F) {
            F && F.addEventListener("change", O)
        })
    }
    ;
    k.Initialize = function(C, E) {
        var J = k.GetControls()
          , O = w.h.call(C);
        E ? (l(J.h, 12, O % 12, 0, 12),
        J.a.value = 11 < O ? 1 : 0) : l(J.h, 24, O, 0);
        l(J.n, 60, w.n.call(C), 1);
        l(J.s, 60, w.s.call(C), 1);
        if (J.m) {
            h(J.m);
            if (b & 1024)
                for (E = 0; 12 > E; ++E)
                    BSAddSelectOption(J.m, E, leftpad(E + 1, "0", 2));
            else
                for (E = !1,
                0 === (b & 2048) && (E = k.GetElement().parentNode.offsetWidth,
                E = 0 != (b & 16384) || 375 >= E),
                O = E ? "smon_" : (J.d ? "f" : "") + "mon_",
                E = 0; 12 > E; ++E)
                    BSAddSelectOption(J.m, E, getFormattedMessage(O + E));
            J.m.value = w.m.call(C)
        }
        J.i && (J.i.value = g(w.i.call(C)),
        J.i.addEventListener("keypress", function(F) {
            F = BSGetPressedKey(F);
            if ("undefined" == typeof F || 0 == F.charCode || BSIsSystemKey(F))
                return !0;
            F = F.charCode;
            if (48 > F || 57 < F)
                return !1;
            F = this.selectionStart;
            this.value = this.value.substr(0, F) + this.value.substr(F + 1);
            this.selectionEnd = F
        }, !1));
        k.UpdateY(C);
        k.UpdateD(C)
    }
}
function ElementAccessorSlider(b) {
    function d(l) {
        var k = g.root_.getAttribute("aria-controls");
        k && (k = document.getElementById(k)) && (k.innerHTML = k.innerHTML.replace(/\d+/, l))
    }
    var e = this
      , g = null;
    b = 50;
    var h = null;
    e.addEventListener = function(l, k) {
        "change" == l && (h = k)
    }
    ;
    e.init = function() {
        g = PLANETCALC.slider(e.GetElement());
        b = g.value;
        g.root_.addEventListener("MDCSlider:change", function(l) {
            g.value = l.detail.value;
            d(g.value);
            h && h()
        })
    }
    ;
    e.layout = function() {
        g.layout()
    }
    ;
    e.changeSources = function() {
        return [e]
    }
    ;
    e.GetElement = function() {
        return document.getElementById(e.id)
    }
    ;
    e.ResetValue = function() {
        g.value = b;
        setTimeout(function() {
            g.layout();
            d(b)
        }, 0)
    }
    ;
    e.GetValue = function() {
        return g.value
    }
    ;
    e.SetValue = function(l) {
        g.value = l;
        setTimeout(function() {
            g.layout();
            d(g.value)
        }, 0)
    }
    ;
    e.GetParent = function() {
        return e.GetElement()
    }
    ;
    e.GetRawValue = function() {
        return e.GetValue()
    }
}
function ElementAccessorPrecision(b) {
    var d = this
      , e = null;
    d.init = function() {
        e = PLANETCALC.slider(d.GetElement());
        e.root_.addEventListener("MDCSlider:change", function(g) {
            PCF.changeCalcPrecision2(g.detail.value)
        });
        void 0 !== b && PCF.setDefaultPrecision(b);
        PCF.addPrecisionControl(e)
    }
    ;
    d.layout = function() {
        e.layout()
    }
    ;
    d.changeSources = function() {
        return [window.PCF]
    }
    ;
    d.GetElement = function() {
        return document.getElementById(d.id)
    }
    ;
    d.ResetValue = function() {}
    ;
    d.GetValue = function() {
        return e.value
    }
    ;
    d.SetValue = function(g) {
        e.value = g
    }
    ;
    d.GetParent = function() {
        return d.GetElement()
    }
    ;
    d.GetRawValue = function() {
        return d.GetValue()
    }
}
function ElementAccessorResource() {
    var b = this;
    b.GetElement = function() {
        return document.getElementById(b.id)
    }
    ;
    b.ResetValue = function() {}
    ;
    b.GetValue = function() {
        return eval("(" + b.id + "_data)")
    }
    ;
    b.SetValue = function(d) {}
    ;
    b.GetRawValue = function() {
        return null
    }
}
function ElementAccessorDegrees() {
    function b(u, m) {
        var t = Number(u.value);
        if (!(60 > t))
            for (var q = 0; q < m.length; ++q) {
                var r = Math.floor(t)
                  , w = r % 60;
                u.value = t - r + w;
                t = (r - w) / 60;
                u = m[q];
                u.value = t
            }
    }
    function d(u, m) {
        var t = .5;
        m && (t /= Math.pow(60, m));
        (m = PCF.getCalcPrecision()) && (t /= Math.pow(10, m));
        u -= Math.round(u);
        0 > u && (u = -u);
        return u < t
    }
    function e(u, m) {
        var t = Number(u.value);
        if (d(t, m.length))
            u.value = Math.round(t);
        else
            for (var q = 0; q < m.length; ++q) {
                if (d(t, m.length - q))
                    u.value = Math.round(t),
                    t = 0;
                else {
                    var r = Math.floor(t);
                    u.value = r;
                    t = 60 * (t - r)
                }
                u = m[q];
                q == m.length - 1 && (u.value = PCF.format("%1", t))
            }
    }
    var g = this;
    g.inheritFrom = ElementWithMessage;
    g.inheritFrom();
    var h = null;
    g.getDegreeControls = function() {
        h || (h = [document.getElementById(g.id + "_deg"), document.getElementById(g.id + "_min"), document.getElementById(g.id + "_sec")]);
        return h
    }
    ;
    g.changeSources = function() {
        return g.getDegreeControls()
    }
    ;
    var l = new ValidatorNumber(!1,!0)
      , k = null;
    g.calculateDegreeValue = function() {
        var u = 1
          , m = 0;
        h.forEach(function(t) {
            m += Number(t.value) / u;
            u *= 60
        });
        return m
    }
    ;
    g.calculateValue = function() {
        return g.calculateDegreeValue()
    }
    ;
    g.storeValue = function() {
        document.getElementById(g.id + "_value").value = g.calculateValue()
    }
    ;
    g.getDegreeChangeProcessors = function() {
        k || (k = [function(u) {
            u = e(u, [h[1], h[2]]);
            g.storeValue();
            return u
        }
        , function(u) {
            var m = b(u, [h[0]]);
            m |= e(u, [h[2]]);
            g.storeValue();
            return m
        }
        , function(u) {
            u = b(u, [h[1], h[0]]);
            g.storeValue();
            return u
        }
        ]);
        return k
    }
    ;
    g.changeProcessors = function() {
        return g.getDegreeChangeProcessors()
    }
    ;
    g.GetElement = function() {
        return document.getElementById(g.id)
    }
    ;
    g.ResetValue = function() {
        var u = document.getElementById(g.id + "_value");
        g.SetValue(u.defaultValue)
    }
    ;
    g.GetValue = function() {
        var u = document.getElementById(g.id + "_value");
        return Number(u.value)
    }
    ;
    g.SetValue = function(u) {
        g.SetDegreesValue(u)
    }
    ;
    g.SetDegreesValue = function(u) {
        document.getElementById(g.id + "_value").value = u;
        u = Number(u);
        var m = "";
        0 > u && (u = -u,
        m = "-");
        document.getElementById(g.id + "_sec").value = Math.floor(3600 * u) % 60;
        document.getElementById(g.id + "_min").value = Math.floor(60 * u) % 60;
        document.getElementById(g.id + "_deg").value = m + Math.floor(Number(u))
    }
    ;
    g.GetRawValue = function() {
        return g.GetValue()
    }
    ;
    g.init = function() {
        g.changeSources();
        h.forEach(function(u) {
            u.addEventListener("keypress", function(m) {
                if (l && !handleOnKeyPressed(m, m.currentTarget, l, g))
                    return m.preventDefault && m.preventDefault(),
                    !1
            })
        })
    }
}
function ElementAccessorCoordinate() {
    var b = this;
    b.inheritFrom = ElementAccessorDegrees;
    b.inheritFrom();
    var d, e;
    b.changeSources = function() {
        d || (d = b.getDegreeControls().slice(),
        d.push(document.getElementById(b.id + "_side1")),
        d.push(document.getElementById(b.id + "_side2")));
        return d
    }
    ;
    b.changeProcessors = function() {
        if (!e) {
            e = b.getDegreeChangeProcessors().slice();
            var g = function() {
                b.storeValue()
            };
            e.push(g, g)
        }
        return e
    }
    ;
    b.calculateValue = function() {
        var g = b.calculateDegreeValue();
        d[4].checked && (g = -g);
        return g
    }
    ;
    b.SetValue = function(g) {
        var h = Number(g);
        d[3].checked = 0 <= h;
        d[4].checked = 0 > h;
        0 > h && (h = -h);
        b.SetDegreesValue(h);
        document.getElementById(b.id + "_value").value = g
    }
}
function ElementAccessorSelectImage(b) {
    function d() {
        e.control || (e.control = PLANETCALC.select(e.GetElement()),
        e.control.listen("MDCSelect:change", function() {
            e.value = e.control.value;
            g && g()
        }))
    }
    var e = this;
    e.initialvalue = b;
    e.value = b;
    e.created = !1;
    e.changeSources = function() {
        return [e]
    }
    ;
    var g = null;
    e.addEventListener = function(h, l) {
        "change" == h && (g = l)
    }
    ;
    e.GetElement = function() {
        return document.getElementById(e.id)
    }
    ;
    e.ResetValue = function() {
        e.SetValue(e.initialvalue)
    }
    ;
    e.GetValue = function() {
        d();
        return e.value
    }
    ;
    e.GetRawValue = function() {
        return e.GetValue()
    }
    ;
    e.SetValue = function(h) {
        d();
        e.control.value = h
    }
    ;
    e.GetParent = function() {
        return e.GetElement().parentNode.parentNode
    }
}
function ElementAccessorButton(b) {
    var d = this;
    d.inheritFrom = ElementAccessorDefault;
    d.inheritFrom();
    d.init = function() {
        d.GetElement().addEventListener("click", b)
    }
}
function ElementAccessorOperation() {
    var b = this;
    b.inheritFrom = ElementAccessorDefault;
    b.inheritFrom();
    b.commandSources = function() {
        return [b.GetElement()]
    }
}
function ElementAccessorTab() {
    function b(h) {
        d.GetElement().value = h.getAttribute("data-id")
    }
    var d = this;
    d.inheritFrom = ElementAccessorDefault;
    d.inheritFrom();
    var e = null
      , g = null;
    d.changeSources = function() {
        if (!e) {
            e = [];
            for (var h = d.GetElement().parentNode.getElementsByTagName("a"), l = 0; l < h.length; l++)
                e.push(h[l])
        }
        return e
    }
    ;
    d.changeProcessors = function() {
        if (!g) {
            var h = d.changeSources();
            g = [];
            h.forEach(function() {
                g.push(b)
            })
        }
        return g
    }
}
function ElementAccessorSubmit() {
    var b = this;
    b.inheritFrom = ElementAccessorDefault;
    b.inheritFrom();
    var d = null;
    b.init = function(e) {
        d = e;
        b.GetElement().addEventListener("click", function() {
            d.Validate() && d.GetElement().submit()
        })
    }
}
function getControlValueAfterChange(b, d) {
    var e = BSGetTextSelection(d);
    d = d.value;
    var g = d.substring(0, e.selectionStart);
    b.charCode == BACK_SPACE_ASCII_CODE ? g.length && (g = g.substring(0, g.length - 1)) : b.charCode && (g += String.fromCharCode(b.charCode));
    return g += d.substring(e.selectionEnd, d.length)
}
function handleOnKeyPressed(b, d, e, g) {
    var h = BSGetPressedKey(b);
    g && g.ClearError && g.ClearError(d);
    if ("undefined" == typeof h || h.charCode == BACK_SPACE_ASCII_CODE || h.charCode == ENTER_ASCII_CODE || h.charCode == TAB_ASCII_CODE || 0 == h.charCode || BSIsSystemKey(h))
        return !0;
    h = getControlValueAfterChange(h, d);
    return (e = e.Validate(h)) && g && g.ShowMessage ? (g.ShowMessage(e),
    BSPreventDefaultAction(b)) : showOrClearError(d, e, g) ? !0 : BSPreventDefaultAction(b)
}
function ElementAccessorH() {
    this.inheritFrom = ElementAccessorDefault;
    this.inheritFrom();
    var b = this.SetValue;
    this.SetValue = function(d) {
        void 0 !== d && b(d)
    }
}
function ElementAccessorCheckboxList(b, d) {
    function e(m) {
        var t = 0
          , q = 0
          , r = 0
          , w = m.width();
        m.children("div.h2").each(function(x) {
            t++;
            x = $(this);
            var A = x.children("label").width() + 40;
            q < A && (q = A);
            x = x.outerHeight(!0);
            r < x && (r = x)
        });
        for (var y = l, B = Math.ceil(t / y); B * q >= w && 1 < B; )
            y += k,
            B = Math.ceil(t / y);
        m.height(y > t ? t * r : y * r)
    }
    function g(m) {
        var t = [];
        m.currentTarget.className.split(/\s+/).forEach(function(q) {
            "quick-pick-" == q.substr(0, 11) && t.push(q.substr(11))
        });
        h.forEach(function(q) {
            q.checked = -1 != t.indexOf(q.value)
        });
        return !1
    }
    var h = this
      , l = void 0 === b ? 5 : b
      , k = void 0 === d ? 5 : d;
    h.forEachPick = function(m) {
        $(h.GetElement()).parents("div.v8").parent().find(".quick-pick").each(function(t, q) {
            m(q)
        })
    }
    ;
    h.changeSources = function() {
        var m = [];
        h.forEach(function(t) {
            m.push(t)
        });
        return m
    }
    ;
    h.commandSources = function() {
        var m = [];
        h.forEachPick(function(t) {
            m.push(t)
        });
        return m
    }
    ;
    h.GetElement = function() {
        return document.getElementById(h.id + "0")
    }
    ;
    h.forEach = function(m) {
        for (var t = 0; ; ) {
            var q = document.getElementById(h.id + t++);
            if (!q)
                break;
            m(q)
        }
    }
    ;
    h.GetValue = function() {
        var m = {};
        h.forEach(function(t) {
            m[t.value] = !!t.checked
        });
        return m
    }
    ;
    h.ResetValue = function() {
        h.forEach(function(m) {
            m.checked = m.defaultChecked
        })
    }
    ;
    h.SetValue = function(m) {
        if ("string" === typeof m)
            try {
                if ("{" == m.substr(1, 1))
                    m = JSON.parse(m);
                else {
                    var t = m.split(" ");
                    m = {};
                    h.forEach(function(q) {
                        m[q.value] = -1 != t.indexOf(q.value)
                    })
                }
            } catch (q) {
                m = {}
            }
        h.forEach(function(q) {
            q.checked = m[q.value]
        })
    }
    ;
    h.GetParent = function() {
        return h.GetElement().parentNode.parentNode
    }
    ;
    h.GetRawValue = function() {
        return h.GetValue()
    }
    ;
    var u;
    h.init = function() {
        u = $(h.GetElement()).parents("div.n8");
        $(window).on("resize", function() {
            e(u)
        });
        e(u);
        h.forEachPick(function(m) {
            $(m).on("click", g)
        })
    }
    ;
    h.layout = function() {
        u && e(u)
    }
}
function DialogInput(b, d, e, g, h) {
    function l(q, r) {
        g[q + "Sources"] && g[q + "Sources"].call(g).forEach(r)
    }
    var k = this;
    k.inheritFrom = ElementWithMessage;
    k.inheritFrom();
    k.id = b;
    k.dialog = d;
    k.validator = e;
    k.validatorKP = h;
    k.formatter = null;
    k.elementAccessor = g;
    k.elementAccessor.id = d.id + "_" + k.id;
    var u = {}
      , m = !1;
    k.elementAccessor.init && k.elementAccessor.init(d, function() {
        m = !0;
        if (u.oninit)
            u.oninit(k.id)
    });
    var t = k.elementAccessor.changeProcessors ? k.elementAccessor.changeProcessors() : 0;
    l("change", function(q, r) {
        q.addEventListener("change", function(w) {
            if (t && t[r])
                t[r](q);
            var y = !0;
            k.validator && (y = k.Validate(k.GetValue()));
            y && void 0 !== u.onchanged && (w && k.ClearError(w.currentTarget),
            u.onchanged(k.id, w))
        })
    });
    l("command", function(q) {
        q.addEventListener("click", function(r) {
            if (void 0 !== u.oncommand)
                u.oncommand(k.id, r);
            r && r.preventDefault && r.preventDefault();
            return !1
        })
    });
    l("keypress", function(q) {
        q.addEventListener("keypress", function(r) {
            if (k.validatorKP) {
                if (!handleOnKeyPressed(r, r.currentTarget, k.validatorKP, k))
                    return r.preventDefault && r.preventDefault(),
                    !1
            } else
                r && k.ClearError(r.currentTarget);
            if (u.onkeypressed)
                u.onkeypressed(k.id, r);
            return !0
        })
    });
    k.addHandler = function(q) {
        u = q;
        if (m && u.oninit)
            u.oninit(k.id)
    }
    ;
    k.GetElement = function() {
        return k.elementAccessor.GetElement()
    }
    ;
    k.GetElementAccessor = function() {
        return k.elementAccessor
    }
    ;
    k.ResetValue = function() {
        k.elementAccessor.ResetValue()
    }
    ;
    k.SetValue = function(q) {
        k.formatter && k.formatter.FormatAsync ? k.formatter.FormatAsync(q, k.elementAccessor) : (q = k.formatter ? k.formatter.Format(q) : q,
        k.elementAccessor.SetValue(q))
    }
    ;
    k.GetValue = function(q) {
        return k.elementAccessor.GetValue()
    }
    ;
    k.GetRawValue = function(q) {
        return k.elementAccessor.GetRawValue()
    }
    ;
    k.GetParent = function() {
        if (k.elementAccessor.GetParent)
            return k.elementAccessor.GetParent();
        var q = k.GetElement();
        return q ? q.parentNode : null
    }
    ;
    k.ShowError = function(q, r) {
        if (k.elementAccessor.ShowError)
            return k.elementAccessor.ShowError(q);
        var w = k.GetParent();
        if (!w)
            return !0;
        $(w).addClass("k8");
        r && (r = $(r),
        r.hasClass("mdc-textfield__input") ? r.parent().addClass("k8") : r.addClass("k8"));
        k.ShowMessage(q);
        return !0
    }
    ;
    k.ClearError = function(q) {
        if (k.elementAccessor.ClearError)
            return k.elementAccessor.ClearError();
        var r = k.GetParent();
        r && ($(r).removeClass("k8"),
        q && (q = $(q),
        q.hasClass("mdc-textfield__input") ? q.parent().removeClass("k8") : q.removeClass("k8")),
        (q = k.getMsgElement()) && q.hasAttribute("data-original") && (q.innerHTML = q.getAttribute("data-original")))
    }
    ;
    k.ShowOrClearError = function(q) {
        if ("" == q)
            return k.ClearError(),
            !0;
        if (u.onError)
            u.onError({
                source: k.id,
                message: q
            });
        else
            k.ShowError(q);
        return !1
    }
    ;
    k.Validate = function(q) {
        if (k.validator)
            return q = k.elementAccessor.GetRawValue ? k.elementAccessor.GetRawValue() : k.elementAccessor.GetValue(),
            k.ShowOrClearError(k.validator.Validate(q));
        k.ClearError();
        return !0
    }
    ;
    k.ValidateCurrent = function() {
        return k.validator ? k.Validate(k.GetValue()) : !0
    }
    ;
    k.GetOptions = function() {
        for (var q = k.GetElement().childNodes, r = [], w = 0; w < q.length; ++w) {
            var y = q[w];
            "OPTION" == y.nodeName && (r[r.length] = y.value,
            r[r.length] = y.firstChild.nodeValue)
        }
        return r
    }
    ;
    k.Load = function(q) {
        var r = k.GetElement().name;
        r && (q = q[r],
        "undefined" != typeof q && k.SetValue(q))
    }
}
function DisplayWrapper(b) {
    this.Display = function(d) {
        b && (d ? b.Show() : b.Hide())
    }
}
function DisplayWrapperInput(b) {
    this.inheritFrom = DisplayWrapper;
    this.inheritFrom(b);
    this.GetValue = function() {
        return b.GetValue()
    }
}
function DisplayWrapperOpt(b) {
    this.inheritFrom1 = DisplayWrapperInput;
    this.inheritFrom1(b);
    this.DisplayOptions = function(d) {
        b.GetElementAccessor().showOptions(d)
    }
    ;
    this.ReplaceOptions = function(d, e) {
        b.GetElementAccessor().replaceOptions(d, e)
    }
    ;
    this.GetOptions = function() {
        return b.GetElementAccessor().getOptions()
    }
}
function ElementAccessorSmallSelect(b) {
    var d = this
      , e = null;
    d.changeSources = function() {
        return [d]
    }
    ;
    var g = null;
    d.addEventListener = function(h, l) {
        "change" == h && (g = l)
    }
    ;
    d.init = function() {
        d.GetElement().defaultValue = d.GetValue();
        var h = document.getElementById(d.id + "_menu");
        e = PLANETCALC.menu(h);
        $(d.GetElement()).find("a").on("click", function(l) {
            e.open ? e.open = !1 : e.showNear(d.GetElement());
            l.preventDefault && l.preventDefault();
            return !1
        });
        $(h).find("li").on("click", function(l) {
            d.SetValue($(l.currentTarget).data("value"));
            g && g()
        })
    }
    ;
    d.GetElement = function() {
        return document.getElementById(d.id)
    }
    ;
    d.GetValue = function() {
        return d.GetRawValue()
    }
    ;
    d.GetRawValue = function() {
        var h = d.GetElement();
        if (h)
            return $(h).find(".pc-small-select-value").data("value")
    }
    ;
    d.ResetValue = function() {
        var h = d.GetElement();
        h && void 0 !== h.defaultValue && (h.value = h.defaultValue)
    }
    ;
    d.SetValue = function(h) {
        var l = d.GetElement();
        l = $(l).find(".pc-small-select-value");
        l.data("value", h);
        l.text(b[h])
    }
}
function ElementAccessorHidden() {
    var b = this, d;
    b.inheritFrom = ElementAccessorDefault;
    b.inheritFrom();
    b.init = function() {
        d = b.GetElement().value
    }
    ;
    b.ResetValue = function() {
        b.GetElement().value = d
    }
}
var PSS = function() {
    function b() {
        if (d)
            return d;
        var e = (new String(document.URL)).split(/\?|#/)
          , g = {};
        if (1 < e.length) {
            var h = e[1].split("&");
            for (e = 0; e < h.length; ++e) {
                var l = h[e].split("=")
                  , k = l[0];
                l = 2 == l.length ? decodeURIComponent(l[1]) : "";
                g[k] ? g[k].push(l) : g[k] = [l]
            }
            h = self.MathSolvers;
            if (void 0 !== h && h.length)
                for (e = 0; e < h.length; ++e)
                    if (k = h[e],
                    k.keys.reduce(function(t, q) {
                        return t && g[q]
                    }, !0))
                        try {
                            var u = k.solver.apply(k, k.keys.map(function(t) {
                                return g[t][0]
                            }));
                            k.keys.forEach(function(t) {
                                delete g[t]
                            });
                            for (var m in u)
                                g[m] = [u[m]];
                            break
                        } catch (t) {}
            for (m in g)
                g[m] = g[m].map(function(t) {
                    var q = t.length ? t.substr(0, 1) : ""
                      , r = t.length ? t.substr(t.length - 1) : "";
                    try {
                        return "{" == q && "}" == r || "[" == q && "]" == r ? JSON.parse(t) : t
                    } catch (w) {
                        return t
                    }
                })
        }
        return d = g
    }
    var d = null;
    return {
        LoadInput: function() {},
        copyFrom: function(e) {
            $(e).select();
            document.execCommand("copy");
            PLANETCALC.snackbar($("#copied_msg")[0])
        },
        getInputValues: function(e) {
            var g = window.CurrentPageCalculators
              , h = 0;
            if (g && 1 < g.length)
                for (var l = 0; l < g.length; ++l)
                    if (g[l].CalculatorID == e) {
                        h = l;
                        break
                    }
            e = [];
            if (h)
                for (l = 0; l < g.length; ++l)
                    e.push(g[l].GetInputValues());
            g = {};
            var k = b(), u;
            for (u in k) {
                var m = k[u].length
                  , t = 1 < m ? h : 0;
                for (l = h; 0 <= l && t; --l)
                    void 0 === e[l][u] && --t;
                g[u] = k[u][t >= m ? m - 1 : t]
            }
            return g
        },
        utfSize: function(e) {
            var g = encodeURIComponent(e).match(/%[89ABab]/g);
            return e.length + (g ? g.length : 0)
        },
        getShareDataMethod: function(e) {
            for (var g = window.CurrentPageCalculators, h = "", l = 0; l < g.length; ++l) {
                var k = g[l];
                k = k.getInputData();
                h += ("" == h ? "?" : "&") + SaveObjectToURLParams(k)
            }
            if (2E3 >= h.length)
                return {
                    type: "u",
                    size: h.length,
                    data: h
                };
            var u = h = 0;
            for (l = 0; l < g.length && 65535 > h; ++l)
                if (void 0 === e || e == g[l].CalculatorID)
                    k = g[l],
                    k = PSS.utfSize(JSON.stringify(k.getInputData())),
                    k > h && (u = g[l].CalculatorID,
                    h = k);
            return {
                type: 65535 < h ? "n" : "s",
                size: h,
                id: u,
                max: 65535
            }
        },
        getHRSize: function(e) {
            for (var g = ["b", "Kb", "Mb", "Gb"], h = 0; h < g.length - 1 && 1024 <= e; ++h)
                e /= 1024;
            return Math.round(e) + g[h]
        },
        Sharer: function(e, g) {
            function h(r, w, y) {
                var B = $(".share_data_msg");
                B.html(y);
                w ? B.addClass("k8") : B.removeClass("k8");
                if (r != t) {
                    var x = $(".social-share .share-title").find(".share-subject");
                    q || (q = x.html());
                    x.css("text-decoration", "line-through");
                    var A = r ? q : e;
                    x.fadeTo(500, 0, function() {
                        x.css("text-decoration", "none");
                        x.html(A);
                        x.fadeTo(500, 1)
                    });
                    t = r
                }
            }
            function l(r) {
                var w = "";
                if (r) {
                    var y = PSS.getShareDataMethod();
                    switch (y.type) {
                    case "u":
                        w = y.data;
                        h(!1, !1, "");
                        break;
                    case "s":
                        h(!0, !1, formatMessage(g, PSS.getHRSize(y.size)));
                        $(".save_data_link").on("click", function() {
                            BSScrollToElement($("#user_data_" + y.id), function() {
                                var x = $(".pc-btn-new");
                                $({
                                    i: 10
                                }).animate({
                                    i: 0
                                }, {
                                    duration: 0,
                                    step: function(A) {
                                        x.css({
                                            transform: "rotate(" + 4.5 * Math.sin(A) * A + "deg)"
                                        })
                                    }
                                })
                            });
                            return !1
                        });
                        break;
                    case "n":
                        h(!0, !0, formatMessage(PCL.err_data_too_long, PSS.getHRSize(y.size), PSS.getHRSize(y.max)))
                    }
                } else
                    h(!0, !1, "");
                for (var B in u)
                    $("." + B).attr("href", u[B] + encodeURIComponent(w));
                $(".share-url-text input").val(document.URL.split(/\?|#/)[0] + w);
                return "" != w
            }
            function k() {
                PSS.copyFrom(".share-url-text input")
            }
            var u = {}
              , m = !1
              , t = !0
              , q = null;
            $(".pc-social-share").each(function() {
                u[$(this).data("origin")] = this.href
            });
            $(".share-url-text").find("input,button").on("click", function() {
                k()
            });
            $(".pc-btn-link").on("click", function() {
                $(".share-switch input:visible").prop("checked") || $(".share-switch input:visible").trigger("click");
                $(".share-url-text").hasClass("x") || k()
            });
            $(".share-switch input").on("change", function() {
                var r = l(this.checked);
                $(".share-url-text").toggleClass("x", !(r && this.checked));
                if (this.checked && !m) {
                    m = !0;
                    var w = this;
                    for (r = 0; r < window.CurrentPageCalculators.length; ++r)
                        window.CurrentPageCalculators[r].addEventListener("change", function() {
                            l(w.checked)
                        })
                }
            })
        },
        adaptArray: function(e, g) {
            return e.map(function(h) {
                return PSS.adaptRecord(h, g)
            })
        },
        adaptRecord: function(e, g) {
            var h = {}, l;
            for (l in e)
                h[l] = g && g[l] ? g[l](e[l]) : e[l];
            return h
        },
        adapter: function(e) {
            function g(h) {
                return h
            }
            return e ? new function(h) {
                this.decode = function(l) {
                    return PSS.adaptRecord(l, h.decoder)
                }
                ;
                this.encode = function(l) {
                    return PSS.adaptRecord(l, h.encoder)
                }
            }
            (e) : {
                encode: g,
                decode: g
            }
        },
        getLanguage: function() {
            for (var e = window.navigator.language.split(","); 0 < e.length; )
                return e[0].split("-")[0].toLowerCase();
            return PCL.language_id
        },
        getCountry: function() {
            for (var e = window.navigator.language.split(","), g = 0; g < e.length; ++g) {
                var h = e[g].split("-");
                if (1 < h.length)
                    return h[1]
            }
            return "en" == PCL.language_id ? "US" : PCL.language_id.toUpperCase()
        }
    }
}()
  , PCF = function() {
    function b(q, r) {
        if (q.childNodes)
            for (var w in q.childNodes) {
                var y = q.childNodes[w];
                if (1 == y.nodeType) {
                    var B = y.getAttribute("data-precision");
                    "" === B || null === B ? b(y, r) : r(y, Number(B))
                }
            }
    }
    var d, e = [], g = [], h = [], l, k = null, u = "R", m = !1, t = -1;
    return {
        advisePrecisionmeter: function(q, r, w) {
            void 0 === d && (l = d = r);
            e[e.length] = q;
            h[h.length] = w;
            b(q, function(y, B) {
                BSAdviseEvent(y, "click", PCF.changeCalcPrecision, B)
            });
            b(q, function(y, B) {
                "Plus" != B && "Minus" != B && (y.className = Number(B) <= r ? "selected" : "")
            })
        },
        changeCalcPrecision: function(q) {
            var r = Number(d);
            "Plus" == q ? r < PCF.getMaxPrecision() && (r += 1) : "Minus" == q ? 0 < r && --r : r = Number(q);
            d = r;
            for (q = 0; q < e.length; ++q) {
                r = e[q];
                var w = eval(h[q]);
                b(r, function(y, B) {
                    "Plus" != B && "Minus" != B && (y.className = Number(B) <= d ? "selected" : "")
                });
                w.onchanged("precisionmeter")
            }
        },
        setDefaultPrecision: function(q) {
            void 0 === d && (l = d = q)
        },
        addEventListener: function(q, r) {
            h[h.length] = r
        },
        getMaxPrecision: function() {
            return 20
        },
        getResultsSet: function() {
            return u
        },
        setResultsSet: function(q) {
            if (q !== u)
                for (u = q,
                $("[name=precisionmeter_resultset]").val(q),
                q = 0; q < h.length; ++q)
                    try {
                        (0,
                        h[q])()
                    } catch (r) {}
        },
        getCalcPrecision: function() {
            return void 0 === d ? 2 : d
        },
        setCalcPrecision: function(q) {
            d = q
        },
        getDefaultPrecision: function() {
            return l
        },
        format: function(q) {
            for (var r = q, w = 1; w < arguments.length; ++w) {
                var y = arguments[w];
                "number" == typeof y && void 0 !== d && Math.round(y) != y && (y = y.toFixed(d));
                r = r.replace("%" + w, y)
            }
            return r
        },
        changeCalcPrecision2: function(q) {
            d = q;
            for (var r = 0; r < h.length; ++r)
                (0,
                h[r])();
            for (r = 0; r < g.length; ++r) {
                var w = g[r];
                w.value = q;
                if (w = w.root_.getAttribute("aria-controls"))
                    if (w = document.getElementById(w))
                        w.innerHTML = PCL.digits_afterdot.replace("%1", q)
            }
        },
        addPrecisionControl: function(q) {
            g.push(q)
        },
        getPrecisionControls: function() {
            return g
        },
        htmlEntities: function(q) {
            return String(q).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        },
        formatRecords: function(q, r, w, y) {
            for (var B = [], x = w; x < q.length && x < w + y; ++x) {
                for (var A = [], D = 0; D < r.length; ++D) {
                    var C = r[D];
                    A[D] = C.formatter ? C.formatter.Format(C.name, q[x]) : PCF.htmlEntities(q[x][C.name]);
                    void 0 === A[D] && (A[D] = "")
                }
                B.push(A)
            }
            return B
        },
        getSortMethod: function(q, r, w) {
            var y = q[r];
            if (y.formatter && y.isNumeric)
                return w ? function(x, A) {
                    return x[y.name] - A[y.name]
                }
                : function(x, A) {
                    return A[y.name] - x[y.name]
                }
                ;
            var B = y.formatter ? y.formatter : new RecordFieldFormatterSame;
            return w ? function(x, A) {
                x = B.Format(y.name, x);
                A = B.Format(y.name, A);
                return x > A ? 1 : x < A ? -1 : 0
            }
            : function(x, A) {
                x = B.Format(y.name, x);
                A = B.Format(y.name, A);
                return x < A ? 1 : x > A ? -1 : 0
            }
        },
        sortRecords: function(q, r, w, y) {
            r = this.getSortMethod(r, w, y);
            q.sort(r)
        },
        insertSortedRecord: function(q, r, w, y, B) {
            if (0 > y && y >= r.length || void 0 === B || !q.length)
                return q.push(w),
                q.length - 1;
            var x = 0
              , A = q.length;
            for (r = this.getSortMethod(r, y, B); ; )
                if (y = A - x,
                y -= y % 2,
                y /= 2,
                y += x,
                B = r(w, q[y]),
                0 === B) {
                    x = y;
                    break
                } else if (0 < B) {
                    if (1 === A - x) {
                        x = y + 1;
                        break
                    }
                    x = y
                } else {
                    if (1 === A - x) {
                        x = y;
                        break
                    }
                    A = y
                }
            q.splice(x, 0, w);
            return x
        },
        htmlEncode: function(q) {
            k || (k = $("<div/>"));
            return k.text(q).html()
        },
        patchDate: function(q) {
            var r = {}, w;
            for (w in q) {
                var y = q[w];
                y instanceof Date ? r[w] = Date2String(y) : Array.isArray(y) ? r[w] = PCF.patchDateA(y) : r[w] = y && "object" === typeof y ? PCF.patchDate(y) : y
            }
            return r
        },
        patchDateA: function(q) {
            for (var r = [], w = 0; w < q.length; ++w)
                "object" == typeof q[w] ? r.push(this.patchDate(q[w])) : r.push(q[w]);
            return r
        },
        formatProfile: function(q) {
            if (!q.userid)
                return "";
            var r = (new FormatterTimeSpan).Format(TryString2Date(q.updated));
            return " " + formatMessage(PCL.userdata, q.username, r, q.userid)
        },
        requestFormulaUpdate: function(q) {
            void 0 === q && (q = !0);
            var r = m;
            m = q;
            return r
        },
        is12hourClock: function() {
            if (-1 === t) {
                for (var q = (new Date(2014,0,20,20,0)).toTimeString(), r = "", w = 0; w < q.length; ++w) {
                    var y = q.substr(w, 1);
                    if ("0" <= y && "9" >= y)
                        r += y;
                    else if ("" != r)
                        break
                }
                t = 20 == Number(r) ? 0 : 1
            }
            return t
        }
    }
}();
function GetDateParts(b, d, e) {
    return e ? [b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate(), b.getUTCHours(), b.getUTCMinutes(), b.getUTCSeconds(), b.getUTCMilliseconds()] : [b.getFullYear(), b.getMonth() + 1, b.getDate(), b.getHours(), b.getMinutes(), b.getSeconds(), b.getMilliseconds()]
}
function GetDateCentury(b, d) {
    b = Math.ceil((d ? b.getFullYear() : b.getUTCFullYear()) / 100);
    0 > b ? b = 1 - b : 0 == b && (b = 1);
    return PCL.getOrdinal(b).replace("%1", b) + " " + getFormattedMessage("century")
}
function FormatDate(b, d, e) {
    if ("0000-00-00 00:00:00" == d || !d)
        return "";
    d = "string" == typeof d ? String2Date(d) : new Date(d);
    var g = 6;
    -1 == b.search("%8") ? g = 4 : -1 == b.search("%9") && (g = 5);
    g = GetDateParts(d, g, e);
    var h = 0 >= g[0] ? " " + getFormattedMessage("b_c") : "";
    0 >= g[0] && (g[0] = 1 - g[0]);
    e = GetDateCentury(d, e);
    return formatMessage(b, leftpad(g[0], "0", 4), leftpad(g[1], "0", 2), leftpad(g[2], "0", 2), h, e, leftpad(g[3], "0", 2), leftpad(g[4], "0", 2), leftpad(g[5], "0", 2), leftpad(g[6], "0", 3))
}
function FormatAbsDegrees(b, d) {
    0 > b && (b = -b);
    var e = "";
    if (void 0 === b || isNaN(b))
        return "";
    d ? (b = Math.round(36E5 * b),
    e = (e = b % 1E3 / 1E3) ? e.toFixed(3).substr(1) : "",
    b = (b - b % 1E3) / 1E3) : b = Math.round(3600 * b);
    d = b % 60;
    b = (b - d) / 60;
    var g = b % 60;
    return (b - g) / 60 + "&#176;" + g + "'" + d + '"' + e
}
function FormatterDegrees(b) {
    this.Format = function(d) {
        d = Number(d);
        return (0 > d ? "-" : "") + FormatAbsDegrees(d, b)
    }
    ;
    this.isNumeric = !0
}
function FormatterCoordinate(b, d) {
    var e = "lat" == b ? ["latitudeN", "latitudeS"] : ["longitudeE", "longitudeW"];
    this.Format = function(g) {
        g = Number(g);
        var h = getFormattedMessage(e[0 > g ? 1 : 0]);
        return FormatAbsDegrees(g, d) + " " + h
    }
    ;
    this.isNumeric = !1
}
function FormatterDate() {
    this.Format = function(b) {
        return FormatDate(getFormattedMessage("date_format"), b)
    }
}
function FormatterBoolean() {
    this.Format = function(b) {
        return getFormattedMessage(b ? "yes" : "no")
    }
}
function FormatterDateFlags(b) {
    var d = b & 8
      , e = b;
    b = getFormattedMessage("date_format");
    var g = getFormattedMessage("date_time_format")
      , h = ["narrow", "short", "long"]
      , l = {
        weekday: h,
        era: h,
        year: ["numeric", "numeric", "numeric"],
        month: ["2-digit", "short", "long"],
        day: ["2-digit", "numeric", "numeric"]
    }
      , k = ["", b, "%6:%7", g, "%5", "%5 " + b, "%5 %6:%7", "%5 " + g];
    this.Format = function(u) {
        if ("0000-00-00 00:00:00" == u || !u)
            return "";
        var m = ""
          , t = (new Date).toLocaleString;
        if (t) {
            var q = "string" == typeof u ? String2Date(u) : new Date(u);
            u = e & 1 && 0 == (e & 512) && 0 >= q.getFullYear() ? " " + getFormattedMessage("b_c") : "";
            e & 4 && (m = GetDateCentury(q, d));
            var r = {};
            d && (r.timeZone = "UTC");
            if (e & 1) {
                var w = 64
                  , y = e & 1024 ? 0 : e & 2048 ? 2 : 1;
                ["weekday", "day", "month", "year"].forEach(function(x) {
                    0 == (e & w) && (r[x] = l[x][y]);
                    w <<= 1
                });
                m += ("" == m ? "" : " ") + q.toLocaleDateString(void 0, r) + u
            }
        } else
            m = FormatDate(k[e & 5], u);
        if (e & 2) {
            if (e & 12288 || !t)
                if (t || (e += PCF.is12hourClock() ? 4096 : 8192),
                t = d ? q.getUTCHours() : q.getHours(),
                u = d ? q.getUTCMinutes() : q.getMinutes(),
                u = ":" + leftpad(u, "0", 2),
                e & 32 && (u += ":" + leftpad(d ? q.getUTCSeconds() : q.getSeconds(), "0", 2)),
                e & 4096) {
                    var B = t % 12;
                    B || (B = 12);
                    u = B + u + " " + (11 < t ? PCL.pm : PCL.am)
                } else
                    u = t + u;
            else
                r = {},
                d && (r.timeZone = "UTC"),
                r.hour = "numeric",
                r.minute = "2-digit",
                e & 32 && (r.second = "2-digit"),
                u = q.toLocaleTimeString(void 0, r);
            e & 32768 && (u += "." + leftpad(d ? q.getUTCMilliseconds() : q.getMilliseconds(), "0", 3));
            m += ("" == m ? "" : " ") + u
        }
        return m
    }
}
function FormatterImage(b, d) {
    this.Format = function(e) {
        if (!e)
            return "";
        if (e.data && e.width && e.height) {
            var g = document.createElement("canvas");
            g.width = e.width;
            g.height = e.height;
            var h = g.getContext("2d");
            e = new ImageData(e.data,e.width,e.height);
            h.putImageData(e, 0, 0);
            return '<img src="' + g.toDataURL() + '" ' + (d ? 'class="' + d + '"' : "") + ' alt="' + b + '" title="' + b + '"/>'
        }
        return '<img src="' + e + '" ' + (d ? 'class="' + d + '"' : "") + ' alt="' + b + '" title="' + b + '"/>'
    }
}
function FormatterSimpleURL() {
    this.Format = function(b) {
        if ("" != b) {
            var d = b;
            "http" != d.substr(0, 4) && (d = "http://" + d);
            return '<a href="' + d + '" />' + b + "</a>"
        }
        return ""
    }
}
function FormatterDateOnly() {
    this.Format = function(b) {
        if ("0000-00-00 00:00:00" != b && b) {
            b = String2Date(b);
            var d = b.getTime();
            d -= 6E4 * b.getTimezoneOffset();
            b.setTime(d);
            return b.getFullYear() + "." + (10 > b.getMonth() + 1 ? "0" + (b.getMonth() + 1) : b.getMonth() + 1) + "." + b.getDate()
        }
        return ""
    }
}
function FormatterTimeSpan() {
    function b(d, e) {
        e = Math.round(e);
        d = d + "_ago_" + PCL.cardinalIR(e);
        return getFormattedMessage(d, e)
    }
    this.Format = function(d) {
        if ("0000-00-00 00:00:00" != d && d) {
            d = String2Date(d);
            var e = d.getTime();
            e -= 6E4 * d.getTimezoneOffset();
            d.setTime(e);
            d = d.getTime();
            d = (new Date).getTime() - d;
            0 > d && (d = 0);
            return 36E5 > d ? b("minutes", d / 6E4) : 864E5 > d ? b("hours", d / 36E5) : 26784E5 > d ? b("days", d / 864E5) : 321408E5 > d ? b("months", d / 26784E5) : b("years", d / 321408E5)
        }
        return ""
    }
}
function FormatterMap(b) {
    var d = b[0];
    if (1 < b.length) {
        d = {};
        for (var e = 0; e < b.length; e += 2)
            d[b[e]] = b[e + 1]
    }
    this.Format = function(g) {
        var h = d[g];
        return void 0 === h ? g : h
    }
}
function DoubleFormatterMap(b) {
    for (var d = this, e = [], g = 0; g < b.length; g += 2)
        e[b[g]] = b[g + 1];
    d.Formatter = new FormatterSame;
    d.Format = function(h) {
        h = e[h];
        return void 0 === h ? "" : d.Formatter.Format(h)
    }
}
function FormatterLabel(b) {
    this.Format = function(d) {
        return b
    }
}
function FormatterPrefix(b, d) {
    this.Format = function(e) {
        return b + (null != d ? d.Format(e) : e)
    }
}
function FormatterEmptyLabel(b) {
    this.Format = function(d) {
        return "undefined" == typeof d ? b : d
    }
}
function FormatterSame() {
    this.Format = function(b) {
        return b
    }
}
function FormatterNumber(b, d, e, g) {
    function h(t) {
        return void 0 === t ? !1 : "number" != typeof t && t && (void 0 !== t.add && void 0 !== t.mul && void 0 !== t.div || window.bigInt && bigInt.isInstance(t))
    }
    function l(t) {
        return "R" != PCF.getResultsSet() && u && t.toTeX
    }
    function k() {
        var t = b
          , q = PCF.getCalcPrecision()
          , r = PCF.getDefaultPrecision();
        t && !d && void 0 !== q && void 0 !== r && (t += q - r,
        0 > t && (t = 0),
        t > PCF.getMaxPrecision() && (t = PCF.getMaxPrecision()));
        return t
    }
    var u = null;
    void 0 !== g && "R" != g && (u = new FormatterFormula);
    var m = this;
    m.Format = function(t) {
        var q = m.FormatSimple(t);
        return h(t) && l(t) ? (PCF.requestFormulaUpdate(),
        u.Format(q)) : q
    }
    ;
    m.FormatSimple = function(t) {
        if (Infinity == t || -Infinity == t)
            return -Infinity == t ? "-" : "&#8734;";
        if (void 0 === t)
            return "";
        if (h(t))
            return l(t) ? t.toTeX() : void 0 !== t.toFixed ? t.toFixed(k(), PCF.getResultsSet()) : t.toString();
        if ("string" === typeof t)
            return t;
        if (isNaN(t))
            return "";
        t = Number(t);
        for (var q = k(), r = 0; r < q && Number(t.toFixed(r).toString()) != t; ++r)
            ;
        return e && Math.abs(t) < Math.pow(10, e) ? (q = Array(e + 1).join("0"),
        0 > t ? "-" + (q + Math.abs(t).toFixed(r)).slice(-(e + (0 < r ? r + 1 : 0))) : (q + t.toFixed(r)).slice(-(e + (0 < r ? r + 1 : 0)))) : t.toFixed(r)
    }
    ;
    m.isNumeric = !0
}
function FormatterPersent(b) {
    this.Format = function(d) {
        return PCF.format("%1", 100 * d) + " %"
    }
    ;
    this.isNumeric = !0
}
function formatTableRows(b, d) {
    var e = "";
    if (b)
        for (var g = 0; g < b.length; ++g) {
            var h = b[g];
            void 0 !== h && void 0 === h.length && (h = [h]);
            e += "<tr>";
            for (var l = 0; l < h.length; ++l) {
                var k = h[l];
                e += "<td>";
                e += d.Format(k);
                e += "</td>"
            }
            e += "</tr>"
        }
    return e
}
function FormatterMatrix(b, d, e, g) {
    var h = new FormatterNumber(b,d,e,g);
    this.Format = function(l) {
        return '<table class="l9">' + formatTableRows(l, h) + "</table>"
    }
}
function FormatterTextMatrix(b) {
    this.Format = function(d) {
        var e = '<table class="pc-value-textmatrixout" ' + (b ? "style=\"font-family:'" + b + "'\"" : "") + " >";
        e += formatTableRows(d, new FormatterSame);
        return e + "</table>"
    }
}
function FormatterColor() {
    this.Format = function(b) {
        return '<span class="pc-output-color" style="background-color:#' + b + '" data-value="#' + b + '">#' + b + "</span>"
    }
}
function FormatterLength() {
    this.Format = function(b) {
        return b && b.length ? b.length : 0
    }
}
function FormatterArray(b, d, e, g) {
    this.Format = function(h) {
        return h.length ? (void 0 === e ? "" : e) + h.map(function(l) {
            return b ? b.Format(l) : l
        }).join(void 0 === d ? " " : d) + (void 0 === g ? "" : g) : ""
    }
}
function ValidatorNonempty() {
    this.Validate = function(b) {
        return "" == b ? getFormattedMessage("err_must_be_not_empty") : ""
    }
}
function ValidatorEmail(b) {
    this.Validate = function(d) {
        return -1 == d.indexOf("@") ? getFormattedMessage("err_invalid_email", d) : ""
    }
}
function ValidatorEqual(b, d) {
    this.Validate = function(e) {
        return b.value != e ? getFormattedMessage("err_must_be_the_same_as", d) : ""
    }
}
function ValidatorTextSize(b, d) {
    this.Validate = function(e) {
        e = e.length;
        return e < b ? getFormattedMessage("err_must_be_at_least_x_chars_long", b) : e > d ? getFormattedMessage("err_must_be_less_or_equal_x_chars", d) : ""
    }
}
function ValidatorCharset(b) {
    this.Validate = function(d) {
        for (var e = 0; e < d.length; ++e) {
            var g = d.substring(e, e + 1);
            if (-1 == b.indexOf(g))
                return getFormattedMessage("err_invalid_symbol", b)
        }
        return ""
    }
}
function ValidatorComplex() {
    var b = arguments;
    this.Validate = function(d) {
        for (var e = "", g = 0; g < b.length; ++g) {
            var h = b[g].Validate(d);
            "" != h && ("" != e && (e += "<br/>"),
            e += h)
        }
        return e
    }
}
function removeInvalidDigits(b, d, e) {
    for (var g = !1, h = "", l = !1, k = 0; k < b.length; ++k) {
        var u = b.substring(k, k + 1);
        if (-1 == "0123456789".indexOf(u))
            if ("-" == u)
                if (d && 0 == k)
                    h += u;
                else {
                    if (e && 0 < k) {
                        var m = b.substr(k - 1, 1);
                        if ("e" == m || "E" == m)
                            h += u
                    }
                }
            else
                "." == u || "," == u ? e && 0 != k && !g && (g = !0,
                h += u) : "e" != u && "E" != u || !e || l || (l = !0,
                h += u);
        else
            h += u
    }
    return h
}
function ValidatorNumber(b, d) {
    this.Validate = function(e) {
        e = e && "" != e ? e : "0";
        return removeInvalidDigits(e, b, d) != e ? b && d ? getFormattedMessage("err_invalid_number") : !b && d ? getFormattedMessage("err_invalid_positive_number") : b && !d ? getFormattedMessage("err_invalid_integer_number") : getFormattedMessage("err_invalid_integer_positive_number") : ""
    }
}
function ValidatorRange(b, d) {
    this.Validate = function(e) {
        e = Number(e);
        return e < b || e > d ? getFormattedMessage("err_range_error", b, d) : ""
    }
}
function ValidatorLookup(b, d) {
    this.Validate = function(e) {
        e = d ? e.split(" ") : [e];
        for (var g = 0; g < e.length; ++g)
            if (void 0 === b[e[g]]) {
                e = void 0;
                g = "";
                for (e in b)
                    g += ", " + e + " (" + b[e] + ")";
                e = g.substr(2);
                return getFormattedMessage("err_value_out_of_set", e)
            }
        return ""
    }
}
function ValidatorNumericArray(b, d, e, g, h, l) {
    var k = "0123456789+ \n\r\t";
    b && (k += "i");
    d && (k += "-");
    e && (k += ",.");
    this.Validate = function(u) {
        if (g) {
            var m = u.split(/[\s\n\r\t]+/).filter(function(q) {
                return 0 != q.length
            });
            if (m.length < h || m.length > l)
                return h == l ? getFormattedMessage("err_array_range_error_single", h) : getFormattedMessage("err_array_range_error", h, l)
        }
        if ("" != u)
            for (m = 0; m < u.length; ++m) {
                var t = u.substring(m, m + 1);
                if (-1 == k.indexOf(t))
                    return d || -1 === "-".indexOf(t) && -1 === "i".indexOf(t) ? e || -1 === ",.".indexOf(t) && -1 === "i".indexOf(t) ? getFormattedMessage("err_invalid_array") : getFormattedMessage("err_invalid_integer_number") : getFormattedMessage("err_invalid_positive_number")
            }
        return ""
    }
}
function ValidatorDateString() {
    this.Validate = function(b) {
        return "string" === typeof TryString2Date(b) ? getFormattedMessage("err_invalid_date") : ""
    }
}
function formatMessage(b) {
    for (var d = new String(b), e = 1; e < arguments.length; ++e)
        d = d.replace("%" + e.toString(), arguments[e]);
    return d
}
function getFormattedMessage(b) {
    var d;
    PCL && (d = PCL[b]);
    if (void 0 === d) {
        var e = document.getElementById(b);
        e && (d = e.innerHTML)
    }
    if (void 0 === d)
        return "Error message " + b + " is not included by server-side code. Contact site support";
    for (e = 1; e < arguments.length; ++e)
        d = d.replace("%" + e.toString(), arguments[e]);
    return d
}
var lastErrorObject = null
  , lastErrorObjectBorderColor = ""
  , lastErrorObjectColor = ""
  , lastErrorMessageBox = null;
function showOrClearComplexControlError(b, d, e) {
    d.length ? e.ShowError(d, b) : e.ClearError(b);
    return 0 == d.length
}
function showOrClearError(b, d, e) {
    if (d.length)
        return e && e.ShowError ? e.ShowError(d) : showError(b, d, e),
        !1;
    e && e.ClearError ? e.ClearError() : clearError(b);
    return !0
}
function showError(b, d, e) {
    e = document.getElementById(e ? e : b ? b.id + "_errmsg" : "errmsg");
    null == e ? 0 < d.length && alert(d) : (lastErrorObject && clearError(lastErrorObject),
    b && (b != lastErrorObject && (lastErrorObject = b,
    lastErrorObjectBorderColor = b.style.borderColor,
    lastErrorObjectColor = b.style.color,
    lastErrorMessageBox = e),
    b.style.borderColor = "#FF0000",
    b.style.color = "#FF0000"),
    e.innerHTML = d,
    e.style.display = "block",
    e.style.zIndex = 1E6,
    b && b.parentNode && (b.parentNode.appendChild(e),
    e.style.left = b.parentNode.firstChild.nextSibling.offsetLeft,
    e.style.top = b.bottom + 4))
}
function clearError(b) {
    lastErrorObject == b && (lastErrorMessageBox && (lastErrorMessageBox.style.display = "none"),
    lastErrorObject.style.borderColor = lastErrorObjectBorderColor,
    lastErrorObject.style.color = lastErrorObjectColor,
    lastErrorMessageBox = lastErrorObject = null)
}
function clearLastError() {
    lastErrorObject && (lastErrorMessageBox && (lastErrorMessageBox.style.display = "none"),
    lastErrorObject.style.borderColor = lastErrorObjectBorderColor,
    lastErrorObject.style.color = lastErrorObjectColor,
    lastErrorMessageBox = lastErrorObject = null)
}
function reportScriptError(b) {
    alert(b)
}
function htmlencode(b) {
    return b = new String(b),
    b.replace("<", "&lt;").replace(">", "&gt;").replace("&", "&amp;").replace('"', "&quot;")
}
function RecordFieldFormatter(b) {
    this.BaseFormatter = function() {
        return b
    }
    ;
    this.Format = function(d, e) {
        return b.Format(e[d])
    }
    ;
    this.isNumeric = void 0 === b.isNumeric ? !1 : b.isNumeric
}
function RecordFieldFormatterSubrecord(b) {
    this.Format = function(d, e) {
        return (d = e[d]) ? d[b] : ""
    }
}
function RecordFieldFormatterLabelsMap() {
    var b = new FormatterMap(arguments);
    this.Format = function(d, e) {
        return b.Format(e[d])
    }
}
function RecordFieldFormatterMultiMap() {
    var b = new FormatterMap(arguments);
    this.Format = function(d, e) {
        e = e[d];
        d = "";
        var g = [];
        for (h in e)
            e[h] && (g.push(h),
            d += " " + b.Format(h));
        g.sort();
        var h = b.Format(g.join(" "));
        return "" != h ? h : d.substr(1)
    }
}
function RecordFieldFormatterImagesMap() {
    var b = new DoubleFormatterMap(arguments);
    b.Formatter = new FormatterImage("");
    this.Format = function(d, e) {
        return b.Format(e[d])
    }
}
function RecordFieldFormatterLabelsMapArray(b) {
    var d = new FormatterMap(b);
    this.Format = function(e, g) {
        return d.Format(g[e])
    }
}
function RecordFieldFormatterURLPattern(b, d) {
    this.Format = function(e, g) {
        e = d ? d.Format(e, g) : g[e];
        return '<a href="' + b.replace(/%1/g, g.pkID) + '">' + e + "</a>"
    }
}
function RecordFieldFormatterURLPatternKey(b, d) {
    for (var e = [], g = 2; g < arguments.length; ++g)
        e[e.length] = arguments[g];
    this.Format = function(h, l) {
        h = d ? d.Format(h, l) : l[h];
        for (var k = b, u = 0; u < e.length; ++u)
            k = k.replace(new RegExp("%" + (u + 1),"g"), l[e[u]]);
        return '<a href="' + k + '">' + h + "</a>"
    }
}
function RecordFieldFormatterParamScriptURL(b, d, e) {
    this.Format = function(g, h) {
        g = e ? e.Format(g, h) : h[g];
        return '<a href="#" onclick="' + b.replace(/%1/g, h[d]) + '; return BSPreventDefaultAction( event);">' + g + "</a>"
    }
}
function RecordFieldFormatterParamScriptURLEx(b, d) {
    for (var e = [], g = 2; g < arguments.length; ++g)
        e[g - 2] = arguments[g];
    this.Format = function(h, l) {
        h = d ? d.Format(h, l) : l[h];
        for (var k = b, u = 0; u < e.length; ++u)
            k = k.replace("%" + (u + 1).toString(), l[e[u]] ? l[e[u]] : "");
        return '<a href="#" onclick="' + k + ';return BSPreventDefaultAction( event);">' + h + "</a>"
    }
}
function RecordFieldFormatterParamScriptURLLabel(b, d, e) {
    this.Format = function(g, h) {
        return '<a href="#" onclick="' + b.replace(/%1/g, h[d]) + '; return BSPreventDefaultAction( event);">' + e + "</a>"
    }
}
function RecordFieldFormatterLabel(b) {
    this.Format = function(d, e) {
        return b
    }
}
function RecordFieldFormatterEmptyLabel(b) {
    this.Format = function(d, e) {
        d = e[d];
        if ("undefined" == typeof d || "" == d)
            d = b;
        return d
    }
}
function RecordFieldFormatterAlternate(b, d) {
    this.Format = function(e, g) {
        return "undefined" == typeof g[e] ? d.Format(b, g) : d.Format(e, g)
    }
}
function RecordFieldFormatterChangeButtonsM(b, d, e) {
    function g(h, l, k, u, m) {
        return '<button type="button" class="vb c2 material-icons" title="' + u + '" href="#" onclick="' + l + "." + k + "(" + h + '); return BSPreventDefaultAction( event);">' + m + "</button>"
    }
    this.Format = function(h, l) {
        h = l.pkID;
        return g(h, b, "Edit", e, "&#xE254;") + " " + g(h, b, "Delete", d, "&#xE872;")
    }
}
function RecordFieldFormatterProgress(b) {
    this.Format = function(d, e) {
        d = Number(e[d]);
        return formatMessage(b, 100 < d ? 100 : d, d)
    }
}
function RecordFieldFormatterMany() {
    var b = arguments;
    this.Format = function(d, e) {
        d = b[0];
        for (var g = 1; g < b.length; ++g)
            d = d.replace(new RegExp("%" + g,"g"), e[b[g]]);
        return d
    }
}
function RecordFieldFormatterThumbImage() {
    this.Format = function(b, d) {
        return '<img src="' + d[b] + '_thumb.png" >'
    }
}
function RecordFieldFormatterDropDown_change(b, d, e) {
    b[d] = e
}
function RecordFieldFormatterDropDown(b, d, e) {
    this.Format = function(g, h) {
        var l = h[g];
        g = '<select onchange="RecordFieldFormatterDropDown_change(' + e.replace("%1", h[d]) + ",'" + g + "',this.options[this.selectedIndex].value);\">";
        for (var k in b)
            g += '<option value="' + k + '"',
            l == k && (g += ' selected="selected"'),
            g += ">" + b[k],
            g += "</option>";
        return g + "</seclect>"
    }
}
function RecordFieldFormaterIf(b, d, e) {
    this.Format = function(g, h) {
        return b(h) ? d.Format(g, h) : e.Format(g, h)
    }
}
function RecordFieldFormatterEmpty() {
    this.Format = function(b, d) {
        return ""
    }
}
function RecordFieldFormatterSame() {
    this.Format = function(b, d) {
        return d[b]
    }
}
function RecordFieldFormatterKeyValue(b, d) {
    this.Format = function(e, g) {
        e = d ? d.Format(e, g) : g[e];
        return b.replace(/%key%/g, g.pkID).replace(/%value%/g, e)
    }
}
function RecordFieldFormatterFixedColumn(b, d) {
    this.Format = function(e, g) {
        return d.Format(b, g)
    }
}
function RecordFieldFormatterSequence(b) {
    this.Format = function(d, e) {
        for (var g = "", h = 0; h < b.length; ++h)
            g += b[h].Format(d, e);
        return g
    }
}
function RecordFieldFormatterChild(b, d, e) {
    this.Format = function(g, h) {
        e || (e = 100);
        g = h[g];
        g = "string" == typeof g && "{" == g.substr(0, 1) ? JSON.parse(g) : g;
        return (g = d ? d.Format(b, g) : g[b]) && g.length > e ? g.substr(0, e) + "..." : g
    }
}
function GetObjectPropertiesCount(b) {
    var d = 0, e;
    for (e in b)
        ++d;
    return d
}
function Recordset(b, d) {
    function e(r, w) {
        var y = {}, B;
        for (B in r)
            w != B && (y[B] = r[B]);
        return y
    }
    function g(r) {
        this.IsLess = function(w, y) {
            return w[r] < y[r]
        }
    }
    function h(r) {
        this.IsLess = function(w, y) {
            return w[r] > y[r]
        }
    }
    var l = this
      , k = {}
      , u = d ? d : "pkID"
      , m = 0
      , t = {}
      , q = 0;
    l.QueryContext = {
        from: 0,
        items: 10,
        sortcolumn: 1,
        sortdirection: "ASC"
    };
    l.GetTotal = function() {
        return m
    }
    ;
    l.LoadFromJson = function(r) {
        r && "" != r ? (r = eval("(" + r + ")"),
        r.error ? reportScriptError(r.error) : Array.isArray(r) ? l.LoadFromArray(r) : l.LoadFromObject(r)) : l.Clear()
    }
    ;
    l.LoadFromRecordsetNode = function(r) {
        l.Clear();
        if (r) {
            for (var w = r.attributes, y = 0; y < w.length; ++y) {
                var B = w.item(y);
                l.QueryContext[B.nodeName] = B.nodeValue
            }
            r = r.childNodes;
            for (y = 0; y < r.length; ++y)
                if (w = r[y],
                "record" == w.nodeName) {
                    B = w.childNodes;
                    w = {};
                    for (var x = 0; x < B.length; x++) {
                        var A = B[x];
                        if (1 == A.nodeType) {
                            if (A.firstChild && 1 == A.firstChild.nodeType) {
                                var D = new Recordset;
                                D.LoadFromRecordsetNode(A.firstChild)
                            } else
                                D = A.firstChild ? A.firstChild.nodeValue : "";
                            w[A.nodeName] = D
                        }
                    }
                    l.SetRecord(w)
                } else
                    "summary" == w.nodeName && (m = Number(w.getAttribute("total")))
        } else
            alert("empty node passed into recordset")
    }
    ;
    l.LoadFromObject = function(r) {
        l.Clear();
        r.params && (l.QueryContext = r.params);
        r.summary && (m = r.summary.total);
        (r = r.recordset) && l.LoadFromArray(r)
    }
    ;
    l.LoadFromArray = function(r) {
        for (var w = 0; w < r.length; ++w) {
            var y = r[w], B;
            for (B in y) {
                var x = y[B];
                if (!Array.isArray(x))
                    if ("object" == typeof x && x && x.recordset) {
                        var A = new Recordset("");
                        A.LoadFromObject(x);
                        y[B] = A
                    } else
                        "string" == typeof x && (y[B] = TryString2Date(x));
                l.SetRecord(y)
            }
        }
    }
    ;
    l.SaveToJsonArray = function() {
        var r = "", w = "[", y;
        for (y in k) {
            w += r + "{";
            var B = k[y];
            r = "";
            for (var x in B)
                x == u && l.IsNew(B[u]) || (r = w += r + '"' + x + '":',
                w = B[x],
                w = "object" == typeof w && w && w.SaveToJson ? w.SaveToJson() : Value2Json(w),
                w = r + w,
                r = ",");
            w += "}";
            r = ","
        }
        return w + "]"
    }
    ;
    l.SaveToJson = function() {
        var r = '{ "params":{', w = "", y;
        for (y in l.QueryContext)
            r += w + '"' + y + '":"' + l.QueryContext[y] + '"',
            w = ",";
        return r += '} , "recordset":' + l.SaveToJsonArray() + "}"
    }
    ;
    l.GetPrimaryKey = function(r) {
        if (void 0 != r[u] && "" != r[u]) {
            isNaN(r[u]) ? q = r[u] : q < parseInt(r[u]) && (q = parseInt(r[u]));
            var w = "pk" + r[u]
        } else
            w = "number" === typeof q ? ++q : l.GetUniquePropertyValue(u, ""),
            r[u] = w,
            w = "pk" + w,
            t[w] = !0;
        return w
    }
    ;
    l.SetRecord = function(r) {
        var w = l.GetPrimaryKey(r);
        k[w] = r
    }
    ;
    l.InsertRecord = function(r, w) {
        var y = l.GetPrimaryKey(r), B = {}, x = !1, A;
        for (A in k)
            B[A] = k[A],
            "pk" + w == A && (x = !0,
            B[y] = r);
        x || (B[y] = r);
        k = B
    }
    ;
    l.Exists = function(r) {
        return "undefined" != typeof k[r]
    }
    ;
    l.GetRecord = function(r) {
        return k["pk" + r]
    }
    ;
    l.IsNew = function(r) {
        return 1 == t["pk" + r]
    }
    ;
    l.RemoveRecord = function(r) {
        var w = "pk" + r;
        k = e(k, w);
        l.IsNew(r) && (t = e(t, w))
    }
    ;
    l.FindByProperty = function(r, w) {
        for (var y in k) {
            var B = k[y];
            if (B[r] == w)
                return B
        }
        return null
    }
    ;
    l.GetUniquePropertyValue = function(r, w) {
        var y = 1;
        do
            var B = w + y++;
        while (l.FindByProperty(r, B));
        return B
    }
    ;
    l.IsEmpty = function() {
        for (var r in k)
            return !1;
        return !0
    }
    ;
    l.GetRecordArray = function() {
        var r = [], w;
        for (w in k)
            r[r.length] = k[w];
        return r
    }
    ;
    l.GetCount = function() {
        return GetObjectPropertiesCount(k)
    }
    ;
    l.Clear = function() {
        t = {};
        k = {}
    }
    ;
    l.AddNewRecord = function() {
        var r = {};
        l.SetRecord(r);
        return r
    }
    ;
    l.SelectByField = function(r, w) {
        var y = new Recordset("",u), B;
        for (B in k) {
            var x = k[B];
            -1 != x[w].indexOf(r) && y.SetRecord(x)
        }
        return y
    }
    ;
    l.Rollback = function() {
        var r = t, w;
        for (w in r)
            l.RemoveRecord(w.substring(2))
    }
    ;
    l.SortAsc = function(r) {
        l.Sort(new g(r))
    }
    ;
    l.SortDesc = function(r) {
        l.Sort(new h(r))
    }
    ;
    l.Sort = function(r) {
        var w = [], y;
        for (y in k) {
            for (var B = 0, x = k[y]; B < w.length && !r.IsLess(x, w[B]); ++B)
                ;
            w.splice(B, 0, x)
        }
        l.Clear();
        for (B = 0; B < w.length; ++B)
            l.SetRecord(w[B])
    }
    ;
    void 0 != b && "" != b && l.LoadFromJson(b)
}
function Value2Json(b, d) {
    if (null == b)
        return "null";
    var e = typeof b;
    d = d ? "" : '"';
    if ("string" == e)
        return b = new String(b),
        d + b.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + d;
    if ("object" == e) {
        if (b instanceof Array) {
            e = "";
            for (d = 0; d < b.length; ++d)
                e += "," + Value2Json(b[d]);
            e = b.length ? "[" + e.substr(1) + "]" : "[]"
        } else if (b instanceof Date)
            e = d + Date2String(b) + d;
        else {
            e = "";
            d = 0;
            for (var g in b)
                ++d,
                e += ',"' + g + '":' + Value2Json(b[g]);
            e = d ? "{" + e.substr(1) + "}" : "{}"
        }
        return e
    }
    return "undefined" == e ? d + d : b
}
function RecordsetHeader() {
    var b = this;
    b.Columns = {};
    b.Size = 0;
    b.Groups = [];
    b.AddColumn = function(d, e, g, h, l, k, u) {
        e = {
            name: d,
            dispname: e,
            formatter: g,
            description: h,
            chartKind: l,
            visible: !0,
            index: b.Size,
            varType: u,
            chart_options: k && "object" == typeof k ? k : {
                interpolate: k ? k : "cardinal"
            }
        };
        b.Columns[d] = e;
        b.Size++;
        return e
    }
    ;
    b.AddGroup = function(d, e) {
        b.Groups.push({
            name: d,
            dispname: e,
            visible: !0,
            index: b.Size
        })
    }
    ;
    b.RestoreColumns = function() {
        if (b.OriginalColumns) {
            b.Columns = {};
            b.Size = 0;
            for (var d in b.OriginalColumns)
                b.Columns[d] = b.OriginalColumns[d],
                b.Size++
        }
    }
    ;
    b.CloneColumn = function(d, e, g, h) {
        if (!b.OriginalColumns) {
            b.OriginalColumns = {};
            for (var l in b.Columns)
                b.OriginalColumns[l] = b.Columns[l]
        }
        (d = b.Columns[d]) && void 0 === b.Columns[e] && b.AddColumn(e, void 0 === g ? d.dispname : g, d.formatter, void 0 === h ? d.description : h, d.chartKind, d.chart_options, d.varType)
    }
    ;
    b.GetLabel = function(d) {
        var e = b.Columns[d];
        d = e.dispname;
        (e = e.description) && (d = '<span title="' + e + '">' + d + "</span>");
        return d
    }
    ;
    b.GetFormatter = function(d) {
        return b.Columns[d] ? b.Columns[d].formatter : null
    }
    ;
    b.HasColumn = function(d) {
        return void 0 !== b.Columns[d]
    }
}
function RecordsetRenderer(b, d, e) {
    function g(l) {
        return l.formatter && l.formatter.isNumeric ? "p9" : "o9"
    }
    var h = this;
    h.GetElementToShow = function() {
        return document.getElementById(b).parentNode
    }
    ;
    h.AddColumn = function(l, k, u, m, t) {
        h.Header.AddColumn(l, k, u, m, t)
    }
    ;
    h.AddGroup = function(l, k) {
        h.Header.AddGroup(l, k)
    }
    ;
    h.Render = function(l, k, u) {
        k = h.CreateTable(l, !1, u ? !0 : !1);
        document.getElementById(b).innerHTML = k;
        u && h.AdviseNavigation(l, u);
        PCF.requestFormulaUpdate(!1) && (l = window.MathJax,
        void 0 !== l && l.Hub.Queue(["Typeset", l.Hub]))
    }
    ;
    h.CreateTable = function(l, k, u) {
        k = h.CreateTableHeader(l.QueryContext.sortcolumn, l.QueryContext.sortdirection, k);
        k += h.CreateTableData(l);
        u && (k += h.CreateNavigation(l));
        return h.TableWrapper(k)
    }
    ;
    h.CreateTableHeader = function(l, k, u) {
        var m = '<thead><tr id="' + h.GetHeaderId() + '" >', t;
        for (t in h.Header.Columns)
            if (h.Header.Columns[t].visible) {
                var q = "th_notsorted";
                t == l && (q = "ASC" == k ? "th_sortedasc" : "th_sorteddesc");
                m += h.TableHeader(t);
                u && (m += '<a href="" class="' + q + '" id="col_' + (b + "_") + t + '">');
                m += h.Header.GetLabel(t);
                u && (m += "</a>");
                m += "</th>"
            }
        return m + "</tr></thead>"
    }
    ;
    h.CreateTableData = function(l) {
        l = l.GetRecordArray();
        var k = "<tbody>"
          , u = [];
        h.Header.Groups.forEach(function(D) {
            D.visible && u.push({
                name: D.name,
                dispname: D.dispname,
                index: D.index
            })
        });
        var m = [];
        if (u.length) {
            var t = h.Header.Columns;
            for (A in t)
                m.splice(0, 0, t[A]);
            var q = u.length - 1
              , r = 0;
            m.forEach(function(D, C) {
                for (r++; 0 <= q && u[q].index >= D.index; )
                    u[q].cols = r,
                    r = 0,
                    q--;
                r && u.splice(0, 0, {
                    name: "",
                    dispname: "",
                    index: 0,
                    cols: r
                })
            })
        }
        for (t = 0; t < l.length; t++) {
            for (var w = l[t], y = !1, B = 0; B < u.length; ++B) {
                var x = u[B];
                var A = x.name;
                void 0 !== w[A] && (A = x.formatter ? x.formatter.Format(A, w) : w[A],
                x.dispname != A && (y = !0,
                x.dispname = A))
            }
            if (0 == t || y)
                A = u.reduce(function(D, C) {
                    C.cols ? (D.val += '<td colspan="' + C.cols + '" class="' + g(m[m.length - C.index - 1]) + ' s8">' + D.prev + C.dispname + "</td>",
                    D.prev = "") : D.prev += C.dispname;
                    return D
                }, {
                    prev: "",
                    val: ""
                }),
                A.val && (k += "<tr>" + A.val + "</tr>");
            k += h.CreateRowData(null, w)
        }
        return k + "</tbody>"
    }
    ;
    h.CreateRowData = function(l, k) {
        l = "<tr>";
        for (var u in h.Header.Columns)
            if (h.Header.Columns[u].visible) {
                l += h.TableData(u);
                var m = h.Header.GetFormatter(u);
                l = m ? l + m.Format(u, k) : l + k[u];
                l += "</td>"
            }
        return l + "</tr>"
    }
    ;
    h.GetNavigationId = function() {
        return "nav_" + b + "_"
    }
    ;
    h.GetHeaderId = function() {
        return "header_" + b
    }
    ;
    h.TableWrapper = function(l) {
        return '<div class="n" >' + h.GetTitle() + "<table>" + l + "</table></div>"
    }
    ;
    h.TableHeader = function(l) {
        return '<th class="' + g(h.Header.Columns[l]) + '">'
    }
    ;
    h.TableData = function(l) {
        return '<td class="' + g(h.Header.Columns[l]) + '">'
    }
    ;
    h.AdviseNavigation = function(l, k) {
        var u = document.getElementById(h.GetNavigationId());
        if (u) {
            var m = $(u)
              , t = m.find(".t3");
            u = m.find(".pc-button-prev");
            m = m.find(".pc-button-next");
            var q = l.QueryContext;
            t.on("change", function() {
                var y = Number(t.val());
                y = y || l.GetTotal();
                var B = q.from;
                k(B - B % y, y)
            });
            u.on("click", function() {
                k(q.from - q.items, q.items)
            });
            m.on("click", function() {
                k(q.from + q.items, q.items)
            });
            if (e) {
                m = $("#" + b);
                for (var r in e) {
                    var w = e[r].func;
                    m.find("." + r).on("click", function() {
                        w()
                    })
                }
            }
        }
    }
    ;
    h.CreateNavigation = function(l) {
        var k = l.QueryContext.items
          , u = l.QueryContext.from;
        l = l.GetTotal();
        if (!l)
            return "";
        var m = [5, 10, 20, 50, 100, 200, 500, 1E3, 1E4, 1E5, 0]
          , t = '<tfoot><tr><td colspan="' + h.Header.Size + '">';
        t += '<div class="w" id="' + h.GetNavigationId() + '">';
        t += '<span class="pc-paging-items">' + PCL.items_per_page + ": </span>";
        t += '<div class="_ s3"><i class="w3"></i><select class="t3">';
        for (var q = !1, r = 0; r < m.length; ++r)
            q = q || m[r] == k,
            t += '<option value="' + m[r] + '"' + (m[r] == k || !m[r] && !q ? " selected" : "") + ">" + ((1E3 < m[r] ? m[r] / 1E3 + "K" : m[r]) || PCL.all) + "</option>";
        k = u + k < l ? u + k : l;
        t = t + '</select><div class="_3"></div></div><span class="cb">' + (PCL.x_of_y.replace("%1", u + 1 + " - " + k).replace("%2", l) + "</span>");
        t += '<button type="button" class="pc-button-prev c2" title="' + PCL.prev_page + '"' + (u ? "" : " disabled") + '><i class="material-icons">&#xE5CB;</i></button>';
        t += '<button type="button" class="pc-button-next c2 material-icons" title="' + PCL.next_page + '"' + (k < l ? "" : " disabled") + '><i class="material-icons">&#xE5CC;</i></button>';
        return t + "</div></td></tr></tfoot>"
    }
    ;
    h.Header = new RecordsetHeader;
    h.Show = function() {
        return document.getElementById(b).parentNode.style.display = "block"
    }
    ;
    h.Hide = function() {
        return document.getElementById(b).parentNode.style.display = "none"
    }
    ;
    h.ShowTable = function() {
        return document.getElementById(b).style.display = "block"
    }
    ;
    h.HideTable = function() {
        return document.getElementById(b).style.display = "none"
    }
    ;
    h.GetTitle = function() {
        return h.name ? "<header>" + h.GetButtons() + '<h4 class="_2 o">' + h.name + "</h4></header>" : ""
    }
    ;
    h.GetButtons = function() {
        var l = "";
        if (e)
            for (var k in e)
                l += '<button type="button" class="c2 vb ' + k + ' material-icons" ><i class="material-icons">' + e[k].icon + "</i></button>";
        return l
    }
}
var AjaxTableNoEmptyRowsRenderer = RecordsetRenderer
  , RecordsetRendererM = RecordsetRenderer;
function RecordsetRendererC(b, d, e) {
    function g() {
        if (5E5 < u.length) {
            if (m) {
                m.open();
                return
            }
            var r = b.replace("_table", "")
              , w = document.getElementById(r + "_big_msg");
            r = document.getElementById(r + "_download");
            if (w && r) {
                r.addEventListener("click", function() {
                    h()
                });
                m = PLANETCALC.snackbar(w);
                return
            }
        }
        h()
    }
    function h() {
        var r = [], w;
        for (w in k.Header.Columns)
            r.push(w);
        m && m.dismiss();
        PCcsv.save_to_file(u, k.name + ".csv", r)
    }
    function l(r, w) {
        q = w;
        var y = new Recordset(null,"__id__");
        y.LoadFromObject({
            summary: {
                total: u.length
            },
            recordset: u.slice(r, r + w)
        });
        var B = y.QueryContext;
        B.from = r;
        B.items = w;
        k.name && (t.name = k.name);
        t.Render(y, null, l)
    }
    var k = this
      , u = null
      , m = null
      , t = new RecordsetRendererM(b,d,e && e.length && "export" == e[0] ? {
        get_app: {
            func: g,
            icon: "&#xf090;"
        }
    } : null)
      , q = d ? d : 10;
    k.Header = t.Header;
    k.Show = t.Show;
    k.Hide = t.Hide;
    k.ShowTable = t.ShowTable;
    k.HideTable = t.HideTable;
    k.AddColumn = t.AddColumn;
    k.AddGroup = t.AddGroup;
    k.GetElementToShow = t.GetElementToShow;
    k.Render = function(r) {
        u = r.GetRecordArray();
        l(0, q)
    }
}
function RecordsetRendererT(b, d) {
    var e = this;
    e.inheritFrom = RecordsetRendererM;
    e.inheritFrom(b, d);
    e.Render = function(g) {
        g = g.GetRecordArray();
        var h = "<tbody>", l = e.Header.Columns, k;
        for (k in l) {
            var u = l[k];
            if (!u.visible)
                return;
            h += '<tr><th class="th_notsorted o9">' + u.dispname + "</th>";
            g.forEach(function(m) {
                h += "<td>";
                var t = e.Header.GetFormatter(u.name);
                h = t ? h + t.Format(u.name, m) : h + m[u.name];
                h += "</td>"
            });
            h += "</tr>"
        }
        h += "</tbody>";
        document.getElementById(b).innerHTML = e.TableWrapper(h)
    }
}
function CommentFormHandler(b, d) {
    function e() {
        $(".btn-more-comment").on("click", function(m) {
            var t = $(m.currentTarget);
            k.deleteItemId = t.data("id");
            k.showNear(m.currentTarget);
            return !1
        })
    }
    function g() {
        "" == h.Dialog.message.GetValue() ? $(h.Dialog.send.GetElement()).attr("disabled", "") : $(h.Dialog.send.GetElement()).removeAttr("disabled")
    }
    var h = this
      , l = !1
      , k = null;
    var u = function() {
        h.checkCommentLoad();
        l && u && window.removeEventListener("scroll", u)
    };
    d && (k = PLANETCALC.menu(document.getElementById("delete_comment_menu")),
    document.getElementById("action_delete_comment").addEventListener("click", function() {
        h.Delete(k.deleteItemId)
    }));
    h.checkCommentLoad = function() {
        if (!l) {
            var m = $("#comments").offset().top
              , t = $(window).height();
            $(window).scrollTop() > m - t && (l = !0,
            h.Dialog.group_sofia && (m = window.location.pathname.match(/\/(\d+)\//),
            BSMakePOSTRequest("/service/sofiabyartefact/", {
                OnResponseText: function(q) {
                    $(h.Dialog.group_sofia.GetElement()).append(q)
                }
            }, {
                id: m ? m[1] : 0
            })),
            h.Update())
        }
    }
    ;
    h.isRegistered = function() {
        return d
    }
    ;
    h.setTable = function(m) {
        h.table = m
    }
    ;
    h.prepare = function(m) {
        BSMakePOSTRequest("/service/comments/prepare/", {
            OnResponse: function(t) {
                m(t.id)
            }
        }, {
            message: h.Dialog.message.GetValue(),
            subscribe: h.Dialog.notify.GetValue()
        })
    }
    ;
    h.onchanged = function(m) {
        "notify" == m && (h.Dialog.progress.Show(),
        h.isRegistered() ? (m = h.Dialog.notify.GetValue(),
        BSMakePOSTRequest("/service/comments/tracker/", {
            OnResponse: function() {
                h.Dialog.progress.Hide()
            }
        }, {
            op: m ? 1 : 0,
            id: h.Dialog.messagebox.GetValue()
        })) : h.prepare(function(t) {
            document.location.href = b + "&prepost=" + t
        }))
    }
    ;
    h.initdialog = function(m) {
        h.Dialog = m;
        h.Dialog.progress.Hide();
        g();
        $(h.Dialog.message.GetElement()).on("input propertychange", function() {
            g()
        });
        h.checkCommentLoad();
        l || window.addEventListener("scroll", u, {
            passive: !0
        })
    }
    ;
    h.oncommand = function(m) {
        "send" == m && (d ? h.Send() : h.LoginAndSend())
    }
    ;
    h.onkeypressed = function(m, t) {
        return !0
    }
    ;
    h.Send = function() {
        "" != h.Dialog.message.GetValue() && h.Dialog.message.Validate() && (h.Dialog.progress.Show(),
        h.table.attachUpdateListener(function() {
            h.Dialog.progress.Hide();
            d && e()
        }),
        BSMakePOSTRequest("/service/comments/add/", {
            OnResponse: function() {
                h.table.Reload();
                h.Dialog.message.SetValue("")
            }
        }, {
            id: h.Dialog.messagebox.GetValue(),
            message: h.Dialog.message.GetValue(),
            parent: 0
        }))
    }
    ;
    h.Delete = function(m) {
        h.Dialog.progress.Show();
        BSMakePOSTRequest("/service/comments/spamcontrol/", {
            OnResponse: function() {
                h.Update()
            }
        }, {
            id: m,
            op: "delete"
        })
    }
    ;
    h.Update = function() {
        h.Dialog.progress.Show();
        h.table.Reload();
        h.table.attachUpdateListener(function() {
            h.Dialog.progress.Hide();
            d && e()
        })
    }
    ;
    h.LoginAndSend = function() {
        "" != h.Dialog.message.GetValue() && h.Dialog.message.Validate() && (window.initbeforelogin = function(m) {
            h.prepare(function(t) {
                m.action = b + "&prepost=" + t;
                m.submit()
            })
        }
        ,
        window.logindialog ? window.logindialog.open() : BSMakePOSTRequest("/signin/", {
            OnResponseText: function(m) {
                $(document.body).append(m);
                m = document.getElementById("signiddlg");
                PLANETCALC.init(m);
                window.logindialog = PLANETCALC.dialog(m);
                window.logindialog.open()
            }
        }, {
            prepare: "window.initbeforelogin",
            id: "signiddlg"
        }))
    }
}
function CommentsRenderer(b, d) {
    function e(l, k) {
        return '<p class="' + l + '">' + k + "</p>"
    }
    function g(l, k) {
        return '<span class="' + l + '">' + k + "</span>"
    }
    var h = this;
    h.inheritFrom = RecordsetRendererM;
    h.inheritFrom(b, d);
    h.table_class = "table";
    h.GetEmptyLines = function(l) {
        return ""
    }
    ;
    h.CreateTableHeader = function(l, k, u) {
        return ""
    }
    ;
    h.CreateRowData = function(l, k) {
        l = '<tr><td rowspan=2 class="ub">';
        l = 0 == k.role ? l + h.RenderAnonimousInfo(k) : l + e("pc-avatar", h.Header.GetFormatter("avatar") ? h.Header.GetFormatter("avatar").Format("photo", k) : "");
        l = l + '</td><td class="p">' + g("z1", h.Header.GetFormatter("nickname") ? h.Header.GetFormatter("nickname").Format("nickname", k) : k.nickname);
        h.Header.GetFormatter("spamDelete") && (l += '<span class="q">',
        h.Header.GetFormatter("spamDelete") && (l += h.Header.GetFormatter("spamDelete").Format("spamDelete", k)),
        l += "</span>");
        l += g("u", h.Header.GetFormatter("posted") ? h.Header.GetFormatter("posted").Format("posted", k) : k.posted);
        l = l + '</td></tr><tr class="r"><td class="s">' + k.message;
        return l + "</td></tr>"
    }
    ;
    h.RenderAnonimousInfo = function(l) {
        l.photo = "/img/none.png";
        return e("pc-avatar", h.Header.GetFormatter("avatar") ? h.Header.GetFormatter("avatar").Format("photo", l) : "")
    }
}
function Commenter(b, d) {
    var e = this;
    e.OuterDivID = b;
    e.URL = d;
    e.SetTable = function(g) {
        e.Comments = g
    }
    ;
    e.initdialog = function(g) {
        e.Dialog = g
    }
    ;
    e.onchanged = function(g) {}
    ;
    e.onkeypressed = function(g, h) {
        return !0
    }
    ;
    e.oncommand = function(g) {
        clearLastError();
        "ok" == g ? e.Dialog.Validate() && e.Send() : "cancel" == g && e.Discard()
    }
    ;
    e.Send = function() {
        if (e.Dialog.Validate()) {
            e.Dialog.Busy();
            var g = e.URL
              , h = e.Dialog
              , l = {
                id: h.comment_id.GetValue(),
                message: h.message_text.GetValue(),
                parent: h.parent.GetValue()
            };
            void 0 != h.captcha && (l.captcha = h.captcha.GetValue());
            void 0 != h.sender && (l.sender = h.sender.GetValue());
            BSMakePOSTRequest(g, e, l)
        }
    }
    ;
    e.Discard = function() {
        document.getElementById(e.OuterDivID).style.display = "none"
    }
    ;
    e.OnResponse = function(g) {
        e.Dialog.Free();
        e.ResetCaptcha();
        e.Dialog.message_text.SetValue("");
        e.Comments.Reload()
    }
    ;
    e.OnError = function(g) {
        e.Dialog.Free();
        e.ResetCaptcha();
        e.Dialog.ShowError(null, g);
        return !0
    }
    ;
    e.ResetCaptcha = function() {
        e.Dialog.captcha && (e.Dialog.captcha.SetValue(""),
        document.getElementById(e.Dialog.GetElement().id + "_captcha_image").src = "/captcha/?" + Math.random())
    }
}
function FormTrackerHandler(b) {
    var d = this;
    d.Dialog = null;
    d.URL = b;
    d.onchanged = function(e) {
        e = d.URL;
        var g = d.Dialog;
        g = {
            id: g.item_id.GetValue(),
            op: g.op.GetValue()
        };
        BSMakePOSTRequest(e, d, g)
    }
    ;
    d.initdialog = function(e) {
        d.Dialog = e
    }
    ;
    d.oncommand = function(e) {
        clearLastError()
    }
    ;
    d.onkeypressed = function(e, g) {
        return !0
    }
    ;
    d.OnResponse = function(e) {}
}
function Requester(b) {
    var d = this;
    d.URL = b;
    d.Request = function(e) {
        BSMakePOSTRequest(d.URL, d, {
            id: e
        })
    }
    ;
    d.Close = function(e) {
        d.Request(e)
    }
    ;
    d.OnResponse = function(e) {
        alert("Done")
    }
}
function Trigger(b) {
    var d = this;
    d.URL = b;
    d.Request = function(e) {
        BSMakePOSTRequest(d.URL, d, {
            id: e
        })
    }
    ;
    d.Trigger = function(e) {
        d.Request(e)
    }
    ;
    d.OnResponse = function(e) {
        alert("Done")
    }
}
var on_gapi_load_action = null;
function enable_google_login() {
    gapi.load("auth2", function() {
        auth2 = gapi.auth2.init({
            client_id: "209250272059-umso8nug49u2dr6g67homveq395pcg49.apps.googleusercontent.com"
        });
        on_gapi_load_action && (on_gapi_load_action(),
        on_gapi_load_action = null)
    })
}
function LoginFormHandler(b, d) {
    function e(F) {
        "BUTTON" == F.GetElement().tagName ? $(F.GetElement()).show() : F.Show()
    }
    function g(F) {
        "BUTTON" == F.GetElement().tagName ? $(F.GetElement()).hide() : F.Hide()
    }
    function h(F) {
        for (var K = 1; K < arguments.length; ++K)
            for (var N = arguments[K], T = 0; T < N.length; ++T)
                F(N[T])
    }
    function l() {
        var F = [D.Dialog.login_with, D.Dialog.next, D.Dialog.login_header, D.Dialog.consent_login];
        "email" == D.Dialog.login_with.GetValue() && F.push(D.Dialog.login_useremail, D.Dialog.login_userpassword);
        return F
    }
    function k() {
        return [D.Dialog.join_header, D.Dialog.login_useremail, D.Dialog.join_fullname, D.Dialog.login_userpassword, D.Dialog.join_password_confirm, D.Dialog.next, D.Dialog.back, D.Dialog.consent_login]
    }
    function u() {
        return [D.Dialog.join_header, D.Dialog.join_captcha, D.Dialog.join, D.Dialog.back]
    }
    function m() {
        var F = D.Dialog.consent_login.GetElement().checked;
        D.Dialog.join.GetElement().disabled = !F;
        D.Dialog.login.GetElement().disabled = !F;
        D.Dialog.next.GetElement().disabled = !F
    }
    function t() {
        $("#new_user").on("click", function() {
            q(E.signup);
            $(D.Dialog.login_userpassword.GetElementToShow()).find(".e4").hide();
            return !1
        })
    }
    function q(F) {
        J = F;
        switch (F) {
        case "signup":
            h(function(K) {
                g(K)
            }, l(), u(), [D.Dialog.login]);
            h(function(K) {
                e(K)
            }, k());
            break;
        case "captcha":
        case "captcha1":
            x(F == E.captcha ? u() : [D.Dialog.login_header, D.Dialog.join_captcha, D.Dialog.login, D.Dialog.back]);
            break;
        default:
            J = E.login,
            h(function(K) {
                g(K)
            }, k(), u(), [D.Dialog.login]),
            h(function(K) {
                e(K)
            }, l()),
            $(D.Dialog.login_userpassword.GetElementToShow()).find(".e4").show(),
            D.Dialog.signupmode.SetValue("")
        }
    }
    function r() {
        A(D.Dialog.GetElement())
    }
    function w() {
        auth2.signIn().then(function() {
            auth2.currentUser.get().getBasicProfile();
            D.Dialog.code.SetValue(gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token);
            r()
        })
    }
    function y() {

    }
    function B(F) {
        var K = !0;
        h(function(N) {
            N.Validate() || (K = !1)
        }, F);
        return K
    }
    function x(F) {
        h(function(K) {
            g(K)
        }, k(), l(), [D.Dialog.join, D.Dialog.login]);
        h(function(K) {
            e(K)
        }, F);
        $(".pc-captcha").attr("src", "/captcha/?new=" + Math.random())
    }
    var A = b ? b : function(F) {
        F.submit()
    }
      , D = this;
    D.Dialog = null;
    var C = {}
      , E = {
        signup: "signup",
        login: "login",
        captcha: "captcha",
        captcha1: "captcha1"
    }
      , J = E.login;
    D.onchanged = function(F) {
        if ("login_with" == F) {
            var K = D.Dialog.login_with.GetValue()
              , N = [D.Dialog.login_useremail, D.Dialog.login_userpassword, D.Dialog.next]
              , T = [D.Dialog.copy_picture, D.Dialog.login];
            "email" == K ? (N.forEach(e),
            T.forEach(g),
            t()) : (N.forEach(g),
            T.forEach(e))
        }
        if ("consent_login" == F) {
            D.Dialog.consent_login.GetValue() ? C.login = Math.round((new Date).getTime() / 1E3) : delete C.login;
            F = "";
            for (var I in C)
                F += I + ":" + C[I] + "/";
            I = "";
            "" != F && (I = new Date,
            I.setTime(I.getTime() + 31536E6),
            I = "expires=" + I.toUTCString(),
            F = F.substr(0, F.length - 1));
            document.cookie = O + "=" + F + ";" + I + ";path=/";
            m()
        }
    }
    ;
    D.initdialog = function(F) {
        D.Dialog = F;
        D.Dialog.copy_picture.Hide();
        d || $(D.Dialog.cancel.GetElement()).hide();
        if (F = document.cookie.match("\\b" + O + "=([^;]*)\\b")) {
            F = F[1].split("/");
            for (var K = {}, N = 0; N < F.length; ++N) {
                var T = F[N].split(":");
                K[T[0]] = T[1]
            }
            F = K
        } else
            F = {};
        C = F;
        C.login && D.Dialog.consent_login.SetValue(!0);
        m();
        q(D.Dialog.signupmode.GetValue());
        t()
    }
    ;
    D.oncommand = function(F) {
        clearLastError();
        switch ("login" == F ? D.Dialog.login_with.GetValue() : F) {
        case "google":
            y();
            break;
        case "email":
        case "twitter":
        case "facebook":
        case "vkontakte":
            B(l()) && r();
            break;
        case "next":
            F = J === E.signup;
            B(F ? k() : l()) && q(F ? E.captcha : E.captcha1);
            break;
        case "join":
            B(k()) && (D.Dialog.signupmode.SetValue("signup"),
            r());
            break;
        case "back":
            J == E.captcha ? q(E.signup) : q(E.login);
            break;
        case "cancel":
            window.logindialog.close()
        }
    }
    ;
    D.onkeypressed = function(F, K) {
        return !0
    }
    ;
    var O = "pclc_consent"
}
!function(b) {
    function d(g) {
        if (e[g])
            return e[g].exports;
        var h = e[g] = {
            i: g,
            l: !1,
            exports: {}
        };
        return b[g].call(h.exports, h, h.exports, d),
        h.l = !0,
        h.exports
    }
    var e = {};
    d.m = b;
    d.c = e;
    d.d = function(g, h, l) {
        d.o(g, h) || Object.defineProperty(g, h, {
            enumerable: !0,
            get: l
        })
    }
    ;
    d.r = function(g) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(g, Symbol.toStringTag, {
            value: "Module"
        });
        Object.defineProperty(g, "__esModule", {
            value: !0
        })
    }
    ;
    d.t = function(g, h) {
        if ((1 & h && (g = d(g)),
        8 & h) || 4 & h && "object" == typeof g && g && g.__esModule)
            return g;
        var l = Object.create(null);
        if (d.r(l),
        Object.defineProperty(l, "default", {
            enumerable: !0,
            value: g
        }),
        2 & h && "string" != typeof g)
            for (var k in g)
                d.d(l, k, function(u) {
                    return g[u]
                }
                .bind(null, k));
        return l
    }
    ;
    d.n = function(g) {
        var h = g && g.__esModule ? function() {
            return g.default
        }
        : function() {
            return g
        }
        ;
        return d.d(h, "a", h),
        h
    }
    ;
    d.o = function(g, h) {
        return Object.prototype.hasOwnProperty.call(g, h)
    }
    ;
    d.p = "";
    d(d.s = 1)
}([function(b, d, e) {
    var g, h, l = e(2), k = e(3), u = (h = [],
    {
        activateTrap: function(m) {
            if (0 < h.length) {
                var t = h[h.length - 1];
                t !== m && t.pause()
            }
            t = h.indexOf(m);
            -1 === t || h.splice(t, 1);
            h.push(m)
        },
        deactivateTrap: function(m) {
            m = h.indexOf(m);
            -1 !== m && h.splice(m, 1);
            0 < h.length && h[h.length - 1].unpause()
        }
    });
    b.exports = function(m, t) {
        function q(I) {
            if (N.active) {
                clearTimeout(g);
                w();
                N.active = !1;
                N.paused = !1;
                u.deactivateTrap(T);
                var Y = I && void 0 !== I.onDeactivate ? I.onDeactivate : K.onDeactivate;
                return Y && Y(),
                (I && void 0 !== I.returnFocus ? I.returnFocus : K.returnFocusOnDeactivate) && setTimeout(function() {
                    var aa;
                    J((aa = N.nodeFocusedBeforeActivation,
                    y("setReturnFocus") || aa))
                }, 0),
                T
            }
        }
        function r() {
            if (N.active)
                return u.activateTrap(T),
                g = setTimeout(function() {
                    J(B())
                }, 0),
                O.addEventListener("focusin", A, !0),
                O.addEventListener("mousedown", x, {
                    capture: !0,
                    passive: !1
                }),
                O.addEventListener("touchstart", x, {
                    capture: !0,
                    passive: !1
                }),
                O.addEventListener("click", C, {
                    capture: !0,
                    passive: !1
                }),
                O.addEventListener("keydown", D, {
                    capture: !0,
                    passive: !1
                }),
                T
        }
        function w() {
            if (N.active)
                return O.removeEventListener("focusin", A, !0),
                O.removeEventListener("mousedown", x, !0),
                O.removeEventListener("touchstart", x, !0),
                O.removeEventListener("click", C, !0),
                O.removeEventListener("keydown", D, !0),
                T
        }
        function y(I) {
            var Y = K[I]
              , aa = Y;
            if (!Y)
                return null;
            if ("string" == typeof Y && !(aa = O.querySelector(Y)))
                throw Error("`" + I + "` refers to no known node");
            if ("function" == typeof Y && !(aa = Y()))
                throw Error("`" + I + "` did not return a node");
            return aa
        }
        function B() {
            var I;
            if (!(I = null !== y("initialFocus") ? y("initialFocus") : F.contains(O.activeElement) ? O.activeElement : N.firstTabbableNode || y("fallbackFocus")))
                throw Error("Your focus-trap needs to have at least one focusable element");
            return I
        }
        function x(I) {
            F.contains(I.target) || (K.clickOutsideDeactivates ? q({
                returnFocus: !l.isFocusable(I.target)
            }) : K.allowOutsideClick && K.allowOutsideClick(I) || I.preventDefault())
        }
        function A(I) {
            F.contains(I.target) || I.target instanceof Document || (I.stopImmediatePropagation(),
            J(N.mostRecentlyFocusedNode || B()))
        }
        function D(I) {
            if (!1 !== K.escapeDeactivates && ("Escape" === I.key || "Esc" === I.key || 27 === I.keyCode))
                return I.preventDefault(),
                void q();
            if ("Tab" === I.key || 9 === I.keyCode)
                (E(),
                I.shiftKey && I.target === N.firstTabbableNode) ? (I.preventDefault(),
                J(N.lastTabbableNode)) : I.shiftKey || I.target !== N.lastTabbableNode || (I.preventDefault(),
                J(N.firstTabbableNode))
        }
        function C(I) {
            K.clickOutsideDeactivates || F.contains(I.target) || K.allowOutsideClick && K.allowOutsideClick(I) || (I.preventDefault(),
            I.stopImmediatePropagation())
        }
        function E() {
            var I = l(F);
            N.firstTabbableNode = I[0] || B();
            N.lastTabbableNode = I[I.length - 1] || B()
        }
        function J(I) {
            I !== O.activeElement && (I && I.focus ? (I.focus(),
            N.mostRecentlyFocusedNode = I,
            I.tagName && "input" === I.tagName.toLowerCase() && "function" == typeof I.select && I.select()) : J(B()))
        }
        var O = document
          , F = "string" == typeof m ? O.querySelector(m) : m
          , K = k({
            returnFocusOnDeactivate: !0,
            escapeDeactivates: !0
        }, t)
          , N = {
            firstTabbableNode: null,
            lastTabbableNode: null,
            nodeFocusedBeforeActivation: null,
            mostRecentlyFocusedNode: null,
            active: !1,
            paused: !1
        }
          , T = {
            activate: function(I) {
                if (!N.active)
                    return E(),
                    N.active = !0,
                    N.paused = !1,
                    N.nodeFocusedBeforeActivation = O.activeElement,
                    (I = I && I.onActivate ? I.onActivate : K.onActivate) && I(),
                    r(),
                    T
            },
            deactivate: q,
            pause: function() {
                !N.paused && N.active && (N.paused = !0,
                w())
            },
            unpause: function() {
                N.paused && N.active && (N.paused = !1,
                E(),
                r())
            }
        };
        return T
    }
}
, function(b, d, e) {
    b.exports = e(4)
}
, function(b, d) {
    function e(q, r) {
        r = r || {};
        var w, y, B = [], x = [], A = q.querySelectorAll(u);
        r.includeContainer && m.call(q, u) && (A = Array.prototype.slice.apply(A)).unshift(q);
        for (q = 0; q < A.length; q++)
            g(w = A[q]) && (0 === (y = l(w)) ? B.push(w) : x.push({
                documentOrder: q,
                tabIndex: y,
                node: w
            }));
        return x.sort(k).map(function(D) {
            return D.node
        }).concat(B)
    }
    function g(q) {
        var r;
        if (!(r = !h(q)) && (r = "INPUT" === q.tagName && "radio" === q.type)) {
            if (q.name) {
                b: {
                    r = q.ownerDocument.querySelectorAll('input[type="radio"][name="' + q.name + '"]');
                    for (var w = 0; w < r.length; w++)
                        if (r[w].checked) {
                            r = r[w];
                            break b
                        }
                    r = void 0
                }
                r = !r || r === q
            } else
                r = !0;
            r = !r
        }
        return !(r || 0 > l(q))
    }
    function h(q) {
        return !(q.disabled || "INPUT" === q.tagName && "hidden" === q.type || null === q.offsetParent || "hidden" === getComputedStyle(q).visibility)
    }
    function l(q) {
        var r = parseInt(q.getAttribute("tabindex"), 10);
        return isNaN(r) ? "true" === q.contentEditable ? 0 : q.tabIndex : r
    }
    function k(q, r) {
        return q.tabIndex === r.tabIndex ? q.documentOrder - r.documentOrder : q.tabIndex - r.tabIndex
    }
    d = 'input select textarea a[href] button [tabindex] audio[controls] video[controls] [contenteditable]:not([contenteditable="false"])'.split(" ");
    var u = d.join(",")
      , m = "undefined" == typeof Element ? function() {}
    : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    e.isTabbable = function(q) {
        if (!q)
            throw Error("No node provided");
        return !1 !== m.call(q, u) && g(q)
    }
    ;
    e.isFocusable = function(q) {
        if (!q)
            throw Error("No node provided");
        return !1 !== m.call(q, t) && h(q)
    }
    ;
    var t = d.concat("iframe").join(",");
    b.exports = e
}
, function(b, d) {
    b.exports = function() {
        for (var g = {}, h = 0; h < arguments.length; h++) {
            var l = arguments[h], k;
            for (k in l)
                e.call(l, k) && (g[k] = l[k])
        }
        return g
    }
    ;
    var e = Object.prototype.hasOwnProperty
}
, function(b, d, e) {
    function g(v, f) {
        function a() {
            this.constructor = v
        }
        B(v, f);
        v.prototype = null === f ? Object.create(f) : (a.prototype = f.prototype,
        new a)
    }
    function h(v) {
        var f = "function" == typeof Symbol && Symbol.iterator
          , a = f && v[f]
          , c = 0;
        if (a)
            return a.call(v);
        if (v && "number" == typeof v.length)
            return {
                next: function() {
                    return v && c >= v.length && (v = void 0),
                    {
                        value: v && v[c++],
                        done: !v
                    }
                }
            };
        throw new TypeError(f ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function l(v, f) {
        var a = "function" == typeof Symbol && v[Symbol.iterator];
        if (!a)
            return v;
        var c;
        v = a.call(v);
        var p = [];
        try {
            for (; (void 0 === f || 0 < f--) && !(c = v.next()).done; )
                p.push(c.value)
        } catch (G) {
            var z = {
                error: G
            }
        } finally {
            try {
                c && !c.done && (a = v.return) && a.call(v)
            } finally {
                if (z)
                    throw z.error;
            }
        }
        return p
    }
    function k() {
        for (var v = [], f = 0; f < arguments.length; f++)
            v = v.concat(l(arguments[f]));
        return v
    }
    function u(v, f) {
        if (v.document && "function" == typeof v.document.createElement && f in D) {
            v = v.document.createElement("div");
            f = D[f];
            var a = f.standard
              , c = f.prefixed;
            return f.cssProperty in v.style ? a : c
        }
        return f
    }
    function m(v, f) {
        if (v.closest)
            return v.closest(f);
        for (; v; ) {
            if (t(v, f))
                return v;
            v = v.parentElement
        }
        return null
    }
    function t(v, f) {
        return (v.matches || v.webkitMatchesSelector || v.msMatchesSelector).call(v, f)
    }
    function q(v, f) {
        if (void 0 === v && (v = window),
        void 0 === f && (f = !1),
        void 0 === O || f) {
            var a = !1;
            try {
                v.document.addEventListener("test", function() {}, {
                    get passive() {
                        return a = !0
                    }
                })
            } catch (c) {}
            O = a
        }
        return !!O && {
            passive: !0
        }
    }
    function r(v) {
        v.addEventListener("click", function() {
            this.classList.toggle("ge");
            var f = this.nextElementSibling;
            f.style.maxHeight ? f.style.maxHeight = null : f.style.maxHeight = f.scrollHeight + "px"
        })
    }
    function w(v) {
        this.open && (this.open = !1);
        this.setAnchorElement(v);
        this.setFixedPosition(!0);
        this.open = !0
    }
    function y(v, f, a) {
        v = v.getElementsByClassName(f);
        for (f = 0; f < v.length; ++f)
            new a(v[f])
    }
    e.r(d);
    var B = function(v, f) {
        return (B = Object.setPrototypeOf || {
            __proto__: []
        }instanceof Array && function(a, c) {
            a.__proto__ = c
        }
        || function(a, c) {
            for (var p in c)
                c.hasOwnProperty(p) && (a[p] = c[p])
        }
        )(v, f)
    }, x = function() {
        return (x = Object.assign || function(v) {
            for (var f, a = 1, c = arguments.length; a < c; a++)
                for (var p in f = arguments[a])
                    Object.prototype.hasOwnProperty.call(f, p) && (v[p] = f[p]);
            return v
        }
        ).apply(this, arguments)
    }, A = {
        animation: {
            prefixed: "-webkit-animation",
            standard: "animation"
        },
        transform: {
            prefixed: "-webkit-transform",
            standard: "transform"
        },
        transition: {
            prefixed: "-webkit-transition",
            standard: "transition"
        }
    }, D = {
        animationend: {
            cssProperty: "animation",
            prefixed: "webkitAnimationEnd",
            standard: "animationend"
        },
        animationiteration: {
            cssProperty: "animation",
            prefixed: "webkitAnimationIteration",
            standard: "animationiteration"
        },
        animationstart: {
            cssProperty: "animation",
            prefixed: "webkitAnimationStart",
            standard: "animationstart"
        },
        transitionend: {
            cssProperty: "transition",
            prefixed: "webkitTransitionEnd",
            standard: "transitionend"
        }
    }, C = function() {
        function v(f) {
            void 0 === f && (f = {});
            this.adapter_ = f
        }
        return Object.defineProperty(v, "cssClasses", {
            get: function() {
                return {}
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(v, "strings", {
            get: function() {
                return {}
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(v, "numbers", {
            get: function() {
                return {}
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(v, "defaultAdapter", {
            get: function() {
                return {}
            },
            enumerable: !0,
            configurable: !0
        }),
        v.prototype.init = function() {}
        ,
        v.prototype.destroy = function() {}
        ,
        v
    }(), E = function() {
        function v(f, a) {
            for (var c = [], p = 2; p < arguments.length; p++)
                c[p - 2] = arguments[p];
            this.root_ = f;
            this.initialize.apply(this, k(c));
            this.foundation_ = void 0 === a ? this.getDefaultFoundation() : a;
            this.foundation_.init();
            this.initialSyncWithDOM()
        }
        return v.attachTo = function(f) {
            return new v(f,new C({}))
        }
        ,
        v.prototype.initialize = function() {
            for (var f = 0; f < arguments.length; f++)
                ;
        }
        ,
        v.prototype.getDefaultFoundation = function() {
            throw Error("Subclasses must override getDefaultFoundation to return a properly configured foundation class");
        }
        ,
        v.prototype.initialSyncWithDOM = function() {}
        ,
        v.prototype.destroy = function() {
            this.foundation_.destroy()
        }
        ,
        v.prototype.listen = function(f, a) {
            this.root_.addEventListener(f, a)
        }
        ,
        v.prototype.unlisten = function(f, a) {
            this.root_.removeEventListener(f, a)
        }
        ,
        v.prototype.emit = function(f, a, c) {
            var p;
            void 0 === c && (c = !1);
            "function" == typeof CustomEvent ? p = new CustomEvent(f,{
                bubbles: c,
                detail: a
            }) : (p = document.createEvent("CustomEvent")).initCustomEvent(f, c, !1, a);
            this.root_.dispatchEvent(p)
        }
        ,
        v
    }(), J, O, F = {
        BG_FOCUSED: "p1",
        FG_ACTIVATION: "w1",
        FG_DEACTIVATION: "x1",
        ROOT: "o1",
        UNBOUNDED: "v1"
    }, K = {
        VAR_FG_SCALE: "--mdc-ripple-fg-scale",
        VAR_FG_SIZE: "--mdc-ripple-fg-size",
        VAR_FG_TRANSLATE_END: "--mdc-ripple-fg-translate-end",
        VAR_FG_TRANSLATE_START: "--mdc-ripple-fg-translate-start",
        VAR_LEFT: "--mdc-ripple-left",
        VAR_TOP: "--mdc-ripple-top"
    }, N = {
        DEACTIVATION_TIMEOUT_MS: 0,
        FG_DEACTIVATION_MS: 0,
        INITIAL_ORIGIN_SCALE: .6,
        PADDING: 10,
        TAP_DELAY_MS: 0
    }, T = ["touchstart", "pointerdown", "mousedown", "keydown"], I = ["touchend", "pointerup", "mouseup", "contextmenu"], Y = [], aa = function(v) {
        function f(a) {
            var c = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return c.activationAnimationHasEnded_ = !1,
            c.activationTimer_ = 0,
            c.fgDeactivationRemovalTimer_ = 0,
            c.fgScale_ = "0",
            c.frame_ = {
                width: 0,
                height: 0
            },
            c.initialSize_ = 0,
            c.layoutFrame_ = 0,
            c.maxRadius_ = 0,
            c.unboundedCoords_ = {
                left: 0,
                top: 0
            },
            c.activationState_ = c.defaultActivationState_(),
            c.activationTimerCallback_ = function() {
                c.activationAnimationHasEnded_ = !0;
                c.runDeactivationUXLogicIfReady_()
            }
            ,
            c.activateHandler_ = function(p) {
                return c.activate_(p)
            }
            ,
            c.deactivateHandler_ = function() {
                return c.deactivate_()
            }
            ,
            c.focusHandler_ = function() {
                return c.handleFocus()
            }
            ,
            c.blurHandler_ = function() {
                return c.handleBlur()
            }
            ,
            c.resizeHandler_ = function() {
                return c.layout()
            }
            ,
            c
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return F
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return K
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return N
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    browserSupportsCssVars: function() {
                        return !0
                    },
                    computeBoundingRect: function() {
                        return {
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            width: 0,
                            height: 0
                        }
                    },
                    containsEventTarget: function() {
                        return !0
                    },
                    deregisterDocumentInteractionHandler: function() {},
                    deregisterInteractionHandler: function() {},
                    deregisterResizeHandler: function() {},
                    getWindowPageOffset: function() {
                        return {
                            x: 0,
                            y: 0
                        }
                    },
                    isSurfaceActive: function() {
                        return !0
                    },
                    isSurfaceDisabled: function() {
                        return !0
                    },
                    isUnbounded: function() {
                        return !0
                    },
                    registerDocumentInteractionHandler: function() {},
                    registerInteractionHandler: function() {},
                    registerResizeHandler: function() {},
                    removeClass: function() {},
                    updateCssVariable: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            var a = this
              , c = this.supportsPressRipple_();
            if (this.registerRootHandlers_(c),
            c) {
                c = f.cssClasses;
                var p = c.ROOT
                  , z = c.UNBOUNDED;
                requestAnimationFrame(function() {
                    a.adapter_.addClass(p);
                    a.adapter_.isUnbounded() && (a.adapter_.addClass(z),
                    a.layoutInternal_())
                })
            }
        }
        ,
        f.prototype.destroy = function() {
            var a = this;
            if (this.supportsPressRipple_()) {
                this.activationTimer_ && (clearTimeout(this.activationTimer_),
                this.activationTimer_ = 0,
                this.adapter_.removeClass(f.cssClasses.FG_ACTIVATION));
                this.fgDeactivationRemovalTimer_ && (clearTimeout(this.fgDeactivationRemovalTimer_),
                this.fgDeactivationRemovalTimer_ = 0,
                this.adapter_.removeClass(f.cssClasses.FG_DEACTIVATION));
                var c = f.cssClasses
                  , p = c.ROOT
                  , z = c.UNBOUNDED;
                requestAnimationFrame(function() {
                    a.adapter_.removeClass(p);
                    a.adapter_.removeClass(z);
                    a.removeCssVars_()
                })
            }
            this.deregisterRootHandlers_();
            this.deregisterDeactivationHandlers_()
        }
        ,
        f.prototype.activate = function(a) {
            this.activate_(a)
        }
        ,
        f.prototype.deactivate = function() {
            this.deactivate_()
        }
        ,
        f.prototype.layout = function() {
            var a = this;
            this.layoutFrame_ && cancelAnimationFrame(this.layoutFrame_);
            this.layoutFrame_ = requestAnimationFrame(function() {
                a.layoutInternal_();
                a.layoutFrame_ = 0
            })
        }
        ,
        f.prototype.setUnbounded = function(a) {
            var c = f.cssClasses.UNBOUNDED;
            a ? this.adapter_.addClass(c) : this.adapter_.removeClass(c)
        }
        ,
        f.prototype.handleFocus = function() {
            var a = this;
            requestAnimationFrame(function() {
                return a.adapter_.addClass(f.cssClasses.BG_FOCUSED)
            })
        }
        ,
        f.prototype.handleBlur = function() {
            var a = this;
            requestAnimationFrame(function() {
                return a.adapter_.removeClass(f.cssClasses.BG_FOCUSED)
            })
        }
        ,
        f.prototype.supportsPressRipple_ = function() {
            return this.adapter_.browserSupportsCssVars()
        }
        ,
        f.prototype.defaultActivationState_ = function() {
            return {
                activationEvent: void 0,
                hasDeactivationUXRun: !1,
                isActivated: !1,
                isProgrammatic: !1,
                wasActivatedByPointer: !1,
                wasElementMadeActive: !1
            }
        }
        ,
        f.prototype.registerRootHandlers_ = function(a) {
            var c = this;
            a && (T.forEach(function(p) {
                c.adapter_.registerInteractionHandler(p, c.activateHandler_)
            }),
            this.adapter_.isUnbounded() && this.adapter_.registerResizeHandler(this.resizeHandler_));
            this.adapter_.registerInteractionHandler("focus", this.focusHandler_);
            this.adapter_.registerInteractionHandler("blur", this.blurHandler_)
        }
        ,
        f.prototype.registerDeactivationHandlers_ = function(a) {
            var c = this;
            "keydown" === a.type ? this.adapter_.registerInteractionHandler("keyup", this.deactivateHandler_) : I.forEach(function(p) {
                c.adapter_.registerDocumentInteractionHandler(p, c.deactivateHandler_)
            })
        }
        ,
        f.prototype.deregisterRootHandlers_ = function() {
            var a = this;
            T.forEach(function(c) {
                a.adapter_.deregisterInteractionHandler(c, a.activateHandler_)
            });
            this.adapter_.deregisterInteractionHandler("focus", this.focusHandler_);
            this.adapter_.deregisterInteractionHandler("blur", this.blurHandler_);
            this.adapter_.isUnbounded() && this.adapter_.deregisterResizeHandler(this.resizeHandler_)
        }
        ,
        f.prototype.deregisterDeactivationHandlers_ = function() {
            var a = this;
            this.adapter_.deregisterInteractionHandler("keyup", this.deactivateHandler_);
            I.forEach(function(c) {
                a.adapter_.deregisterDocumentInteractionHandler(c, a.deactivateHandler_)
            })
        }
        ,
        f.prototype.removeCssVars_ = function() {
            var a = this
              , c = f.strings;
            Object.keys(c).forEach(function(p) {
                0 === p.indexOf("VAR_") && a.adapter_.updateCssVariable(c[p], null)
            })
        }
        ,
        f.prototype.activate_ = function(a) {
            var c = this;
            if (!this.adapter_.isSurfaceDisabled()) {
                var p = this.activationState_;
                if (!p.isActivated) {
                    var z = this.previousActivationEvent_;
                    z && void 0 !== a && z.type !== a.type || (p.isActivated = !0,
                    p.isProgrammatic = void 0 === a,
                    p.activationEvent = a,
                    p.wasActivatedByPointer = !p.isProgrammatic && void 0 !== a && ("mousedown" === a.type || "touchstart" === a.type || "pointerdown" === a.type),
                    void 0 !== a && 0 < Y.length && Y.some(function(G) {
                        return c.adapter_.containsEventTarget(G)
                    }) ? this.resetActivationState_() : (void 0 !== a && (Y.push(a.target),
                    this.registerDeactivationHandlers_(a)),
                    p.wasElementMadeActive = this.checkElementMadeActive_(a),
                    p.wasElementMadeActive && this.animateActivation_(),
                    requestAnimationFrame(function() {
                        Y = [];
                        p.wasElementMadeActive || void 0 === a || " " !== a.key && 32 !== a.keyCode || (p.wasElementMadeActive = c.checkElementMadeActive_(a),
                        p.wasElementMadeActive && c.animateActivation_());
                        p.wasElementMadeActive || (c.activationState_ = c.defaultActivationState_())
                    })))
                }
            }
        }
        ,
        f.prototype.checkElementMadeActive_ = function(a) {
            return void 0 === a || "keydown" !== a.type || this.adapter_.isSurfaceActive()
        }
        ,
        f.prototype.animateActivation_ = function() {
            var a = this
              , c = f.strings
              , p = c.VAR_FG_TRANSLATE_START;
            c = c.VAR_FG_TRANSLATE_END;
            var z = f.cssClasses
              , G = z.FG_DEACTIVATION;
            z = z.FG_ACTIVATION;
            var H = f.numbers.DEACTIVATION_TIMEOUT_MS;
            this.layoutInternal_();
            var M = ""
              , L = "";
            this.adapter_.isUnbounded() || (L = this.getFgTranslationCoordinates_(),
            M = L.startPoint,
            L = L.endPoint,
            M = M.x + "px, " + M.y + "px",
            L = L.x + "px, " + L.y + "px");
            this.adapter_.updateCssVariable(p, M);
            this.adapter_.updateCssVariable(c, L);
            clearTimeout(this.activationTimer_);
            clearTimeout(this.fgDeactivationRemovalTimer_);
            this.rmBoundedActivationClasses_();
            this.adapter_.removeClass(G);
            this.adapter_.computeBoundingRect();
            this.adapter_.addClass(z);
            this.activationTimer_ = setTimeout(function() {
                return a.activationTimerCallback_()
            }, 0)
        }
        ,
        f.prototype.getFgTranslationCoordinates_ = function() {
            var a, c = this.activationState_, p = c.activationEvent;
            if (c.wasActivatedByPointer) {
                var z = this.adapter_.getWindowPageOffset()
                  , G = this.adapter_.computeBoundingRect();
                p ? (c = z.x + G.left,
                z = z.y + G.top,
                "touchstart" === p.type ? (c = p.changedTouches[0].pageX - c,
                p = p.changedTouches[0].pageY - z) : (c = p.pageX - c,
                p = p.pageY - z),
                p = {
                    x: c,
                    y: p
                }) : p = {
                    x: 0,
                    y: 0
                }
            } else
                p = {
                    x: this.frame_.width / 2,
                    y: this.frame_.height / 2
                };
            return {
                startPoint: {
                    x: (a = p).x - this.initialSize_ / 2,
                    y: a.y - this.initialSize_ / 2
                },
                endPoint: {
                    x: this.frame_.width / 2 - this.initialSize_ / 2,
                    y: this.frame_.height / 2 - this.initialSize_ / 2
                }
            }
        }
        ,
        f.prototype.runDeactivationUXLogicIfReady_ = function() {
            var a = this
              , c = f.cssClasses.FG_DEACTIVATION
              , p = this.activationState_
              , z = p.isActivated;
            (p.hasDeactivationUXRun || !z) && this.activationAnimationHasEnded_ && (this.rmBoundedActivationClasses_(),
            this.adapter_.addClass(c),
            this.fgDeactivationRemovalTimer_ = setTimeout(function() {
                a.adapter_.removeClass(c)
            }, 0))
        }
        ,
        f.prototype.rmBoundedActivationClasses_ = function() {
            this.adapter_.removeClass(f.cssClasses.FG_ACTIVATION);
            this.activationAnimationHasEnded_ = !1;
            this.adapter_.computeBoundingRect()
        }
        ,
        f.prototype.resetActivationState_ = function() {
            var a = this;
            this.previousActivationEvent_ = this.activationState_.activationEvent;
            this.activationState_ = this.defaultActivationState_();
            setTimeout(function() {
                return a.previousActivationEvent_ = void 0
            }, 0)
        }
        ,
        f.prototype.deactivate_ = function() {
            var a = this
              , c = this.activationState_;
            if (c.isActivated) {
                var p = x({}, c);
                c.isProgrammatic ? (requestAnimationFrame(function() {
                    return a.animateDeactivation_(p)
                }),
                this.resetActivationState_()) : (this.deregisterDeactivationHandlers_(),
                requestAnimationFrame(function() {
                    a.activationState_.hasDeactivationUXRun = !0;
                    a.animateDeactivation_(p);
                    a.resetActivationState_()
                }))
            }
        }
        ,
        f.prototype.animateDeactivation_ = function(a) {
            var c = a.wasElementMadeActive;
            (a.wasActivatedByPointer || c) && this.runDeactivationUXLogicIfReady_()
        }
        ,
        f.prototype.layoutInternal_ = function() {
            this.frame_ = this.adapter_.computeBoundingRect();
            var a = Math.max(this.frame_.height, this.frame_.width);
            this.maxRadius_ = this.adapter_.isUnbounded() ? a : Math.sqrt(Math.pow(this.frame_.width, 2) + Math.pow(this.frame_.height, 2)) + f.numbers.PADDING;
            this.initialSize_ = Math.floor(a * f.numbers.INITIAL_ORIGIN_SCALE);
            this.fgScale_ = "" + this.maxRadius_ / this.initialSize_;
            this.updateLayoutCssVars_()
        }
        ,
        f.prototype.updateLayoutCssVars_ = function() {
            var a = f.strings
              , c = a.VAR_LEFT
              , p = a.VAR_TOP
              , z = a.VAR_FG_SCALE;
            this.adapter_.updateCssVariable(a.VAR_FG_SIZE, this.initialSize_ + "px");
            this.adapter_.updateCssVariable(z, this.fgScale_);
            this.adapter_.isUnbounded() && (this.unboundedCoords_ = {
                left: Math.round(this.frame_.width / 2 - this.initialSize_ / 2),
                top: Math.round(this.frame_.height / 2 - this.initialSize_ / 2)
            },
            this.adapter_.updateCssVariable(c, this.unboundedCoords_.left + "px"),
            this.adapter_.updateCssVariable(p, this.unboundedCoords_.top + "px"))
        }
        ,
        f
    }(C), ba = function(v) {
        function f() {
            var a = null !== v && v.apply(this, arguments) || this;
            return a.disabled = !1,
            a
        }
        return g(f, v),
        f.attachTo = function(a, c) {
            void 0 === c && (c = {
                isUnbounded: void 0
            });
            a = new f(a);
            return void 0 !== c.isUnbounded && (a.unbounded = c.isUnbounded),
            a
        }
        ,
        f.createAdapter = function(a) {
            return {
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                browserSupportsCssVars: function() {
                    var c = window;
                    var p = void 0;
                    void 0 === p && (p = !1);
                    var z = c.CSS
                      , G = J;
                    if ("boolean" != typeof J || p)
                        if (z && "function" == typeof z.supports) {
                            var H = z.supports("--css-vars", "yes");
                            z = z.supports("(--css-vars: yes)") && z.supports("color", "#00000000");
                            if (H = !(!H && !z))
                                z = c.document,
                                H = z.createElement("div"),
                                H.className = "v0",
                                z.body.appendChild(H),
                                c = c.getComputedStyle(H),
                                c = null !== c && "solid" === c.borderTopStyle,
                                H = !(H.parentNode && H.parentNode.removeChild(H),
                                c);
                            p = (G = H,
                            p || (J = G),
                            G)
                        } else
                            p = !1;
                    else
                        p = J;
                    return p
                },
                computeBoundingRect: function() {
                    return a.root_.getBoundingClientRect()
                },
                containsEventTarget: function(c) {
                    return a.root_.contains(c)
                },
                deregisterDocumentInteractionHandler: function(c, p) {
                    return document.documentElement.removeEventListener(c, p, q())
                },
                deregisterInteractionHandler: function(c, p) {
                    return a.root_.removeEventListener(c, p, q())
                },
                deregisterResizeHandler: function(c) {
                    return window.removeEventListener("resize", c)
                },
                getWindowPageOffset: function() {
                    return {
                        x: window.pageXOffset,
                        y: window.pageYOffset
                    }
                },
                isSurfaceActive: function() {
                    return t(a.root_, ":active")
                },
                isSurfaceDisabled: function() {
                    return !!a.disabled
                },
                isUnbounded: function() {
                    return !!a.unbounded
                },
                registerDocumentInteractionHandler: function(c, p) {
                    return document.documentElement.addEventListener(c, p, q())
                },
                registerInteractionHandler: function(c, p) {
                    return a.root_.addEventListener(c, p, q())
                },
                registerResizeHandler: function(c) {
                    return window.addEventListener("resize", c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                updateCssVariable: function(c, p) {
                    return a.root_.style.setProperty(c, p)
                }
            }
        }
        ,
        Object.defineProperty(f.prototype, "unbounded", {
            get: function() {
                return !!this.unbounded_
            },
            set: function(a) {
                this.unbounded_ = !!a;
                this.setUnbounded_()
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.activate = function() {
            this.foundation_.activate()
        }
        ,
        f.prototype.deactivate = function() {
            this.foundation_.deactivate()
        }
        ,
        f.prototype.layout = function() {
            this.foundation_.layout()
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            return new aa(f.createAdapter(this))
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            this.unbounded = "mdcRippleIsUnbounded"in this.root_.dataset
        }
        ,
        f.prototype.setUnbounded_ = function() {
            this.foundation_.setUnbounded(!!this.unbounded_)
        }
        ,
        f
    }(E), wa = {
        ANIM_CHECKED_INDETERMINATE: "j2--anim-checked-indeterminate",
        ANIM_CHECKED_UNCHECKED: "n2",
        ANIM_INDETERMINATE_CHECKED: "t2",
        ANIM_INDETERMINATE_UNCHECKED: "o2",
        ANIM_UNCHECKED_CHECKED: "m2",
        ANIM_UNCHECKED_INDETERMINATE: "j2--anim-unchecked-indeterminate",
        BACKGROUND: "l2",
        CHECKED: "j2--checked",
        CHECKMARK: "p2",
        CHECKMARK_PATH: "s2",
        DISABLED: "q2",
        INDETERMINATE: "j2--indeterminate",
        MIXEDMARK: "j2__mixedmark",
        NATIVE_CONTROL: "k2",
        ROOT: "j2",
        SELECTED: "j2--selected",
        UPGRADED: "r2"
    }, ca = {
        ARIA_CHECKED_ATTR: "aria-checked",
        ARIA_CHECKED_INDETERMINATE_VALUE: "mixed",
        NATIVE_CONTROL_SELECTOR: ".k2",
        TRANSITION_STATE_CHECKED: "checked",
        TRANSITION_STATE_INDETERMINATE: "indeterminate",
        TRANSITION_STATE_INIT: "init",
        TRANSITION_STATE_UNCHECKED: "unchecked"
    }, Ja = {
        ANIM_END_LATCH_MS: 0
    }, Ka = function(v) {
        function f(a) {
            a = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return a.currentCheckState_ = ca.TRANSITION_STATE_INIT,
            a.currentAnimationClass_ = "",
            a.animEndLatchTimer_ = 0,
            a.enableAnimationEndHandler_ = !1,
            a
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return wa
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return ca
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return Ja
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    forceLayout: function() {},
                    hasNativeControl: function() {
                        return !1
                    },
                    isAttachedToDOM: function() {
                        return !1
                    },
                    isChecked: function() {
                        return !1
                    },
                    isIndeterminate: function() {
                        return !1
                    },
                    removeClass: function() {},
                    removeNativeControlAttr: function() {},
                    setNativeControlAttr: function() {},
                    setNativeControlDisabled: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            this.currentCheckState_ = this.determineCheckState_();
            this.updateAriaChecked_();
            this.adapter_.addClass(wa.UPGRADED)
        }
        ,
        f.prototype.destroy = function() {
            clearTimeout(this.animEndLatchTimer_)
        }
        ,
        f.prototype.setDisabled = function(a) {
            this.adapter_.setNativeControlDisabled(a);
            a ? this.adapter_.addClass(wa.DISABLED) : this.adapter_.removeClass(wa.DISABLED)
        }
        ,
        f.prototype.handleAnimationEnd = function() {
            var a = this;
            this.enableAnimationEndHandler_ && (clearTimeout(this.animEndLatchTimer_),
            this.animEndLatchTimer_ = setTimeout(function() {
                a.adapter_.removeClass(a.currentAnimationClass_);
                a.enableAnimationEndHandler_ = !1
            }, 0))
        }
        ,
        f.prototype.handleChange = function() {
            this.transitionCheckState_()
        }
        ,
        f.prototype.transitionCheckState_ = function() {
            if (this.adapter_.hasNativeControl()) {
                var a = this.currentCheckState_
                  , c = this.determineCheckState_();
                if (a !== c) {
                    this.updateAriaChecked_();
                    var p = wa.SELECTED;
                    c === ca.TRANSITION_STATE_UNCHECKED ? this.adapter_.removeClass(p) : this.adapter_.addClass(p);
                    0 < this.currentAnimationClass_.length && (clearTimeout(this.animEndLatchTimer_),
                    this.adapter_.forceLayout(),
                    this.adapter_.removeClass(this.currentAnimationClass_));
                    this.currentAnimationClass_ = this.getTransitionAnimationClass_(a, c);
                    this.currentCheckState_ = c;
                    this.adapter_.isAttachedToDOM() && 0 < this.currentAnimationClass_.length && (this.adapter_.addClass(this.currentAnimationClass_),
                    this.enableAnimationEndHandler_ = !0)
                }
            }
        }
        ,
        f.prototype.determineCheckState_ = function() {
            var a = ca.TRANSITION_STATE_INDETERMINATE
              , c = ca.TRANSITION_STATE_CHECKED
              , p = ca.TRANSITION_STATE_UNCHECKED;
            return this.adapter_.isIndeterminate() ? a : this.adapter_.isChecked() ? c : p
        }
        ,
        f.prototype.getTransitionAnimationClass_ = function(a, c) {
            var p = ca.TRANSITION_STATE_INIT
              , z = ca.TRANSITION_STATE_CHECKED
              , G = ca.TRANSITION_STATE_UNCHECKED
              , H = f.cssClasses
              , M = H.ANIM_UNCHECKED_CHECKED
              , L = H.ANIM_UNCHECKED_INDETERMINATE
              , Q = H.ANIM_CHECKED_UNCHECKED
              , fa = H.ANIM_CHECKED_INDETERMINATE
              , na = H.ANIM_INDETERMINATE_CHECKED;
            H = H.ANIM_INDETERMINATE_UNCHECKED;
            switch (a) {
            case p:
                return c === G ? "" : c === z ? na : H;
            case G:
                return c === z ? M : L;
            case z:
                return c === G ? Q : fa;
            default:
                return c === z ? na : H
            }
        }
        ,
        f.prototype.updateAriaChecked_ = function() {
            this.adapter_.isIndeterminate() ? this.adapter_.setNativeControlAttr(ca.ARIA_CHECKED_ATTR, ca.ARIA_CHECKED_INDETERMINATE_VALUE) : this.adapter_.removeNativeControlAttr(ca.ARIA_CHECKED_ATTR)
        }
        ,
        f
    }(C), La = ["checked", "indeterminate"], jb = function(v) {
        function f() {
            var a = null !== v && v.apply(this, arguments) || this;
            return a.ripple_ = a.createRipple_(),
            a
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "ripple", {
            get: function() {
                return this.ripple_
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "checked", {
            get: function() {
                return this.nativeControl_.checked
            },
            set: function(a) {
                this.nativeControl_.checked = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "indeterminate", {
            get: function() {
                return this.nativeControl_.indeterminate
            },
            set: function(a) {
                this.nativeControl_.indeterminate = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "disabled", {
            get: function() {
                return this.nativeControl_.disabled
            },
            set: function(a) {
                this.foundation_.setDisabled(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "value", {
            get: function() {
                return this.nativeControl_.value
            },
            set: function(a) {
                this.nativeControl_.value = a
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.initialSyncWithDOM = function() {
            var a = this;
            this.handleChange_ = function() {
                return a.foundation_.handleChange()
            }
            ;
            this.handleAnimationEnd_ = function() {
                return a.foundation_.handleAnimationEnd()
            }
            ;
            this.nativeControl_.addEventListener("change", this.handleChange_);
            this.listen(u(window, "animationend"), this.handleAnimationEnd_);
            this.installPropertyChangeHooks_()
        }
        ,
        f.prototype.destroy = function() {
            this.ripple_.destroy();
            this.nativeControl_.removeEventListener("change", this.handleChange_);
            this.unlisten(u(window, "animationend"), this.handleAnimationEnd_);
            this.uninstallPropertyChangeHooks_();
            v.prototype.destroy.call(this)
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Ka({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                forceLayout: function() {
                    return a.root_.offsetWidth
                },
                hasNativeControl: function() {
                    return !!a.nativeControl_
                },
                isAttachedToDOM: function() {
                    return !!a.root_.parentNode
                },
                isChecked: function() {
                    return a.checked
                },
                isIndeterminate: function() {
                    return a.indeterminate
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                removeNativeControlAttr: function(c) {
                    return a.nativeControl_.removeAttribute(c)
                },
                setNativeControlAttr: function(c, p) {
                    return a.nativeControl_.setAttribute(c, p)
                },
                setNativeControlDisabled: function(c) {
                    return a.nativeControl_.disabled = c
                }
            })
        }
        ,
        f.prototype.createRipple_ = function() {
            var a = this
              , c = x({}, ba.createAdapter(this), {
                deregisterInteractionHandler: function(p, z) {
                    return a.nativeControl_.removeEventListener(p, z)
                },
                isSurfaceActive: function() {
                    return t(a.nativeControl_, ":active")
                },
                isUnbounded: function() {
                    return !0
                },
                registerInteractionHandler: function(p, z) {
                    return a.nativeControl_.addEventListener(p, z)
                }
            });
            return new ba(this.root_,new aa(c))
        }
        ,
        f.prototype.installPropertyChangeHooks_ = function() {
            var a = this
              , c = this.nativeControl_
              , p = Object.getPrototypeOf(c);
            La.forEach(function(z) {
                var G = Object.getOwnPropertyDescriptor(p, z);
                G && "function" == typeof G.set && Object.defineProperty(c, z, {
                    configurable: G.configurable,
                    enumerable: G.enumerable,
                    get: G.get,
                    set: function(H) {
                        G.set.call(c, H);
                        a.foundation_.handleChange()
                    }
                })
            })
        }
        ,
        f.prototype.uninstallPropertyChangeHooks_ = function() {
            var a = this.nativeControl_
              , c = Object.getPrototypeOf(a);
            La.forEach(function(p) {
                var z = Object.getOwnPropertyDescriptor(c, p);
                z && "function" == typeof z.set && Object.defineProperty(a, p, z)
            })
        }
        ,
        Object.defineProperty(f.prototype, "nativeControl_", {
            get: function() {
                var a = Ka.strings.NATIVE_CONTROL_SELECTOR
                  , c = this.root_.querySelector(a);
                if (!c)
                    throw Error("Checkbox component requires a " + a + " element");
                return c
            },
            enumerable: !0,
            configurable: !0
        }),
        f
    }(E), xa = {
        CHECKED: "y6",
        DISABLED: "c7"
    }, kb = {
        NATIVE_CONTROL_SELECTOR: ".a7",
        RIPPLE_SURFACE_SELECTOR: ".b7"
    }, Da = function(v) {
        function f(a) {
            return v.call(this, x({}, f.defaultAdapter, a)) || this
        }
        return g(f, v),
        Object.defineProperty(f, "strings", {
            get: function() {
                return kb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return xa
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    setNativeControlChecked: function() {},
                    setNativeControlDisabled: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.setChecked = function(a) {
            this.adapter_.setNativeControlChecked(a);
            this.updateCheckedStyling_(a)
        }
        ,
        f.prototype.setDisabled = function(a) {
            this.adapter_.setNativeControlDisabled(a);
            a ? this.adapter_.addClass(xa.DISABLED) : this.adapter_.removeClass(xa.DISABLED)
        }
        ,
        f.prototype.handleChange = function(a) {
            this.updateCheckedStyling_(a.target.checked)
        }
        ,
        f.prototype.updateCheckedStyling_ = function(a) {
            a ? this.adapter_.addClass(xa.CHECKED) : this.adapter_.removeClass(xa.CHECKED)
        }
        ,
        f
    }(C), lb = function(v) {
        function f() {
            var a = null !== v && v.apply(this, arguments) || this;
            return a.ripple_ = a.createRipple_(),
            a
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.destroy = function() {
            v.prototype.destroy.call(this);
            this.ripple_.destroy();
            this.nativeControl_.removeEventListener("change", this.changeHandler_)
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            var a = this;
            this.changeHandler_ = function() {
                for (var c, p = [], z = 0; z < arguments.length; z++)
                    p[z] = arguments[z];
                return (c = a.foundation_).handleChange.apply(c, k(p))
            }
            ;
            this.nativeControl_.addEventListener("change", this.changeHandler_);
            this.checked = this.checked
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Da({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                setNativeControlChecked: function(c) {
                    return a.nativeControl_.checked = c
                },
                setNativeControlDisabled: function(c) {
                    return a.nativeControl_.disabled = c
                }
            })
        }
        ,
        Object.defineProperty(f.prototype, "ripple", {
            get: function() {
                return this.ripple_
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "checked", {
            get: function() {
                return this.nativeControl_.checked
            },
            set: function(a) {
                this.foundation_.setChecked(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "disabled", {
            get: function() {
                return this.nativeControl_.disabled
            },
            set: function(a) {
                this.foundation_.setDisabled(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.createRipple_ = function() {
            var a = this
              , c = this.root_.querySelector(Da.strings.RIPPLE_SURFACE_SELECTOR)
              , p = x({}, ba.createAdapter(this), {
                addClass: function(z) {
                    return c.classList.add(z)
                },
                computeBoundingRect: function() {
                    return c.getBoundingClientRect()
                },
                deregisterInteractionHandler: function(z, G) {
                    a.nativeControl_.removeEventListener(z, G)
                },
                isSurfaceActive: function() {
                    return t(a.nativeControl_, ":active")
                },
                isUnbounded: function() {
                    return !0
                },
                registerInteractionHandler: function(z, G) {
                    a.nativeControl_.addEventListener(z, G)
                },
                removeClass: function(z) {
                    return c.classList.remove(z)
                },
                updateCssVariable: function(z, G) {
                    c.style.setProperty(z, G)
                }
            });
            return new ba(this.root_,new aa(p))
        }
        ,
        Object.defineProperty(f.prototype, "nativeControl_", {
            get: function() {
                return this.root_.querySelector(Da.strings.NATIVE_CONTROL_SELECTOR)
            },
            enumerable: !0,
            configurable: !0
        }),
        f
    }(E), Z = {
        CLOSING: "e5",
        OPEN: "b5",
        OPENING: "c5",
        SCROLLABLE: "x4",
        SCROLL_LOCK: "f5",
        STACKED: "_5"
    }, oa = {
        ACTION_ATTRIBUTE: "data-s4-action",
        BUTTON_SELECTOR: ".a5",
        CLOSED_EVENT: "MDCDialog:closed",
        CLOSE_ACTION: "close",
        CLOSING_EVENT: "MDCDialog:closing",
        CONTAINER_SELECTOR: ".z4",
        CONTENT_SELECTOR: ".w4",
        DEFAULT_BUTTON_SELECTOR: ".a5--default",
        DESTROY_ACTION: "destroy",
        OPENED_EVENT: "MDCDialog:opened",
        OPENING_EVENT: "MDCDialog:opening",
        SCRIM_SELECTOR: ".t4",
        SUPPRESS_DEFAULT_PRESS_SELECTOR: "textarea, .w0 .a1",
        SURFACE_SELECTOR: ".u4"
    }, Ea = {
        DIALOG_ANIMATION_CLOSE_TIME_MS: 0,
        DIALOG_ANIMATION_OPEN_TIME_MS: 0
    }, Ma = function(v) {
        function f(a) {
            a = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return a.isOpen_ = !1,
            a.animationFrame_ = 0,
            a.animationTimer_ = 0,
            a.layoutFrame_ = 0,
            a.escapeKeyAction_ = oa.CLOSE_ACTION,
            a.scrimClickAction_ = oa.CLOSE_ACTION,
            a.autoStackButtons_ = !0,
            a.areButtonsStacked_ = !1,
            a
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return Z
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return oa
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return Ea
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addBodyClass: function() {},
                    addClass: function() {},
                    areButtonsStacked: function() {
                        return !1
                    },
                    clickDefaultButton: function() {},
                    eventTargetMatches: function() {
                        return !1
                    },
                    getActionFromEvent: function() {
                        return ""
                    },
                    hasClass: function() {
                        return !1
                    },
                    isContentScrollable: function() {
                        return !1
                    },
                    notifyClosed: function() {},
                    notifyClosing: function() {},
                    notifyOpened: function() {},
                    notifyOpening: function() {},
                    releaseFocus: function() {},
                    removeBodyClass: function() {},
                    removeClass: function() {},
                    reverseButtons: function() {},
                    trapFocus: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            this.adapter_.hasClass(Z.STACKED) && this.setAutoStackButtons(!1)
        }
        ,
        f.prototype.destroy = function() {
            this.isOpen_ && this.close(oa.DESTROY_ACTION);
            this.animationTimer_ && (clearTimeout(this.animationTimer_),
            this.handleAnimationTimerEnd_());
            this.layoutFrame_ && (cancelAnimationFrame(this.layoutFrame_),
            this.layoutFrame_ = 0)
        }
        ,
        f.prototype.open = function() {
            var a = this;
            this.isOpen_ = !0;
            this.adapter_.notifyOpening();
            this.adapter_.addClass(Z.OPENING);
            this.runNextAnimationFrame_(function() {
                a.adapter_.addClass(Z.OPEN);
                a.adapter_.addBodyClass(Z.SCROLL_LOCK);
                a.layout();
                a.animationTimer_ = setTimeout(function() {
                    a.handleAnimationTimerEnd_();
                    a.adapter_.trapFocus();
                    a.adapter_.notifyOpened()
                }, 0)
            })
        }
        ,
        f.prototype.close = function(a) {
            var c = this;
            void 0 === a && (a = "");
            this.isOpen_ && (this.isOpen_ = !1,
            this.adapter_.notifyClosing(a),
            this.adapter_.addClass(Z.CLOSING),
            this.adapter_.removeClass(Z.OPEN),
            this.adapter_.removeBodyClass(Z.SCROLL_LOCK),
            cancelAnimationFrame(this.animationFrame_),
            this.animationFrame_ = 0,
            clearTimeout(this.animationTimer_),
            this.animationTimer_ = setTimeout(function() {
                c.adapter_.releaseFocus();
                c.handleAnimationTimerEnd_();
                c.adapter_.notifyClosed(a)
            }, 0))
        }
        ,
        f.prototype.isOpen = function() {
            return this.isOpen_
        }
        ,
        f.prototype.getEscapeKeyAction = function() {
            return this.escapeKeyAction_
        }
        ,
        f.prototype.setEscapeKeyAction = function(a) {
            this.escapeKeyAction_ = a
        }
        ,
        f.prototype.getScrimClickAction = function() {
            return this.scrimClickAction_
        }
        ,
        f.prototype.setScrimClickAction = function(a) {
            this.scrimClickAction_ = a
        }
        ,
        f.prototype.getAutoStackButtons = function() {
            return this.autoStackButtons_
        }
        ,
        f.prototype.setAutoStackButtons = function(a) {
            this.autoStackButtons_ = a
        }
        ,
        f.prototype.layout = function() {
            var a = this;
            this.layoutFrame_ && cancelAnimationFrame(this.layoutFrame_);
            this.layoutFrame_ = requestAnimationFrame(function() {
                a.layoutInternal_();
                a.layoutFrame_ = 0
            })
        }
        ,
        f.prototype.handleInteraction = function(a) {
            var c = "click" === a.type
              , p = "Enter" === a.key || 13 === a.keyCode
              , z = "Space" === a.key || 32 === a.keyCode
              , G = this.adapter_.eventTargetMatches(a.target, oa.SCRIM_SELECTOR)
              , H = !this.adapter_.eventTargetMatches(a.target, oa.SUPPRESS_DEFAULT_PRESS_SELECTOR);
            if (c && G && "" !== this.scrimClickAction_)
                this.close(this.scrimClickAction_);
            else if (c || z || p)
                (a = this.adapter_.getActionFromEvent(a)) ? this.close(a) : p && H && this.adapter_.clickDefaultButton()
        }
        ,
        f.prototype.handleDocumentKeydown = function(a) {
            "Escape" !== a.key && 27 !== a.keyCode || "" === this.escapeKeyAction_ || this.close(this.escapeKeyAction_)
        }
        ,
        f.prototype.layoutInternal_ = function() {
            this.autoStackButtons_ && this.detectStackedButtons_();
            this.detectScrollableContent_()
        }
        ,
        f.prototype.handleAnimationTimerEnd_ = function() {
            this.animationTimer_ = 0;
            this.adapter_.removeClass(Z.OPENING);
            this.adapter_.removeClass(Z.CLOSING)
        }
        ,
        f.prototype.runNextAnimationFrame_ = function(a) {
            var c = this;
            cancelAnimationFrame(this.animationFrame_);
            this.animationFrame_ = requestAnimationFrame(function() {
                c.animationFrame_ = 0;
                clearTimeout(c.animationTimer_);
                c.animationTimer_ = setTimeout(a, 0)
            })
        }
        ,
        f.prototype.detectStackedButtons_ = function() {
            this.adapter_.removeClass(Z.STACKED);
            var a = this.adapter_.areButtonsStacked();
            a && this.adapter_.addClass(Z.STACKED);
            a !== this.areButtonsStacked_ && (this.adapter_.reverseButtons(),
            this.areButtonsStacked_ = a)
        }
        ,
        f.prototype.detectScrollableContent_ = function() {
            this.adapter_.removeClass(Z.SCROLLABLE);
            this.adapter_.isContentScrollable() && this.adapter_.addClass(Z.SCROLLABLE)
        }
        ,
        f
    }(C), mb = e(0), nb = e.n(mb), W, pa, X = Ma.strings, ob = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        Object.defineProperty(f.prototype, "isOpen", {
            get: function() {
                return this.foundation_.isOpen()
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "escapeKeyAction", {
            get: function() {
                return this.foundation_.getEscapeKeyAction()
            },
            set: function(a) {
                this.foundation_.setEscapeKeyAction(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "scrimClickAction", {
            get: function() {
                return this.foundation_.getScrimClickAction()
            },
            set: function(a) {
                this.foundation_.setScrimClickAction(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "autoStackButtons", {
            get: function() {
                return this.foundation_.getAutoStackButtons()
            },
            set: function(a) {
                this.foundation_.setAutoStackButtons(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.initialize = function(a, c) {
            var p, z = this.root_.querySelector(X.CONTAINER_SELECTOR);
            if (!z)
                throw Error("Dialog component requires a " + X.CONTAINER_SELECTOR + " container element");
            this.container_ = z;
            this.content_ = this.root_.querySelector(X.CONTENT_SELECTOR);
            this.buttons_ = [].slice.call(this.root_.querySelectorAll(X.BUTTON_SELECTOR));
            this.defaultButton_ = this.root_.querySelector(X.DEFAULT_BUTTON_SELECTOR);
            this.focusTrapFactory_ = a;
            this.initialFocusEl_ = c;
            this.buttonRipples_ = [];
            try {
                for (var G = h(this.buttons_), H = G.next(); !H.done; H = G.next())
                    this.buttonRipples_.push(new ba(H.value))
            } catch (L) {
                var M = {
                    error: L
                }
            } finally {
                try {
                    H && !H.done && (p = G.return) && p.call(G)
                } finally {
                    if (M)
                        throw M.error;
                }
            }
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            var a, c, p, z = this;
            this.focusTrap_ = (a = this.container_,
            c = this.focusTrapFactory_,
            p = this.initialFocusEl_,
            void 0 === c && (c = nb.a),
            c(a, {
                clickOutsideDeactivates: !0,
                escapeDeactivates: !1,
                initialFocus: p
            }));
            this.handleInteraction_ = this.foundation_.handleInteraction.bind(this.foundation_);
            this.handleDocumentKeydown_ = this.foundation_.handleDocumentKeydown.bind(this.foundation_);
            this.handleLayout_ = this.layout.bind(this);
            var G = ["resize", "orientationchange"];
            this.handleOpening_ = function() {
                G.forEach(function(H) {
                    return window.addEventListener(H, z.handleLayout_)
                });
                document.addEventListener("keydown", z.handleDocumentKeydown_)
            }
            ;
            this.handleClosing_ = function() {
                G.forEach(function(H) {
                    return window.removeEventListener(H, z.handleLayout_)
                });
                document.removeEventListener("keydown", z.handleDocumentKeydown_)
            }
            ;
            this.listen("click", this.handleInteraction_);
            this.listen("keydown", this.handleInteraction_);
            this.listen(X.OPENING_EVENT, this.handleOpening_);
            this.listen(X.CLOSING_EVENT, this.handleClosing_)
        }
        ,
        f.prototype.destroy = function() {
            this.unlisten("click", this.handleInteraction_);
            this.unlisten("keydown", this.handleInteraction_);
            this.unlisten(X.OPENING_EVENT, this.handleOpening_);
            this.unlisten(X.CLOSING_EVENT, this.handleClosing_);
            this.handleClosing_();
            this.buttonRipples_.forEach(function(a) {
                return a.destroy()
            });
            v.prototype.destroy.call(this)
        }
        ,
        f.prototype.layout = function() {
            this.foundation_.layout()
        }
        ,
        f.prototype.open = function() {
            this.foundation_.open()
        }
        ,
        f.prototype.close = function(a) {
            void 0 === a && (a = "");
            this.foundation_.close(a)
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Ma({
                addBodyClass: function(c) {
                    return document.body.classList.add(c)
                },
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                areButtonsStacked: function() {
                    return c = a.buttons_,
                    p = new Set,
                    [].forEach.call(c, function(z) {
                        return p.add(z.offsetTop)
                    }),
                    1 < p.size;
                    var c, p
                },
                clickDefaultButton: function() {
                    return a.defaultButton_ && a.defaultButton_.click()
                },
                eventTargetMatches: function(c, p) {
                    return !!c && t(c, p)
                },
                getActionFromEvent: function(c) {
                    return c.target ? (c = m(c.target, "[" + X.ACTION_ATTRIBUTE + "]")) && c.getAttribute(X.ACTION_ATTRIBUTE) : ""
                },
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                isContentScrollable: function() {
                    return !!(c = a.content_) && c.scrollHeight > c.offsetHeight;
                    var c
                },
                notifyClosed: function(c) {
                    return a.emit(X.CLOSED_EVENT, c ? {
                        action: c
                    } : {})
                },
                notifyClosing: function(c) {
                    return a.emit(X.CLOSING_EVENT, c ? {
                        action: c
                    } : {})
                },
                notifyOpened: function() {
                    return a.emit(X.OPENED_EVENT, {})
                },
                notifyOpening: function() {
                    return a.emit(X.OPENING_EVENT, {})
                },
                releaseFocus: function() {
                    return a.focusTrap_.deactivate()
                },
                removeBodyClass: function(c) {
                    return document.body.classList.remove(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                reverseButtons: function() {
                    a.buttons_.reverse();
                    a.buttons_.forEach(function(c) {
                        c.parentElement.appendChild(c)
                    })
                },
                trapFocus: function() {
                    return a.focusTrap_.activate()
                }
            })
        }
        ,
        f
    }(E), pb = {
        NATIVE_CONTROL_SELECTOR: ".v2"
    }, qb = {
        DISABLED: "z2",
        ROOT: "u2"
    }, Na = function(v) {
        function f(a) {
            return v.call(this, x({}, f.defaultAdapter, a)) || this
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return qb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return pb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    setNativeControlDisabled: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.setDisabled = function(a) {
            var c = f.cssClasses.DISABLED;
            this.adapter_.setNativeControlDisabled(a);
            a ? this.adapter_.addClass(c) : this.adapter_.removeClass(c)
        }
        ,
        f
    }(C), rb = function(v) {
        function f() {
            var a = null !== v && v.apply(this, arguments) || this;
            return a.ripple_ = a.createRipple_(),
            a
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "checked", {
            get: function() {
                return this.nativeControl_.checked
            },
            set: function(a) {
                this.nativeControl_.checked = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "disabled", {
            get: function() {
                return this.nativeControl_.disabled
            },
            set: function(a) {
                this.foundation_.setDisabled(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "value", {
            get: function() {
                return this.nativeControl_.value
            },
            set: function(a) {
                this.nativeControl_.value = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "ripple", {
            get: function() {
                return this.ripple_
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.destroy = function() {
            this.ripple_.destroy();
            v.prototype.destroy.call(this)
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Na({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                setNativeControlDisabled: function(c) {
                    return a.nativeControl_.disabled = c
                }
            })
        }
        ,
        f.prototype.createRipple_ = function() {
            var a = this
              , c = x({}, ba.createAdapter(this), {
                registerInteractionHandler: function(p, z) {
                    return a.nativeControl_.addEventListener(p, z)
                },
                deregisterInteractionHandler: function(p, z) {
                    return a.nativeControl_.removeEventListener(p, z)
                },
                isSurfaceActive: function() {
                    return !1
                },
                isUnbounded: function() {
                    return !0
                }
            });
            return new ba(this.root_,new aa(c))
        }
        ,
        Object.defineProperty(f.prototype, "nativeControl_", {
            get: function() {
                var a = Na.strings.NATIVE_CONTROL_SELECTOR
                  , c = this.root_.querySelector(a);
                if (!c)
                    throw Error("Radio component requires a " + a + " element");
                return c
            },
            enumerable: !0,
            configurable: !0
        }),
        f
    }(E), sb = {
        LABEL_FLOAT_ABOVE: "i3",
        LABEL_SHAKE: "m3",
        ROOT: "h3"
    }, Oa = function(v) {
        function f(a) {
            var c = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return c.shakeAnimationEndHandler_ = function() {
                return c.handleShakeAnimationEnd_()
            }
            ,
            c
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return sb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    getWidth: function() {
                        return 0
                    },
                    registerInteractionHandler: function() {},
                    deregisterInteractionHandler: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            this.adapter_.registerInteractionHandler("animationend", this.shakeAnimationEndHandler_)
        }
        ,
        f.prototype.destroy = function() {
            this.adapter_.deregisterInteractionHandler("animationend", this.shakeAnimationEndHandler_)
        }
        ,
        f.prototype.getWidth = function() {
            return this.adapter_.getWidth()
        }
        ,
        f.prototype.shake = function(a) {
            var c = f.cssClasses.LABEL_SHAKE;
            a ? this.adapter_.addClass(c) : this.adapter_.removeClass(c)
        }
        ,
        f.prototype.float = function(a) {
            var c = f.cssClasses
              , p = c.LABEL_FLOAT_ABOVE;
            c = c.LABEL_SHAKE;
            a ? this.adapter_.addClass(p) : (this.adapter_.removeClass(p),
            this.adapter_.removeClass(c))
        }
        ,
        f.prototype.handleShakeAnimationEnd_ = function() {
            this.adapter_.removeClass(f.cssClasses.LABEL_SHAKE)
        }
        ,
        f
    }(C), Pa = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.shake = function(a) {
            this.foundation_.shake(a)
        }
        ,
        f.prototype.float = function(a) {
            this.foundation_.float(a)
        }
        ,
        f.prototype.getWidth = function() {
            return this.foundation_.getWidth()
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Oa({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                getWidth: function() {
                    return a.root_.scrollWidth
                },
                registerInteractionHandler: function(c, p) {
                    return a.listen(c, p)
                },
                deregisterInteractionHandler: function(c, p) {
                    return a.unlisten(c, p)
                }
            })
        }
        ,
        f
    }(E), ka = {
        LINE_RIPPLE_ACTIVE: "a3",
        LINE_RIPPLE_DEACTIVATING: "b3"
    }, tb = function(v) {
        function f(a) {
            var c = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return c.transitionEndHandler_ = function(p) {
                return c.handleTransitionEnd(p)
            }
            ,
            c
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return ka
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    hasClass: function() {
                        return !1
                    },
                    setStyle: function() {},
                    registerEventHandler: function() {},
                    deregisterEventHandler: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            this.adapter_.registerEventHandler("transitionend", this.transitionEndHandler_)
        }
        ,
        f.prototype.destroy = function() {
            this.adapter_.deregisterEventHandler("transitionend", this.transitionEndHandler_)
        }
        ,
        f.prototype.activate = function() {
            this.adapter_.removeClass(ka.LINE_RIPPLE_DEACTIVATING);
            this.adapter_.addClass(ka.LINE_RIPPLE_ACTIVE)
        }
        ,
        f.prototype.setRippleCenter = function(a) {
            this.adapter_.setStyle("transform-origin", a + "px center")
        }
        ,
        f.prototype.deactivate = function() {
            this.adapter_.addClass(ka.LINE_RIPPLE_DEACTIVATING)
        }
        ,
        f.prototype.handleTransitionEnd = function(a) {
            var c = this.adapter_.hasClass(ka.LINE_RIPPLE_DEACTIVATING);
            "opacity" === a.propertyName && c && (this.adapter_.removeClass(ka.LINE_RIPPLE_ACTIVE),
            this.adapter_.removeClass(ka.LINE_RIPPLE_DEACTIVATING))
        }
        ,
        f
    }(C), Qa = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.activate = function() {
            this.foundation_.activate()
        }
        ,
        f.prototype.deactivate = function() {
            this.foundation_.deactivate()
        }
        ,
        f.prototype.setRippleCenter = function(a) {
            this.foundation_.setRippleCenter(a)
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new tb({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                setStyle: function(c, p) {
                    return a.root_.style.setProperty(c, p)
                },
                registerEventHandler: function(c, p) {
                    return a.listen(c, p)
                },
                deregisterEventHandler: function(c, p) {
                    return a.unlisten(c, p)
                }
            })
        }
        ,
        f
    }(E), ya = {
        ANCHOR: "k1",
        ANIMATING_CLOSED: "j1",
        ANIMATING_OPEN: "i1",
        FIXED: "l1",
        OPEN: "h1",
        ROOT: "g1"
    }, ea = {
        CLOSED_EVENT: "MDCMenuSurface:closed",
        OPENED_EVENT: "MDCMenuSurface:opened",
        FOCUSABLE_ELEMENTS: 'button:not(:disabled), [href]:not([aria-disabled="true"]), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])'
    }, Ba = {
        TRANSITION_OPEN_DURATION: 0,
        TRANSITION_CLOSE_DURATION: 0,
        MARGIN_TO_EDGE: 32,
        ANCHOR_TO_MENU_SURFACE_WIDTH_RATIO: .67
    };
    !function(v) {
        v[v.BOTTOM = 1] = "BOTTOM";
        v[v.CENTER = 2] = "CENTER";
        v[v.RIGHT = 4] = "RIGHT";
        v[v.FLIP_RTL = 8] = "FLIP_RTL"
    }(W || (W = {}));
    (function(v) {
        v[v.TOP_LEFT = 0] = "TOP_LEFT";
        v[v.TOP_RIGHT = 4] = "TOP_RIGHT";
        v[v.BOTTOM_LEFT = 1] = "BOTTOM_LEFT";
        v[v.BOTTOM_RIGHT = 5] = "BOTTOM_RIGHT";
        v[v.TOP_START = 8] = "TOP_START";
        v[v.TOP_END = 12] = "TOP_END";
        v[v.BOTTOM_START = 9] = "BOTTOM_START";
        v[v.BOTTOM_END = 13] = "BOTTOM_END"
    }
    )(pa || (pa = {}));
    var V = {
        LIST_ITEM_ACTIVATED_CLASS: "i5",
        LIST_ITEM_CLASS: "a1",
        LIST_ITEM_DISABLED_CLASS: "ye",
        LIST_ITEM_SELECTED_CLASS: "b4",
        ROOT: "z0"
    }, S = {
        ACTION_EVENT: "MDCList:action",
        ARIA_CHECKED: "aria-checked",
        ARIA_CHECKED_CHECKBOX_SELECTOR: '[role="checkbox"][aria-checked="true"]',
        ARIA_CHECKED_RADIO_SELECTOR: '[role="radio"][aria-checked="true"]',
        ARIA_CURRENT: "aria-current",
        ARIA_ORIENTATION: "aria-orientation",
        ARIA_ORIENTATION_HORIZONTAL: "horizontal",
        ARIA_ROLE_CHECKBOX_SELECTOR: '[role="checkbox"]',
        ARIA_SELECTED: "aria-selected",
        CHECKBOX_RADIO_SELECTOR: 'input[type="checkbox"]:not(:disabled), input[type="radio"]:not(:disabled)',
        CHECKBOX_SELECTOR: 'input[type="checkbox"]:not(:disabled)',
        CHILD_ELEMENTS_TO_TOGGLE_TABINDEX: "\n    ." + V.LIST_ITEM_CLASS + " button:not(:disabled),\n    ." + V.LIST_ITEM_CLASS + " a\n  ",
        FOCUSABLE_CHILD_ELEMENTS: "\n    ." + V.LIST_ITEM_CLASS + " button:not(:disabled),\n    ." + V.LIST_ITEM_CLASS + " a,\n    ." + V.LIST_ITEM_CLASS + ' input[type="radio"]:not(:disabled),\n    .' + V.LIST_ITEM_CLASS + ' input[type="checkbox"]:not(:disabled)\n  ',
        RADIO_SELECTOR: 'input[type="radio"]:not(:disabled)'
    }, da = {
        UNSET_INDEX: -1
    }, ub = ["input", "button", "textarea", "select"], Fa, Ca = function(v) {
        function f(a) {
            a = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return a.wrapFocus_ = !1,
            a.isVertical_ = !0,
            a.isSingleSelectionList_ = !1,
            a.selectedIndex_ = da.UNSET_INDEX,
            a.focusedItemIndex_ = da.UNSET_INDEX,
            a.useActivatedClass_ = !1,
            a.ariaCurrentAttrValue_ = null,
            a.isCheckboxList_ = !1,
            a.isRadioList_ = !1,
            a
        }
        return g(f, v),
        Object.defineProperty(f, "strings", {
            get: function() {
                return S
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return V
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return da
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClassForElementIndex: function() {},
                    focusItemAtIndex: function() {},
                    getAttributeForElementIndex: function() {
                        return null
                    },
                    getFocusedElementIndex: function() {
                        return 0
                    },
                    getListItemCount: function() {
                        return 0
                    },
                    hasCheckboxAtIndex: function() {
                        return !1
                    },
                    hasRadioAtIndex: function() {
                        return !1
                    },
                    isCheckboxCheckedAtIndex: function() {
                        return !1
                    },
                    isFocusInsideList: function() {
                        return !1
                    },
                    isRootFocused: function() {
                        return !1
                    },
                    notifyAction: function() {},
                    removeClassForElementIndex: function() {},
                    setAttributeForElementIndex: function() {},
                    setCheckedCheckboxOrRadioAtIndex: function() {},
                    setTabIndexForListItemChildren: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.layout = function() {
            0 !== this.adapter_.getListItemCount() && (this.adapter_.hasCheckboxAtIndex(0) ? this.isCheckboxList_ = !0 : this.adapter_.hasRadioAtIndex(0) && (this.isRadioList_ = !0))
        }
        ,
        f.prototype.setWrapFocus = function(a) {
            this.wrapFocus_ = a
        }
        ,
        f.prototype.setVerticalOrientation = function(a) {
            this.isVertical_ = a
        }
        ,
        f.prototype.setSingleSelection = function(a) {
            this.isSingleSelectionList_ = a
        }
        ,
        f.prototype.setUseActivatedClass = function(a) {
            this.useActivatedClass_ = a
        }
        ,
        f.prototype.getSelectedIndex = function() {
            return this.selectedIndex_
        }
        ,
        f.prototype.setSelectedIndex = function(a) {
            this.isIndexValid_(a) && (this.isCheckboxList_ ? this.setCheckboxAtIndex_(a) : this.isRadioList_ ? this.setRadioAtIndex_(a) : this.setSingleSelectionAtIndex_(a))
        }
        ,
        f.prototype.handleFocusIn = function(a, c) {
            0 <= c && this.adapter_.setTabIndexForListItemChildren(c, "0")
        }
        ,
        f.prototype.handleFocusOut = function(a, c) {
            var p = this;
            0 <= c && this.adapter_.setTabIndexForListItemChildren(c, "-1");
            setTimeout(function() {
                p.adapter_.isFocusInsideList() || p.setTabindexToFirstSelectedItem_()
            }, 0)
        }
        ,
        f.prototype.handleKeydown = function(a, c, p) {
            var z = "ArrowLeft" === a.key || 37 === a.keyCode
              , G = "ArrowUp" === a.key || 38 === a.keyCode
              , H = "ArrowRight" === a.key || 39 === a.keyCode
              , M = "ArrowDown" === a.key || 40 === a.keyCode
              , L = "Home" === a.key || 36 === a.keyCode
              , Q = "End" === a.key || 35 === a.keyCode
              , fa = "Enter" === a.key || 13 === a.keyCode
              , na = "Space" === a.key || 32 === a.keyCode;
            if (this.adapter_.isRootFocused())
                G || Q ? (a.preventDefault(),
                this.focusLastElement()) : (M || L) && (a.preventDefault(),
                this.focusFirstElement());
            else {
                var la = this.adapter_.getFocusedElementIndex();
                if (!(-1 === la && 0 > (la = p))) {
                    if (this.isVertical_ && M || !this.isVertical_ && H) {
                        this.preventDefaultEvent_(a);
                        var qa = this.focusNextElement(la)
                    } else if (this.isVertical_ && G || !this.isVertical_ && z)
                        this.preventDefaultEvent_(a),
                        qa = this.focusPrevElement(la);
                    else if (L)
                        this.preventDefaultEvent_(a),
                        qa = this.focusFirstElement();
                    else if (Q)
                        this.preventDefaultEvent_(a),
                        qa = this.focusLastElement();
                    else if ((fa || na) && c) {
                        if ((c = a.target) && "A" === c.tagName && fa)
                            return;
                        this.preventDefaultEvent_(a);
                        this.isSelectableList_() && this.setSelectedIndexOnAction_(la);
                        this.adapter_.notifyAction(la)
                    }
                    this.focusedItemIndex_ = la;
                    void 0 !== qa && (this.setTabindexAtIndex_(qa),
                    this.focusedItemIndex_ = qa)
                }
            }
        }
        ,
        f.prototype.handleClick = function(a, c) {
            a !== da.UNSET_INDEX && (this.isSelectableList_() && this.setSelectedIndexOnAction_(a, c),
            this.adapter_.notifyAction(a),
            this.setTabindexAtIndex_(a),
            this.focusedItemIndex_ = a)
        }
        ,
        f.prototype.focusNextElement = function(a) {
            var c = a + 1;
            if (c >= this.adapter_.getListItemCount()) {
                if (!this.wrapFocus_)
                    return a;
                c = 0
            }
            return this.adapter_.focusItemAtIndex(c),
            c
        }
        ,
        f.prototype.focusPrevElement = function(a) {
            var c = a - 1;
            if (0 > c) {
                if (!this.wrapFocus_)
                    return a;
                c = this.adapter_.getListItemCount() - 1
            }
            return this.adapter_.focusItemAtIndex(c),
            c
        }
        ,
        f.prototype.focusFirstElement = function() {
            return this.adapter_.focusItemAtIndex(0),
            0
        }
        ,
        f.prototype.focusLastElement = function() {
            var a = this.adapter_.getListItemCount() - 1;
            return this.adapter_.focusItemAtIndex(a),
            a
        }
        ,
        f.prototype.preventDefaultEvent_ = function(a) {
            var c = ("" + a.target.tagName).toLowerCase();
            -1 === ub.indexOf(c) && a.preventDefault()
        }
        ,
        f.prototype.setSingleSelectionAtIndex_ = function(a) {
            if (this.selectedIndex_ !== a) {
                var c = V.LIST_ITEM_SELECTED_CLASS;
                this.useActivatedClass_ && (c = V.LIST_ITEM_ACTIVATED_CLASS);
                this.selectedIndex_ !== da.UNSET_INDEX && this.adapter_.removeClassForElementIndex(this.selectedIndex_, c);
                this.adapter_.addClassForElementIndex(a, c);
                this.setAriaForSingleSelectionAtIndex_(a);
                this.selectedIndex_ = a
            }
        }
        ,
        f.prototype.setAriaForSingleSelectionAtIndex_ = function(a) {
            this.selectedIndex_ === da.UNSET_INDEX && (this.ariaCurrentAttrValue_ = this.adapter_.getAttributeForElementIndex(a, S.ARIA_CURRENT));
            var c = null !== this.ariaCurrentAttrValue_
              , p = c ? S.ARIA_CURRENT : S.ARIA_SELECTED;
            this.selectedIndex_ !== da.UNSET_INDEX && this.adapter_.setAttributeForElementIndex(this.selectedIndex_, p, "false");
            this.adapter_.setAttributeForElementIndex(a, p, c ? this.ariaCurrentAttrValue_ : "true")
        }
        ,
        f.prototype.setRadioAtIndex_ = function(a) {
            this.adapter_.setCheckedCheckboxOrRadioAtIndex(a, !0);
            this.selectedIndex_ !== da.UNSET_INDEX && this.adapter_.setAttributeForElementIndex(this.selectedIndex_, S.ARIA_CHECKED, "false");
            this.adapter_.setAttributeForElementIndex(a, S.ARIA_CHECKED, "true");
            this.selectedIndex_ = a
        }
        ,
        f.prototype.setCheckboxAtIndex_ = function(a) {
            for (var c = 0; c < this.adapter_.getListItemCount(); c++) {
                var p = !1;
                0 <= a.indexOf(c) && (p = !0);
                this.adapter_.setCheckedCheckboxOrRadioAtIndex(c, p);
                this.adapter_.setAttributeForElementIndex(c, S.ARIA_CHECKED, p ? "true" : "false")
            }
            this.selectedIndex_ = a
        }
        ,
        f.prototype.setTabindexAtIndex_ = function(a) {
            this.focusedItemIndex_ === da.UNSET_INDEX && 0 !== a ? this.adapter_.setAttributeForElementIndex(0, "tabindex", "-1") : 0 <= this.focusedItemIndex_ && this.focusedItemIndex_ !== a && this.adapter_.setAttributeForElementIndex(this.focusedItemIndex_, "tabindex", "-1");
            this.adapter_.setAttributeForElementIndex(a, "tabindex", "0")
        }
        ,
        f.prototype.isSelectableList_ = function() {
            return this.isSingleSelectionList_ || this.isCheckboxList_ || this.isRadioList_
        }
        ,
        f.prototype.setTabindexToFirstSelectedItem_ = function() {
            var a = 0;
            this.isSelectableList_() && ("number" == typeof this.selectedIndex_ && this.selectedIndex_ !== da.UNSET_INDEX ? a = this.selectedIndex_ : this.selectedIndex_ instanceof Array && 0 < this.selectedIndex_.length && (a = this.selectedIndex_.reduce(function(c, p) {
                return Math.min(c, p)
            })));
            this.setTabindexAtIndex_(a)
        }
        ,
        f.prototype.isIndexValid_ = function(a) {
            var c = this;
            if (a instanceof Array) {
                if (!this.isCheckboxList_)
                    throw Error("MDCListFoundation: Array of index is only supported for checkbox based list");
                return 0 === a.length || a.some(function(p) {
                    return c.isIndexInRange_(p)
                })
            }
            if ("number" == typeof a) {
                if (this.isCheckboxList_)
                    throw Error("MDCListFoundation: Expected array of index for checkbox based list but got number: " + a);
                return this.isIndexInRange_(a)
            }
            return !1
        }
        ,
        f.prototype.isIndexInRange_ = function(a) {
            var c = this.adapter_.getListItemCount();
            return 0 <= a && a < c
        }
        ,
        f.prototype.setSelectedIndexOnAction_ = function(a, c) {
            void 0 === c && (c = !0);
            this.isCheckboxList_ ? this.toggleCheckboxAtIndex_(a, c) : this.setSelectedIndex(a)
        }
        ,
        f.prototype.toggleCheckboxAtIndex_ = function(a, c) {
            var p = this.adapter_.isCheckboxCheckedAtIndex(a);
            c && (p = !p,
            this.adapter_.setCheckedCheckboxOrRadioAtIndex(a, p));
            this.adapter_.setAttributeForElementIndex(a, S.ARIA_CHECKED, p ? "true" : "false");
            c = this.selectedIndex_ === da.UNSET_INDEX ? [] : this.selectedIndex_.slice();
            p ? c.push(a) : c = c.filter(function(z) {
                return z !== a
            });
            this.selectedIndex_ = c
        }
        ,
        f
    }(C), vb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        Object.defineProperty(f.prototype, "vertical", {
            set: function(a) {
                this.foundation_.setVerticalOrientation(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "listElements", {
            get: function() {
                return [].slice.call(this.root_.querySelectorAll("." + V.LIST_ITEM_CLASS))
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "wrapFocus", {
            set: function(a) {
                this.foundation_.setWrapFocus(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "singleSelection", {
            set: function(a) {
                this.foundation_.setSingleSelection(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "selectedIndex", {
            get: function() {
                return this.foundation_.getSelectedIndex()
            },
            set: function(a) {
                this.foundation_.setSelectedIndex(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            this.handleClick_ = this.handleClickEvent_.bind(this);
            this.handleKeydown_ = this.handleKeydownEvent_.bind(this);
            this.focusInEventListener_ = this.handleFocusInEvent_.bind(this);
            this.focusOutEventListener_ = this.handleFocusOutEvent_.bind(this);
            this.listen("keydown", this.handleKeydown_);
            this.listen("click", this.handleClick_);
            this.listen("focusin", this.focusInEventListener_);
            this.listen("focusout", this.focusOutEventListener_);
            this.layout();
            this.initializeListType()
        }
        ,
        f.prototype.destroy = function() {
            this.unlisten("keydown", this.handleKeydown_);
            this.unlisten("click", this.handleClick_);
            this.unlisten("focusin", this.focusInEventListener_);
            this.unlisten("focusout", this.focusOutEventListener_)
        }
        ,
        f.prototype.layout = function() {
            this.vertical = this.root_.getAttribute(S.ARIA_ORIENTATION) !== S.ARIA_ORIENTATION_HORIZONTAL;
            [].slice.call(this.root_.querySelectorAll(".a1:not([tabindex])")).forEach(function(a) {
                a.setAttribute("tabindex", "-1")
            });
            [].slice.call(this.root_.querySelectorAll(S.FOCUSABLE_CHILD_ELEMENTS)).forEach(function(a) {
                return a.setAttribute("tabindex", "-1")
            });
            this.foundation_.layout()
        }
        ,
        f.prototype.initializeListType = function() {
            var a = this
              , c = this.root_.querySelectorAll(S.ARIA_ROLE_CHECKBOX_SELECTOR)
              , p = this.root_.querySelector("\n      ." + V.LIST_ITEM_ACTIVATED_CLASS + ",\n      ." + V.LIST_ITEM_SELECTED_CLASS + "\n    ")
              , z = this.root_.querySelector(S.ARIA_CHECKED_RADIO_SELECTOR);
            c.length ? (c = this.root_.querySelectorAll(S.ARIA_CHECKED_CHECKBOX_SELECTOR),
            this.selectedIndex = [].map.call(c, function(G) {
                return a.listElements.indexOf(G)
            })) : p ? (p.classList.contains(V.LIST_ITEM_ACTIVATED_CLASS) && this.foundation_.setUseActivatedClass(!0),
            this.singleSelection = !0,
            this.selectedIndex = this.listElements.indexOf(p)) : z && (this.selectedIndex = this.listElements.indexOf(z))
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Ca({
                addClassForElementIndex: function(c, p) {
                    (c = a.listElements[c]) && c.classList.add(p)
                },
                focusItemAtIndex: function(c) {
                    (c = a.listElements[c]) && c.focus()
                },
                getAttributeForElementIndex: function(c, p) {
                    return a.listElements[c].getAttribute(p)
                },
                getFocusedElementIndex: function() {
                    return a.listElements.indexOf(document.activeElement)
                },
                getListItemCount: function() {
                    return a.listElements.length
                },
                hasCheckboxAtIndex: function(c) {
                    return !!a.listElements[c].querySelector(S.CHECKBOX_SELECTOR)
                },
                hasRadioAtIndex: function(c) {
                    return !!a.listElements[c].querySelector(S.RADIO_SELECTOR)
                },
                isCheckboxCheckedAtIndex: function(c) {
                    return a.listElements[c].querySelector(S.CHECKBOX_SELECTOR).checked
                },
                isFocusInsideList: function() {
                    return a.root_.contains(document.activeElement)
                },
                isRootFocused: function() {
                    return document.activeElement === a.root_
                },
                notifyAction: function(c) {
                    a.emit(S.ACTION_EVENT, {
                        index: c
                    }, !0)
                },
                removeClassForElementIndex: function(c, p) {
                    (c = a.listElements[c]) && c.classList.remove(p)
                },
                setAttributeForElementIndex: function(c, p, z) {
                    (c = a.listElements[c]) && c.setAttribute(p, z)
                },
                setCheckedCheckboxOrRadioAtIndex: function(c, p) {
                    c = a.listElements[c].querySelector(S.CHECKBOX_RADIO_SELECTOR);
                    c.checked = p;
                    p = document.createEvent("Event");
                    p.initEvent("change", !0, !0);
                    c.dispatchEvent(p)
                },
                setTabIndexForListItemChildren: function(c, p) {
                    [].slice.call(a.listElements[c].querySelectorAll(S.CHILD_ELEMENTS_TO_TOGGLE_TABINDEX)).forEach(function(z) {
                        return z.setAttribute("tabindex", p)
                    })
                }
            })
        }
        ,
        f.prototype.getListItemIndex_ = function(a) {
            return (a = m(a.target, "." + V.LIST_ITEM_CLASS + ", ." + V.ROOT)) && t(a, "." + V.LIST_ITEM_CLASS) ? this.listElements.indexOf(a) : -1
        }
        ,
        f.prototype.handleFocusInEvent_ = function(a) {
            var c = this.getListItemIndex_(a);
            this.foundation_.handleFocusIn(a, c)
        }
        ,
        f.prototype.handleFocusOutEvent_ = function(a) {
            var c = this.getListItemIndex_(a);
            this.foundation_.handleFocusOut(a, c)
        }
        ,
        f.prototype.handleKeydownEvent_ = function(a) {
            var c = this.getListItemIndex_(a);
            this.foundation_.handleKeydown(a, a.target.classList.contains(V.LIST_ITEM_CLASS), c)
        }
        ,
        f.prototype.handleClickEvent_ = function(a) {
            var c = this.getListItemIndex_(a);
            a = !t(a.target, S.CHECKBOX_RADIO_SELECTOR);
            this.foundation_.handleClick(c, a)
        }
        ,
        f
    }(E), ra = function(v) {
        function f(a) {
            a = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return a.isOpen_ = !1,
            a.isQuickOpen_ = !1,
            a.isHoistedElement_ = !1,
            a.isFixedPosition_ = !1,
            a.openAnimationEndTimerId_ = 0,
            a.closeAnimationEndTimerId_ = 0,
            a.animationRequestId_ = 0,
            a.anchorCorner_ = pa.TOP_START,
            a.anchorMargin_ = {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            },
            a.position_ = {
                x: 0,
                y: 0
            },
            a
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return ya
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return ea
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return Ba
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "Corner", {
            get: function() {
                return pa
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    hasClass: function() {
                        return !1
                    },
                    hasAnchor: function() {
                        return !1
                    },
                    isElementInContainer: function() {
                        return !1
                    },
                    isFocused: function() {
                        return !1
                    },
                    isFirstElementFocused: function() {
                        return !1
                    },
                    isLastElementFocused: function() {
                        return !1
                    },
                    isRtl: function() {
                        return !1
                    },
                    getInnerDimensions: function() {
                        return {
                            height: 0,
                            width: 0
                        }
                    },
                    getAnchorDimensions: function() {
                        return null
                    },
                    getWindowDimensions: function() {
                        return {
                            height: 0,
                            width: 0
                        }
                    },
                    getBodyDimensions: function() {
                        return {
                            height: 0,
                            width: 0
                        }
                    },
                    getWindowScroll: function() {
                        return {
                            x: 0,
                            y: 0
                        }
                    },
                    setPosition: function() {},
                    setMaxHeight: function() {},
                    setTransformOrigin: function() {},
                    saveFocus: function() {},
                    restoreFocus: function() {},
                    focusFirstElement: function() {},
                    focusLastElement: function() {},
                    notifyClose: function() {},
                    notifyOpen: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            var a = f.cssClasses
              , c = a.ROOT;
            a = a.OPEN;
            if (!this.adapter_.hasClass(c))
                throw Error(c + " class required in root element.");
            this.adapter_.hasClass(a) && (this.isOpen_ = !0)
        }
        ,
        f.prototype.destroy = function() {
            clearTimeout(this.openAnimationEndTimerId_);
            clearTimeout(this.closeAnimationEndTimerId_);
            cancelAnimationFrame(this.animationRequestId_)
        }
        ,
        f.prototype.setAnchorCorner = function(a) {
            this.anchorCorner_ = a
        }
        ,
        f.prototype.setAnchorMargin = function(a) {
            this.anchorMargin_.top = a.top || 0;
            this.anchorMargin_.right = a.right || 0;
            this.anchorMargin_.bottom = a.bottom || 0;
            this.anchorMargin_.left = a.left || 0
        }
        ,
        f.prototype.setIsHoisted = function(a) {
            this.isHoistedElement_ = a
        }
        ,
        f.prototype.setFixedPosition = function(a) {
            this.isFixedPosition_ = a
        }
        ,
        f.prototype.setAbsolutePosition = function(a, c) {
            this.position_.x = this.isFinite_(a) ? a : 0;
            this.position_.y = this.isFinite_(c) ? c : 0
        }
        ,
        f.prototype.setQuickOpen = function(a) {
            this.isQuickOpen_ = a
        }
        ,
        f.prototype.isOpen = function() {
            return this.isOpen_
        }
        ,
        f.prototype.open = function() {
            var a = this;
            this.adapter_.saveFocus();
            this.isQuickOpen_ || this.adapter_.addClass(f.cssClasses.ANIMATING_OPEN);
            this.animationRequestId_ = requestAnimationFrame(function() {
                a.adapter_.addClass(f.cssClasses.OPEN);
                a.dimensions_ = a.adapter_.getInnerDimensions();
                a.autoPosition_();
                a.isQuickOpen_ ? a.adapter_.notifyOpen() : a.openAnimationEndTimerId_ = setTimeout(function() {
                    a.openAnimationEndTimerId_ = 0;
                    a.adapter_.removeClass(f.cssClasses.ANIMATING_OPEN);
                    a.adapter_.notifyOpen()
                }, 0)
            });
            this.isOpen_ = !0
        }
        ,
        f.prototype.close = function() {
            var a = this;
            this.isQuickOpen_ || this.adapter_.addClass(f.cssClasses.ANIMATING_CLOSED);
            requestAnimationFrame(function() {
                a.adapter_.removeClass(f.cssClasses.OPEN);
                a.isQuickOpen_ ? a.adapter_.notifyClose() : a.closeAnimationEndTimerId_ = setTimeout(function() {
                    a.closeAnimationEndTimerId_ = 0;
                    a.adapter_.removeClass(f.cssClasses.ANIMATING_CLOSED);
                    a.adapter_.notifyClose()
                }, 0)
            });
            this.isOpen_ = !1;
            this.maybeRestoreFocus_()
        }
        ,
        f.prototype.handleBodyClick = function(a) {
            this.adapter_.isElementInContainer(a.target) || this.close()
        }
        ,
        f.prototype.handleKeydown = function(a) {
            var c = a.keyCode
              , p = a.key
              , z = a.shiftKey
              , G = "Tab" === p || 9 === c;
            "Escape" === p || 27 === c ? this.close() : G && (this.adapter_.isLastElementFocused() && !z ? (this.adapter_.focusFirstElement(),
            a.preventDefault()) : this.adapter_.isFirstElementFocused() && z && (this.adapter_.focusLastElement(),
            a.preventDefault()))
        }
        ,
        f.prototype.autoPosition_ = function() {
            var a;
            this.measurements_ = this.getAutoLayoutMeasurements_();
            var c = this.getOriginCorner_()
              , p = this.getMenuSurfaceMaxHeight_(c)
              , z = this.hasBit_(c, W.BOTTOM) ? "bottom" : "top"
              , G = this.hasBit_(c, W.RIGHT) ? "right" : "left"
              , H = this.getHorizontalOriginOffset_(c)
              , M = this.getVerticalOriginOffset_(c)
              , L = this.measurements_;
            c = L.anchorSize;
            L = L.surfaceSize;
            H = ((a = {})[G] = H,
            a[z] = M,
            a);
            c.width / L.width > Ba.ANCHOR_TO_MENU_SURFACE_WIDTH_RATIO && (G = "center");
            (this.isHoistedElement_ || this.isFixedPosition_) && this.adjustPositionForHoistedElement_(H);
            this.adapter_.setTransformOrigin(G + " " + z);
            this.adapter_.setPosition(H);
            this.adapter_.setMaxHeight(p ? p + "px" : "")
        }
        ,
        f.prototype.getAutoLayoutMeasurements_ = function() {
            var a = this.adapter_.getAnchorDimensions()
              , c = this.adapter_.getBodyDimensions()
              , p = this.adapter_.getWindowDimensions()
              , z = this.adapter_.getWindowScroll();
            return a || (a = {
                top: this.position_.y,
                right: this.position_.x,
                bottom: this.position_.y,
                left: this.position_.x,
                width: 0,
                height: 0
            }),
            {
                anchorSize: a,
                bodySize: c,
                surfaceSize: this.dimensions_,
                viewportDistance: {
                    top: a.top,
                    right: p.width - a.right,
                    bottom: p.height - a.bottom,
                    left: a.left
                },
                viewportSize: p,
                windowScroll: z
            }
        }
        ,
        f.prototype.getOriginCorner_ = function() {
            var a = pa.TOP_LEFT
              , c = this.measurements_
              , p = c.viewportDistance
              , z = c.anchorSize;
            c = c.surfaceSize;
            var G = this.hasBit_(this.anchorCorner_, W.BOTTOM)
              , H = c.height - (G ? p.top + z.height + this.anchorMargin_.bottom : p.top + this.anchorMargin_.top);
            G = c.height - (G ? p.bottom - this.anchorMargin_.bottom : p.bottom + z.height - this.anchorMargin_.top);
            0 < G && H < G && (a = this.setBit_(a, W.BOTTOM));
            H = this.adapter_.isRtl();
            var M = this.hasBit_(this.anchorCorner_, W.FLIP_RTL);
            M = (G = this.hasBit_(this.anchorCorner_, W.RIGHT)) && !H || !G && M && H;
            var L = c.width - (M ? p.left + z.width + this.anchorMargin_.right : p.left + this.anchorMargin_.left);
            p = c.width - (M ? p.right - this.anchorMargin_.right : p.right + z.width - this.anchorMargin_.left);
            return (0 > L && M && H || G && !M && 0 > L || 0 < p && L < p) && (a = this.setBit_(a, W.RIGHT)),
            a
        }
        ,
        f.prototype.getMenuSurfaceMaxHeight_ = function(a) {
            var c = this.measurements_.viewportDistance
              , p = 0;
            a = this.hasBit_(a, W.BOTTOM);
            var z = this.hasBit_(this.anchorCorner_, W.BOTTOM)
              , G = f.numbers.MARGIN_TO_EDGE;
            return a ? (p = c.top + this.anchorMargin_.top - G,
            z || (p += this.measurements_.anchorSize.height)) : (p = c.bottom - this.anchorMargin_.bottom + this.measurements_.anchorSize.height - G,
            z && (p -= this.measurements_.anchorSize.height)),
            p
        }
        ,
        f.prototype.getHorizontalOriginOffset_ = function(a) {
            var c = this.measurements_.anchorSize;
            a = this.hasBit_(a, W.RIGHT);
            var p = this.hasBit_(this.anchorCorner_, W.RIGHT);
            return a ? (c = p ? c.width - this.anchorMargin_.left : this.anchorMargin_.right,
            this.isHoistedElement_ || this.isFixedPosition_ ? c - (this.measurements_.viewportSize.width - this.measurements_.bodySize.width) : c) : p ? c.width - this.anchorMargin_.right : this.anchorMargin_.left
        }
        ,
        f.prototype.getVerticalOriginOffset_ = function(a) {
            var c = this.measurements_.anchorSize;
            a = this.hasBit_(a, W.BOTTOM);
            var p = this.hasBit_(this.anchorCorner_, W.BOTTOM);
            return a ? p ? c.height - this.anchorMargin_.top : -this.anchorMargin_.bottom : p ? c.height + this.anchorMargin_.bottom : this.anchorMargin_.top
        }
        ,
        f.prototype.adjustPositionForHoistedElement_ = function(a) {
            var c, p = this.measurements_, z = p.windowScroll;
            p = p.viewportDistance;
            var G = Object.keys(a);
            try {
                for (var H = h(G), M = H.next(); !M.done; M = H.next()) {
                    var L = M.value
                      , Q = a[L] || 0;
                    Q += p[L];
                    this.isFixedPosition_ || ("top" === L ? Q += z.y : "bottom" === L ? Q -= z.y : "left" === L ? Q += z.x : Q -= z.x);
                    a[L] = Q
                }
            } catch (na) {
                var fa = {
                    error: na
                }
            } finally {
                try {
                    M && !M.done && (c = H.return) && c.call(H)
                } finally {
                    if (fa)
                        throw fa.error;
                }
            }
        }
        ,
        f.prototype.maybeRestoreFocus_ = function() {
            var a = this.adapter_.isFocused()
              , c = document.activeElement && this.adapter_.isElementInContainer(document.activeElement);
            (a || c) && this.adapter_.restoreFocus()
        }
        ,
        f.prototype.hasBit_ = function(a, c) {
            return !!(a & c)
        }
        ,
        f.prototype.setBit_ = function(a, c) {
            return a | c
        }
        ,
        f.prototype.isFinite_ = function(a) {
            return "number" == typeof a && isFinite(a)
        }
        ,
        f
    }(C), sa, wb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            var a = this
              , c = this.root_.parentElement;
            this.anchorElement = c && c.classList.contains(ya.ANCHOR) ? c : null;
            this.root_.classList.contains(ya.FIXED) && this.setFixedPosition(!0);
            this.handleKeydown_ = function(p) {
                return a.foundation_.handleKeydown(p)
            }
            ;
            this.handleBodyClick_ = function(p) {
                return a.foundation_.handleBodyClick(p)
            }
            ;
            this.registerBodyClickListener_ = function() {
                return document.body.addEventListener("click", a.handleBodyClick_)
            }
            ;
            this.deregisterBodyClickListener_ = function() {
                return document.body.removeEventListener("click", a.handleBodyClick_)
            }
            ;
            this.listen("keydown", this.handleKeydown_);
            this.listen(ea.OPENED_EVENT, this.registerBodyClickListener_);
            this.listen(ea.CLOSED_EVENT, this.deregisterBodyClickListener_)
        }
        ,
        f.prototype.destroy = function() {
            this.unlisten("keydown", this.handleKeydown_);
            this.unlisten(ea.OPENED_EVENT, this.registerBodyClickListener_);
            this.unlisten(ea.CLOSED_EVENT, this.deregisterBodyClickListener_);
            v.prototype.destroy.call(this)
        }
        ,
        Object.defineProperty(f.prototype, "open", {
            get: function() {
                return this.foundation_.isOpen()
            },
            set: function(a) {
                a ? (a = this.root_.querySelectorAll(ea.FOCUSABLE_ELEMENTS),
                this.firstFocusableElement_ = a[0],
                this.lastFocusableElement_ = a[a.length - 1],
                this.foundation_.open()) : this.foundation_.close()
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "quickOpen", {
            set: function(a) {
                this.foundation_.setQuickOpen(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.hoistMenuToBody = function() {
            document.body.appendChild(this.root_);
            this.setIsHoisted(!0)
        }
        ,
        f.prototype.setIsHoisted = function(a) {
            this.foundation_.setIsHoisted(a)
        }
        ,
        f.prototype.setMenuSurfaceAnchorElement = function(a) {
            this.anchorElement = a
        }
        ,
        f.prototype.setFixedPosition = function(a) {
            a ? this.root_.classList.add(ya.FIXED) : this.root_.classList.remove(ya.FIXED);
            this.foundation_.setFixedPosition(a)
        }
        ,
        f.prototype.setAbsolutePosition = function(a, c) {
            this.foundation_.setAbsolutePosition(a, c);
            this.setIsHoisted(!0)
        }
        ,
        f.prototype.setAnchorCorner = function(a) {
            this.foundation_.setAnchorCorner(a)
        }
        ,
        f.prototype.setAnchorMargin = function(a) {
            this.foundation_.setAnchorMargin(a)
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new ra({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                hasAnchor: function() {
                    return !!a.anchorElement
                },
                notifyClose: function() {
                    return a.emit(ra.strings.CLOSED_EVENT, {})
                },
                notifyOpen: function() {
                    return a.emit(ra.strings.OPENED_EVENT, {})
                },
                isElementInContainer: function(c) {
                    return a.root_.contains(c)
                },
                isRtl: function() {
                    return "rtl" === getComputedStyle(a.root_).getPropertyValue("direction")
                },
                setTransformOrigin: function(c) {
                    var p = void 0;
                    if (void 0 === p && (p = !1),
                    void 0 === Fa || p)
                        Fa = "transform"in window.document.createElement("div").style ? "transform" : "webkitTransform";
                    a.root_.style.setProperty(Fa + "-origin", c)
                },
                isFocused: function() {
                    return document.activeElement === a.root_
                },
                saveFocus: function() {
                    a.previousFocus_ = document.activeElement
                },
                restoreFocus: function() {
                    a.root_.contains(document.activeElement) && a.previousFocus_ && a.previousFocus_.focus && a.previousFocus_.focus()
                },
                isFirstElementFocused: function() {
                    return !!a.firstFocusableElement_ && a.firstFocusableElement_ === document.activeElement
                },
                isLastElementFocused: function() {
                    return !!a.lastFocusableElement_ && a.lastFocusableElement_ === document.activeElement
                },
                focusFirstElement: function() {
                    return a.firstFocusableElement_ && a.firstFocusableElement_.focus && a.firstFocusableElement_.focus()
                },
                focusLastElement: function() {
                    return a.lastFocusableElement_ && a.lastFocusableElement_.focus && a.lastFocusableElement_.focus()
                },
                getInnerDimensions: function() {
                    return {
                        width: a.root_.offsetWidth,
                        height: a.root_.offsetHeight
                    }
                },
                getAnchorDimensions: function() {
                    return a.anchorElement ? a.anchorElement.getBoundingClientRect() : null
                },
                getWindowDimensions: function() {
                    return {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                },
                getBodyDimensions: function() {
                    return {
                        width: document.body.clientWidth,
                        height: document.body.clientHeight
                    }
                },
                getWindowScroll: function() {
                    return {
                        x: window.pageXOffset,
                        y: window.pageYOffset
                    }
                },
                setPosition: function(c) {
                    a.root_.style.left = "left"in c ? c.left + "px" : "";
                    a.root_.style.right = "right"in c ? c.right + "px" : "";
                    a.root_.style.top = "top"in c ? c.top + "px" : "";
                    a.root_.style.bottom = "bottom"in c ? c.bottom + "px" : ""
                },
                setMaxHeight: function(c) {
                    a.root_.style.maxHeight = c
                }
            })
        }
        ,
        f
    }(E), ta = {
        MENU_SELECTED_LIST_ITEM: "f1",
        MENU_SELECTION_GROUP: "c1",
        ROOT: "w0"
    }, ia = {
        ARIA_SELECTED_ATTR: "aria-selected",
        CHECKBOX_SELECTOR: 'input[type="checkbox"]',
        LIST_SELECTOR: ".z0",
        SELECTED_EVENT: "MDCMenu:selected"
    }, xb = {
        FOCUS_ROOT_INDEX: -1
    };
    !function(v) {
        v[v.NONE = 0] = "NONE";
        v[v.LIST_ROOT = 1] = "LIST_ROOT";
        v[v.FIRST_ITEM = 2] = "FIRST_ITEM";
        v[v.LAST_ITEM = 3] = "LAST_ITEM"
    }(sa || (sa = {}));
    var yb = function(v) {
        function f(a) {
            a = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return a.closeAnimationEndTimerId_ = 0,
            a.defaultFocusState_ = sa.LIST_ROOT,
            a
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return ta
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return ia
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return xb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClassToElementAtIndex: function() {},
                    removeClassFromElementAtIndex: function() {},
                    addAttributeToElementAtIndex: function() {},
                    removeAttributeFromElementAtIndex: function() {},
                    elementContainsClass: function() {
                        return !1
                    },
                    closeSurface: function() {},
                    getElementIndex: function() {
                        return -1
                    },
                    getParentElement: function() {
                        return null
                    },
                    getSelectedElementIndex: function() {
                        return -1
                    },
                    notifySelected: function() {},
                    getMenuItemCount: function() {
                        return 0
                    },
                    focusItemAtIndex: function() {},
                    focusListRoot: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.destroy = function() {
            this.closeAnimationEndTimerId_ && clearTimeout(this.closeAnimationEndTimerId_);
            this.adapter_.closeSurface()
        }
        ,
        f.prototype.handleKeydown = function(a) {
            var c = a.keyCode;
            "Tab" !== a.key && 9 !== c || this.adapter_.closeSurface()
        }
        ,
        f.prototype.handleItemAction = function(a) {
            var c = this
              , p = this.adapter_.getElementIndex(a);
            0 > p || (this.adapter_.notifySelected({
                index: p
            }),
            this.adapter_.closeSurface(),
            this.closeAnimationEndTimerId_ = setTimeout(function() {
                var z = c.getSelectionGroup_(a);
                z && c.handleSelectionGroup_(z, p)
            }, 0))
        }
        ,
        f.prototype.handleMenuSurfaceOpened = function() {
            switch (this.defaultFocusState_) {
            case sa.FIRST_ITEM:
                this.adapter_.focusItemAtIndex(0);
                break;
            case sa.LAST_ITEM:
                this.adapter_.focusItemAtIndex(this.adapter_.getMenuItemCount() - 1);
                break;
            case sa.NONE:
                break;
            default:
                this.adapter_.focusListRoot()
            }
        }
        ,
        f.prototype.setDefaultFocusState = function(a) {
            this.defaultFocusState_ = a
        }
        ,
        f.prototype.handleSelectionGroup_ = function(a, c) {
            a = this.adapter_.getSelectedElementIndex(a);
            0 <= a && (this.adapter_.removeAttributeFromElementAtIndex(a, ia.ARIA_SELECTED_ATTR),
            this.adapter_.removeClassFromElementAtIndex(a, ta.MENU_SELECTED_LIST_ITEM));
            this.adapter_.addClassToElementAtIndex(c, ta.MENU_SELECTED_LIST_ITEM);
            this.adapter_.addAttributeToElementAtIndex(c, ia.ARIA_SELECTED_ATTR, "true")
        }
        ,
        f.prototype.getSelectionGroup_ = function(a) {
            a = this.adapter_.getParentElement(a);
            if (!a)
                return null;
            for (var c = this.adapter_.elementContainsClass(a, ta.MENU_SELECTION_GROUP); !c && a && !this.adapter_.elementContainsClass(a, Ca.cssClasses.ROOT); )
                c = !!(a = this.adapter_.getParentElement(a)) && this.adapter_.elementContainsClass(a, ta.MENU_SELECTION_GROUP);
            return c ? a : null
        }
        ,
        f
    }(C)
      , Ra = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.initialize = function(a, c) {
            void 0 === a && (a = function(p) {
                return new wb(p)
            }
            );
            void 0 === c && (c = function(p) {
                return new vb(p)
            }
            );
            this.menuSurfaceFactory_ = a;
            this.listFactory_ = c
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            var a = this;
            this.menuSurface_ = this.menuSurfaceFactory_(this.root_);
            var c = this.root_.querySelector(ia.LIST_SELECTOR);
            c ? (this.list_ = this.listFactory_(c),
            this.list_.wrapFocus = !0) : this.list_ = null;
            this.handleKeydown_ = function(p) {
                return a.foundation_.handleKeydown(p)
            }
            ;
            this.handleItemAction_ = function(p) {
                return a.foundation_.handleItemAction(a.items[p.detail.index])
            }
            ;
            this.handleMenuSurfaceOpened_ = function() {
                return a.foundation_.handleMenuSurfaceOpened()
            }
            ;
            this.menuSurface_.listen(ra.strings.OPENED_EVENT, this.handleMenuSurfaceOpened_);
            this.listen("keydown", this.handleKeydown_);
            this.listen(Ca.strings.ACTION_EVENT, this.handleItemAction_)
        }
        ,
        f.prototype.destroy = function() {
            this.list_ && this.list_.destroy();
            this.menuSurface_.destroy();
            this.menuSurface_.unlisten(ra.strings.OPENED_EVENT, this.handleMenuSurfaceOpened_);
            this.unlisten("keydown", this.handleKeydown_);
            this.unlisten(Ca.strings.ACTION_EVENT, this.handleItemAction_);
            v.prototype.destroy.call(this)
        }
        ,
        Object.defineProperty(f.prototype, "open", {
            get: function() {
                return this.menuSurface_.open
            },
            set: function(a) {
                this.menuSurface_.open = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "wrapFocus", {
            get: function() {
                return !!this.list_ && this.list_.wrapFocus
            },
            set: function(a) {
                this.list_ && (this.list_.wrapFocus = a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "items", {
            get: function() {
                return this.list_ ? this.list_.listElements : []
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "quickOpen", {
            set: function(a) {
                this.menuSurface_.quickOpen = a
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.setDefaultFocusState = function(a) {
            this.foundation_.setDefaultFocusState(a)
        }
        ,
        f.prototype.setAnchorCorner = function(a) {
            this.menuSurface_.setAnchorCorner(a)
        }
        ,
        f.prototype.setAnchorMargin = function(a) {
            this.menuSurface_.setAnchorMargin(a)
        }
        ,
        f.prototype.getOptionByIndex = function(a) {
            return a < this.items.length ? this.items[a] : null
        }
        ,
        f.prototype.setFixedPosition = function(a) {
            this.menuSurface_.setFixedPosition(a)
        }
        ,
        f.prototype.hoistMenuToBody = function() {
            this.menuSurface_.hoistMenuToBody()
        }
        ,
        f.prototype.setIsHoisted = function(a) {
            this.menuSurface_.setIsHoisted(a)
        }
        ,
        f.prototype.setAbsolutePosition = function(a, c) {
            this.menuSurface_.setAbsolutePosition(a, c)
        }
        ,
        f.prototype.setAnchorElement = function(a) {
            this.menuSurface_.anchorElement = a
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new yb({
                addClassToElementAtIndex: function(c, p) {
                    a.items[c].classList.add(p)
                },
                removeClassFromElementAtIndex: function(c, p) {
                    a.items[c].classList.remove(p)
                },
                addAttributeToElementAtIndex: function(c, p, z) {
                    a.items[c].setAttribute(p, z)
                },
                removeAttributeFromElementAtIndex: function(c, p) {
                    a.items[c].removeAttribute(p)
                },
                elementContainsClass: function(c, p) {
                    return c.classList.contains(p)
                },
                closeSurface: function() {
                    return a.open = !1
                },
                getElementIndex: function(c) {
                    return a.items.indexOf(c)
                },
                getParentElement: function(c) {
                    return c.parentElement
                },
                getSelectedElementIndex: function(c) {
                    return (c = c.querySelector("." + ta.MENU_SELECTED_LIST_ITEM)) ? a.items.indexOf(c) : -1
                },
                notifySelected: function(c) {
                    return a.emit(ia.SELECTED_EVENT, {
                        index: c.index,
                        item: a.items[c.index]
                    })
                },
                getMenuItemCount: function() {
                    return a.items.length
                },
                focusItemAtIndex: function(c) {
                    return a.items[c].focus()
                },
                focusListRoot: function() {
                    return a.root_.querySelector(ia.LIST_SELECTOR).focus()
                }
            })
        }
        ,
        f
    }(E)
      , Sa = {
        NOTCH_ELEMENT_SELECTOR: ".f3"
    }
      , Ta = {
        NOTCH_ELEMENT_PADDING: 8
    }
      , Ga = {
        NO_LABEL: "l3",
        OUTLINE_NOTCHED: "k3",
        OUTLINE_UPGRADED: "j3"
    }
      , zb = function(v) {
        function f(a) {
            return v.call(this, x({}, f.defaultAdapter, a)) || this
        }
        return g(f, v),
        Object.defineProperty(f, "strings", {
            get: function() {
                return Sa
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return Ga
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return Ta
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    setNotchWidthProperty: function() {},
                    removeNotchWidthProperty: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.notch = function(a) {
            var c = f.cssClasses.OUTLINE_NOTCHED;
            0 < a && (a += Ta.NOTCH_ELEMENT_PADDING);
            this.adapter_.setNotchWidthProperty(a);
            this.adapter_.addClass(c)
        }
        ,
        f.prototype.closeNotch = function() {
            this.adapter_.removeClass(f.cssClasses.OUTLINE_NOTCHED);
            this.adapter_.removeNotchWidthProperty()
        }
        ,
        f
    }(C)
      , Ua = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            this.notchElement_ = this.root_.querySelector(Sa.NOTCH_ELEMENT_SELECTOR);
            var a = this.root_.querySelector("." + Oa.cssClasses.ROOT);
            a ? (a.style.transitionDuration = "0s",
            this.root_.classList.add(Ga.OUTLINE_UPGRADED),
            requestAnimationFrame(function() {
                a.style.transitionDuration = ""
            })) : this.root_.classList.add(Ga.NO_LABEL)
        }
        ,
        f.prototype.notch = function(a) {
            this.foundation_.notch(a)
        }
        ,
        f.prototype.closeNotch = function() {
            this.foundation_.closeNotch()
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new zb({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                setNotchWidthProperty: function(c) {
                    return a.notchElement_.style.setProperty("width", c + "px")
                },
                removeNotchWidthProperty: function() {
                    return a.notchElement_.style.removeProperty("width")
                }
            })
        }
        ,
        f
    }(E)
      , P = {
        ACTIVATED: "x3",
        DISABLED: "o3",
        FOCUSED: "v3",
        INVALID: "z3",
        OUTLINED: "s3--outlined",
        REQUIRED: "_4",
        ROOT: "s3",
        SELECTED_ITEM_CLASS: "b4",
        WITH_LEADING_ICON: "n3"
    }
      , R = {
        ARIA_CONTROLS: "aria-controls",
        ARIA_SELECTED_ATTR: "aria-selected",
        CHANGE_EVENT: "MDCSelect:change",
        ENHANCED_VALUE_ATTR: "data-value",
        HIDDEN_INPUT_SELECTOR: 'input[type="hidden"]',
        LABEL_SELECTOR: ".h3",
        LEADING_ICON_SELECTOR: ".p3",
        LINE_RIPPLE_SELECTOR: "._3",
        MENU_SELECTOR: ".a4",
        NATIVE_CONTROL_SELECTOR: ".t3",
        OUTLINE_SELECTOR: ".c3",
        SELECTED_ITEM_SELECTOR: "." + P.SELECTED_ITEM_CLASS,
        SELECTED_TEXT_SELECTOR: ".u3"
    }
      , Va = {
        LABEL_SCALE: .75
    }
      , Ab = function(v) {
        function f(a, c) {
            void 0 === c && (c = {});
            a = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return a.leadingIcon_ = c.leadingIcon,
            a.helperText_ = c.helperText,
            a
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return P
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return Va
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return R
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    hasClass: function() {
                        return !1
                    },
                    activateBottomLine: function() {},
                    deactivateBottomLine: function() {},
                    setValue: function() {},
                    getValue: function() {
                        return ""
                    },
                    floatLabel: function() {},
                    getLabelWidth: function() {
                        return 0
                    },
                    hasOutline: function() {
                        return !1
                    },
                    notchOutline: function() {},
                    closeOutline: function() {},
                    openMenu: function() {},
                    closeMenu: function() {},
                    isMenuOpen: function() {
                        return !1
                    },
                    setSelectedIndex: function() {},
                    setDisabled: function() {},
                    setRippleCenter: function() {},
                    notifyChange: function() {},
                    checkValidity: function() {
                        return !1
                    },
                    setValid: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.setSelectedIndex = function(a) {
            this.adapter_.setSelectedIndex(a);
            this.adapter_.closeMenu();
            this.handleChange(!0)
        }
        ,
        f.prototype.setValue = function(a) {
            this.adapter_.setValue(a);
            this.handleChange(!0)
        }
        ,
        f.prototype.getValue = function() {
            return this.adapter_.getValue()
        }
        ,
        f.prototype.setDisabled = function(a) {
            a ? this.adapter_.addClass(P.DISABLED) : this.adapter_.removeClass(P.DISABLED);
            this.adapter_.setDisabled(a);
            this.adapter_.closeMenu();
            this.leadingIcon_ && this.leadingIcon_.setDisabled(a)
        }
        ,
        f.prototype.setHelperTextContent = function(a) {
            this.helperText_ && this.helperText_.setContent(a)
        }
        ,
        f.prototype.layout = function() {
            var a = 0 < this.getValue().length;
            this.notchOutline(a)
        }
        ,
        f.prototype.handleMenuOpened = function() {
            this.adapter_.addClass(P.ACTIVATED)
        }
        ,
        f.prototype.handleMenuClosed = function() {
            this.adapter_.removeClass(P.ACTIVATED)
        }
        ,
        f.prototype.handleChange = function(a) {
            void 0 === a && (a = !0);
            var c = this.getValue()
              , p = 0 < c.length
              , z = this.adapter_.hasClass(P.REQUIRED);
            this.notchOutline(p);
            this.adapter_.hasClass(P.FOCUSED) || this.adapter_.floatLabel(p);
            a && (this.adapter_.notifyChange(c),
            z && (this.setValid(this.isValid()),
            this.helperText_ && this.helperText_.setValidity(this.isValid())))
        }
        ,
        f.prototype.handleFocus = function() {
            this.adapter_.addClass(P.FOCUSED);
            this.adapter_.floatLabel(!0);
            this.notchOutline(!0);
            this.adapter_.activateBottomLine();
            this.helperText_ && this.helperText_.showToScreenReader()
        }
        ,
        f.prototype.handleBlur = function() {
            this.adapter_.isMenuOpen() || (this.adapter_.removeClass(P.FOCUSED),
            this.handleChange(!1),
            this.adapter_.deactivateBottomLine(),
            this.adapter_.hasClass(P.REQUIRED) && (this.setValid(this.isValid()),
            this.helperText_ && this.helperText_.setValidity(this.isValid())))
        }
        ,
        f.prototype.handleClick = function(a) {
            this.adapter_.isMenuOpen() || (this.adapter_.setRippleCenter(a),
            this.adapter_.openMenu())
        }
        ,
        f.prototype.handleKeydown = function(a) {
            if (!this.adapter_.isMenuOpen()) {
                var c = "Enter" === a.key || 13 === a.keyCode
                  , p = "Space" === a.key || 32 === a.keyCode
                  , z = "ArrowUp" === a.key || 38 === a.keyCode
                  , G = "ArrowDown" === a.key || 40 === a.keyCode;
                this.adapter_.hasClass(P.FOCUSED) && (c || p || z || G) && (this.adapter_.openMenu(),
                a.preventDefault())
            }
        }
        ,
        f.prototype.notchOutline = function(a) {
            if (this.adapter_.hasOutline()) {
                var c = this.adapter_.hasClass(P.FOCUSED);
                a ? (a = Va.LABEL_SCALE,
                a *= this.adapter_.getLabelWidth(),
                this.adapter_.notchOutline(a)) : c || this.adapter_.closeOutline()
            }
        }
        ,
        f.prototype.setLeadingIconAriaLabel = function(a) {
            this.leadingIcon_ && this.leadingIcon_.setAriaLabel(a)
        }
        ,
        f.prototype.setLeadingIconContent = function(a) {
            this.leadingIcon_ && this.leadingIcon_.setContent(a)
        }
        ,
        f.prototype.setValid = function(a) {
            this.adapter_.setValid(a)
        }
        ,
        f.prototype.isValid = function() {
            return this.adapter_.checkValidity()
        }
        ,
        f
    }(C)
      , za = {
        ARIA_HIDDEN: "aria-hidden",
        ROLE: "role"
    }
      , ma = {
        HELPER_TEXT_PERSISTENT: "r3",
        HELPER_TEXT_VALIDATION_MSG: "y3"
    }
      , Bb = function(v) {
        function f(a) {
            return v.call(this, x({}, f.defaultAdapter, a)) || this
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return ma
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return za
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    hasClass: function() {
                        return !1
                    },
                    setAttr: function() {},
                    removeAttr: function() {},
                    setContent: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.setContent = function(a) {
            this.adapter_.setContent(a)
        }
        ,
        f.prototype.setPersistent = function(a) {
            a ? this.adapter_.addClass(ma.HELPER_TEXT_PERSISTENT) : this.adapter_.removeClass(ma.HELPER_TEXT_PERSISTENT)
        }
        ,
        f.prototype.setValidation = function(a) {
            a ? this.adapter_.addClass(ma.HELPER_TEXT_VALIDATION_MSG) : this.adapter_.removeClass(ma.HELPER_TEXT_VALIDATION_MSG)
        }
        ,
        f.prototype.showToScreenReader = function() {
            this.adapter_.removeAttr(za.ARIA_HIDDEN)
        }
        ,
        f.prototype.setValidity = function(a) {
            var c = this.adapter_.hasClass(ma.HELPER_TEXT_PERSISTENT);
            (a = this.adapter_.hasClass(ma.HELPER_TEXT_VALIDATION_MSG) && !a) ? this.adapter_.setAttr(za.ROLE, "alert") : this.adapter_.removeAttr(za.ROLE);
            c || a || this.hide_()
        }
        ,
        f.prototype.hide_ = function() {
            this.adapter_.setAttr(za.ARIA_HIDDEN, "true")
        }
        ,
        f
    }(C)
      , Cb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "foundation", {
            get: function() {
                return this.foundation_
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Bb({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                setAttr: function(c, p) {
                    return a.root_.setAttribute(c, p)
                },
                removeAttr: function(c) {
                    return a.root_.removeAttribute(c)
                },
                setContent: function(c) {
                    a.root_.textContent = c
                }
            })
        }
        ,
        f
    }(E)
      , Wa = {
        ICON_EVENT: "MDCSelect:icon",
        ICON_ROLE: "button"
    }
      , Xa = ["click", "keydown"]
      , Ya = function(v) {
        function f(a) {
            var c = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return c.savedTabIndex_ = null,
            c.interactionHandler_ = function(p) {
                return c.handleInteraction(p)
            }
            ,
            c
        }
        return g(f, v),
        Object.defineProperty(f, "strings", {
            get: function() {
                return Wa
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    getAttr: function() {
                        return null
                    },
                    setAttr: function() {},
                    removeAttr: function() {},
                    setContent: function() {},
                    registerInteractionHandler: function() {},
                    deregisterInteractionHandler: function() {},
                    notifyIconAction: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            var a = this;
            this.savedTabIndex_ = this.adapter_.getAttr("tabindex");
            Xa.forEach(function(c) {
                a.adapter_.registerInteractionHandler(c, a.interactionHandler_)
            })
        }
        ,
        f.prototype.destroy = function() {
            var a = this;
            Xa.forEach(function(c) {
                a.adapter_.deregisterInteractionHandler(c, a.interactionHandler_)
            })
        }
        ,
        f.prototype.setDisabled = function(a) {
            this.savedTabIndex_ && (a ? (this.adapter_.setAttr("tabindex", "-1"),
            this.adapter_.removeAttr("role")) : (this.adapter_.setAttr("tabindex", this.savedTabIndex_),
            this.adapter_.setAttr("role", Wa.ICON_ROLE)))
        }
        ,
        f.prototype.setAriaLabel = function(a) {
            this.adapter_.setAttr("aria-label", a)
        }
        ,
        f.prototype.setContent = function(a) {
            this.adapter_.setContent(a)
        }
        ,
        f.prototype.handleInteraction = function(a) {
            var c = "Enter" === a.key || 13 === a.keyCode;
            ("click" === a.type || c) && this.adapter_.notifyIconAction()
        }
        ,
        f
    }(C)
      , Db = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "foundation", {
            get: function() {
                return this.foundation_
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Ya({
                getAttr: function(c) {
                    return a.root_.getAttribute(c)
                },
                setAttr: function(c, p) {
                    return a.root_.setAttribute(c, p)
                },
                removeAttr: function(c) {
                    return a.root_.removeAttribute(c)
                },
                setContent: function(c) {
                    a.root_.textContent = c
                },
                registerInteractionHandler: function(c, p) {
                    return a.listen(c, p)
                },
                deregisterInteractionHandler: function(c, p) {
                    return a.unlisten(c, p)
                },
                notifyIconAction: function() {
                    return a.emit(Ya.strings.ICON_EVENT, {}, !0)
                }
            })
        }
        ,
        f
    }(E)
      , Eb = ["required", "aria-required"]
      , Za = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.initialize = function(a, c, p, z, G, H) {
            void 0 === a && (a = function(L) {
                return new Pa(L)
            }
            );
            void 0 === c && (c = function(L) {
                return new Qa(L)
            }
            );
            void 0 === p && (p = function(L) {
                return new Ua(L)
            }
            );
            void 0 === z && (z = function(L) {
                return new Ra(L)
            }
            );
            void 0 === G && (G = function(L) {
                return new Db(L)
            }
            );
            void 0 === H && (H = function(L) {
                return new Cb(L)
            }
            );
            this.isMenuOpen_ = !1;
            this.nativeControl_ = this.root_.querySelector(R.NATIVE_CONTROL_SELECTOR);
            this.selectedText_ = this.root_.querySelector(R.SELECTED_TEXT_SELECTOR);
            var M = this.nativeControl_ || this.selectedText_;
            if (!M)
                throw Error("MDCSelect: Missing required element: Exactly one of the following selectors must be present: '" + R.NATIVE_CONTROL_SELECTOR + "' or '" + R.SELECTED_TEXT_SELECTOR + "'");
            (this.targetElement_ = M,
            this.targetElement_.hasAttribute(R.ARIA_CONTROLS)) && (M = document.getElementById(this.targetElement_.getAttribute(R.ARIA_CONTROLS))) && (this.helperText_ = H(M));
            this.selectedText_ && this.enhancedSelectSetup_(z);
            this.label_ = (z = this.root_.querySelector(R.LABEL_SELECTOR)) ? a(z) : null;
            this.lineRipple_ = (a = this.root_.querySelector(R.LINE_RIPPLE_SELECTOR)) ? c(a) : null;
            this.outline_ = (c = this.root_.querySelector(R.OUTLINE_SELECTOR)) ? p(c) : null;
            (p = this.root_.querySelector(R.LEADING_ICON_SELECTOR)) && (this.root_.classList.add(P.WITH_LEADING_ICON),
            this.leadingIcon_ = G(p),
            this.menuElement_ && this.menuElement_.classList.add(P.WITH_LEADING_ICON));
            this.root_.classList.contains(P.OUTLINED) || (this.ripple = this.createRipple_());
            this.initialSyncRequiredState_();
            this.addMutationObserverForRequired_()
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            var a = this;
            if (this.handleChange_ = function() {
                return a.foundation_.handleChange(!0)
            }
            ,
            this.handleFocus_ = function() {
                return a.foundation_.handleFocus()
            }
            ,
            this.handleBlur_ = function() {
                return a.foundation_.handleBlur()
            }
            ,
            this.handleClick_ = function(p) {
                a.selectedText_ && a.selectedText_.focus();
                a.foundation_.handleClick(a.getNormalizedXCoordinate_(p))
            }
            ,
            this.handleKeydown_ = function(p) {
                return a.foundation_.handleKeydown(p)
            }
            ,
            this.handleMenuSelected_ = function(p) {
                return a.selectedIndex = p.detail.index
            }
            ,
            this.handleMenuOpened_ = function() {
                (a.foundation_.handleMenuOpened(),
                0 !== a.menu_.items.length) && a.menu_.items[0 <= a.selectedIndex ? a.selectedIndex : 0].focus()
            }
            ,
            this.handleMenuClosed_ = function() {
                a.foundation_.handleMenuClosed();
                a.isMenuOpen_ = !1;
                a.selectedText_.removeAttribute("aria-expanded");
                document.activeElement !== a.selectedText_ && a.foundation_.handleBlur()
            }
            ,
            this.targetElement_.addEventListener("change", this.handleChange_),
            this.targetElement_.addEventListener("focus", this.handleFocus_),
            this.targetElement_.addEventListener("blur", this.handleBlur_),
            this.targetElement_.addEventListener("click", this.handleClick_),
            this.menuElement_)
                if (this.selectedText_.addEventListener("keydown", this.handleKeydown_),
                this.menu_.listen(ea.CLOSED_EVENT, this.handleMenuClosed_),
                this.menu_.listen(ea.OPENED_EVENT, this.handleMenuOpened_),
                this.menu_.listen(ia.SELECTED_EVENT, this.handleMenuSelected_),
                this.hiddenInput_ && this.hiddenInput_.value)
                    (c = this.getEnhancedSelectAdapterMethods_()).setValue(this.hiddenInput_.value);
                else if (this.menuElement_.querySelector(R.SELECTED_ITEM_SELECTOR)) {
                    var c;
                    (c = this.getEnhancedSelectAdapterMethods_()).setValue(c.getValue())
                }
            this.foundation_.handleChange(!1);
            (this.root_.classList.contains(P.DISABLED) || this.nativeControl_ && this.nativeControl_.disabled) && (this.disabled = !0)
        }
        ,
        f.prototype.destroy = function() {
            this.targetElement_.removeEventListener("change", this.handleChange_);
            this.targetElement_.removeEventListener("focus", this.handleFocus_);
            this.targetElement_.removeEventListener("blur", this.handleBlur_);
            this.targetElement_.removeEventListener("keydown", this.handleKeydown_);
            this.targetElement_.removeEventListener("click", this.handleClick_);
            this.menu_ && (this.menu_.unlisten(ea.CLOSED_EVENT, this.handleMenuClosed_),
            this.menu_.unlisten(ea.OPENED_EVENT, this.handleMenuOpened_),
            this.menu_.unlisten(ia.SELECTED_EVENT, this.handleMenuSelected_),
            this.menu_.destroy());
            this.ripple && this.ripple.destroy();
            this.outline_ && this.outline_.destroy();
            this.leadingIcon_ && this.leadingIcon_.destroy();
            this.helperText_ && this.helperText_.destroy();
            this.validationObserver_ && this.validationObserver_.disconnect();
            v.prototype.destroy.call(this)
        }
        ,
        Object.defineProperty(f.prototype, "value", {
            get: function() {
                return this.foundation_.getValue()
            },
            set: function(a) {
                this.foundation_.setValue(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "selectedIndex", {
            get: function() {
                var a = -1;
                this.menuElement_ && this.menu_ ? (a = this.menuElement_.querySelector(R.SELECTED_ITEM_SELECTOR),
                a = this.menu_.items.indexOf(a)) : this.nativeControl_ && (a = this.nativeControl_.selectedIndex);
                return a
            },
            set: function(a) {
                this.foundation_.setSelectedIndex(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "disabled", {
            get: function() {
                return this.root_.classList.contains(P.DISABLED) || !!this.nativeControl_ && this.nativeControl_.disabled
            },
            set: function(a) {
                this.foundation_.setDisabled(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "leadingIconAriaLabel", {
            set: function(a) {
                this.foundation_.setLeadingIconAriaLabel(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "leadingIconContent", {
            set: function(a) {
                this.foundation_.setLeadingIconContent(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "helperTextContent", {
            set: function(a) {
                this.foundation_.setHelperTextContent(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "valid", {
            get: function() {
                return this.foundation_.isValid()
            },
            set: function(a) {
                this.foundation_.setValid(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "required", {
            get: function() {
                return this.nativeControl_ ? this.nativeControl_.required : "true" === this.selectedText_.getAttribute("aria-required")
            },
            set: function(a) {
                this.nativeControl_ ? this.nativeControl_.required = a : a ? this.selectedText_.setAttribute("aria-required", a.toString()) : this.selectedText_.removeAttribute("aria-required")
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.layout = function() {
            this.foundation_.layout()
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = x({}, this.nativeControl_ ? this.getNativeSelectAdapterMethods_() : this.getEnhancedSelectAdapterMethods_(), this.getCommonAdapterMethods_(), this.getOutlineAdapterMethods_(), this.getLabelAdapterMethods_());
            return new Ab(a,this.getFoundationMap_())
        }
        ,
        f.prototype.enhancedSelectSetup_ = function(a) {
            var c = this.root_.classList.contains(P.DISABLED);
            this.selectedText_.setAttribute("tabindex", c ? "-1" : "0");
            this.hiddenInput_ = this.root_.querySelector(R.HIDDEN_INPUT_SELECTOR);
            this.menuElement_ = this.root_.querySelector(R.MENU_SELECTOR);
            this.menu_ = a(this.menuElement_);
            this.menu_.hoistMenuToBody();
            this.menu_.setAnchorElement(this.root_);
            this.menu_.setAnchorCorner(pa.BOTTOM_START);
            this.menu_.wrapFocus = !1
        }
        ,
        f.prototype.createRipple_ = function() {
            var a = this
              , c = x({}, ba.createAdapter(this), {
                registerInteractionHandler: function(p, z) {
                    return a.targetElement_.addEventListener(p, z)
                },
                deregisterInteractionHandler: function(p, z) {
                    return a.targetElement_.removeEventListener(p, z)
                }
            });
            return new ba(this.root_,new aa(c))
        }
        ,
        f.prototype.getNativeSelectAdapterMethods_ = function() {
            var a = this;
            return {
                getValue: function() {
                    return a.nativeControl_.value
                },
                setValue: function(c) {
                    a.nativeControl_.value = c
                },
                openMenu: function() {},
                closeMenu: function() {},
                isMenuOpen: function() {
                    return !1
                },
                setSelectedIndex: function(c) {
                    a.nativeControl_.selectedIndex = c
                },
                setDisabled: function(c) {
                    a.nativeControl_.disabled = c
                },
                setValid: function(c) {
                    c ? a.root_.classList.remove(P.INVALID) : a.root_.classList.add(P.INVALID)
                },
                checkValidity: function() {
                    return a.nativeControl_.checkValidity()
                }
            }
        }
        ,
        f.prototype.getEnhancedSelectAdapterMethods_ = function() {
            var a = this;
            return {
                getValue: function() {
                    var c = a.menuElement_.querySelector(R.SELECTED_ITEM_SELECTOR);
                    return c && c.hasAttribute(R.ENHANCED_VALUE_ATTR) && c.getAttribute(R.ENHANCED_VALUE_ATTR) || ""
                },
                setValue: function(c) {
                    c = a.menuElement_.querySelector("[" + R.ENHANCED_VALUE_ATTR + '="' + c + '"]');
                    a.setEnhancedSelectedIndex_(c ? a.menu_.items.indexOf(c) : -1)
                },
                openMenu: function() {
                    a.menu_ && !a.menu_.open && (a.menu_.open = !0,
                    a.isMenuOpen_ = !0,
                    a.selectedText_.setAttribute("aria-expanded", "true"))
                },
                closeMenu: function() {
                    a.menu_ && a.menu_.open && (a.menu_.open = !1)
                },
                isMenuOpen: function() {
                    return !!a.menu_ && a.isMenuOpen_
                },
                setSelectedIndex: function(c) {
                    return a.setEnhancedSelectedIndex_(c)
                },
                setDisabled: function(c) {
                    a.selectedText_.setAttribute("tabindex", c ? "-1" : "0");
                    a.selectedText_.setAttribute("aria-disabled", c.toString());
                    a.hiddenInput_ && (a.hiddenInput_.disabled = c)
                },
                checkValidity: function() {
                    var c = a.root_.classList;
                    return !(c.contains(P.REQUIRED) && !c.contains(P.DISABLED)) || -1 !== a.selectedIndex && (0 !== a.selectedIndex || !!a.value)
                },
                setValid: function(c) {
                    a.selectedText_.setAttribute("aria-invalid", (!c).toString());
                    c ? a.root_.classList.remove(P.INVALID) : a.root_.classList.add(P.INVALID)
                }
            }
        }
        ,
        f.prototype.getCommonAdapterMethods_ = function() {
            var a = this;
            return {
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                setRippleCenter: function(c) {
                    return a.lineRipple_ && a.lineRipple_.setRippleCenter(c)
                },
                activateBottomLine: function() {
                    return a.lineRipple_ && a.lineRipple_.activate()
                },
                deactivateBottomLine: function() {
                    return a.lineRipple_ && a.lineRipple_.deactivate()
                },
                notifyChange: function(c) {
                    a.emit(R.CHANGE_EVENT, {
                        value: c,
                        index: a.selectedIndex
                    }, !0)
                }
            }
        }
        ,
        f.prototype.getOutlineAdapterMethods_ = function() {
            var a = this;
            return {
                hasOutline: function() {
                    return !!a.outline_
                },
                notchOutline: function(c) {
                    return a.outline_ && a.outline_.notch(c)
                },
                closeOutline: function() {
                    return a.outline_ && a.outline_.closeNotch()
                }
            }
        }
        ,
        f.prototype.getLabelAdapterMethods_ = function() {
            var a = this;
            return {
                floatLabel: function(c) {
                    return a.label_ && a.label_.float(c)
                },
                getLabelWidth: function() {
                    return a.label_ ? a.label_.getWidth() : 0
                }
            }
        }
        ,
        f.prototype.getNormalizedXCoordinate_ = function(a) {
            var c = a.target.getBoundingClientRect();
            return (this.isTouchEvent_(a) ? a.touches[0].clientX : a.clientX) - c.left
        }
        ,
        f.prototype.isTouchEvent_ = function(a) {
            return !!a.touches
        }
        ,
        f.prototype.getFoundationMap_ = function() {
            return {
                helperText: this.helperText_ ? this.helperText_.foundation : void 0,
                leadingIcon: this.leadingIcon_ ? this.leadingIcon_.foundation : void 0
            }
        }
        ,
        f.prototype.setEnhancedSelectedIndex_ = function(a) {
            a = this.menu_.items[a];
            this.selectedText_.textContent = a ? a.textContent.trim() : "";
            var c = this.menuElement_.querySelector(R.SELECTED_ITEM_SELECTOR);
            c && (c.classList.remove(P.SELECTED_ITEM_CLASS),
            c.removeAttribute(R.ARIA_SELECTED_ATTR));
            a && (a.classList.add(P.SELECTED_ITEM_CLASS),
            a.setAttribute(R.ARIA_SELECTED_ATTR, "true"));
            this.hiddenInput_ && (this.hiddenInput_.value = a && a.getAttribute(R.ENHANCED_VALUE_ATTR) || "");
            this.layout()
        }
        ,
        f.prototype.initialSyncRequiredState_ = function() {
            (this.targetElement_.required || "true" === this.targetElement_.getAttribute("aria-required") || this.root_.classList.contains(P.REQUIRED)) && (this.nativeControl_ ? this.nativeControl_.required = !0 : this.selectedText_.setAttribute("aria-required", "true"),
            this.root_.classList.add(P.REQUIRED))
        }
        ,
        f.prototype.addMutationObserverForRequired_ = function() {
            var a = this
              , c = new MutationObserver(function(p) {
                (function(z) {
                    return z.map(function(G) {
                        return G.attributeName
                    }).filter(function(G) {
                        return G
                    })
                }
                )(p).some(function(z) {
                    return -1 !== Eb.indexOf(z) && (a.selectedText_ ? "true" === a.selectedText_.getAttribute("aria-required") ? a.root_.classList.add(P.REQUIRED) : a.root_.classList.remove(P.REQUIRED) : a.nativeControl_.required ? a.root_.classList.add(P.REQUIRED) : a.root_.classList.remove(P.REQUIRED),
                    !0)
                })
            }
            );
            c.observe(this.targetElement_, {
                attributes: !0
            });
            this.validationObserver_ = c
        }
        ,
        f
    }(E)
      , $a = {
        ROOT: "j4-character-counter"
    }
      , Fb = {
        ROOT_SELECTOR: "." + $a.ROOT
    }
      , ab = function(v) {
        function f(a) {
            return v.call(this, x({}, f.defaultAdapter, a)) || this
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return $a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return Fb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    setContent: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.setCounterValue = function(a, c) {
            a = Math.min(a, c);
            this.adapter_.setContent(a + " / " + c)
        }
        ,
        f
    }(C)
      , Gb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "foundation", {
            get: function() {
                return this.foundation_
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new ab({
                setContent: function(c) {
                    a.root_.textContent = c
                }
            })
        }
        ,
        f
    }(E)
      , ua = {
        ARIA_CONTROLS: "aria-controls",
        ICON_SELECTOR: ".h4",
        INPUT_SELECTOR: ".l4",
        LABEL_SELECTOR: ".h3",
        LINE_RIPPLE_SELECTOR: "._3",
        OUTLINE_SELECTOR: ".c3"
    }
      , va = {
        DENSE: "j4--dense",
        DISABLED: "k4",
        FOCUSED: "p4",
        FULLWIDTH: "j4--fullwidth",
        HELPER_LINE: "n4",
        INVALID: "r4",
        NO_LABEL: "o4",
        OUTLINED: "j4--outlined",
        ROOT: "j4",
        TEXTAREA: "m4",
        WITH_LEADING_ICON: "g4",
        WITH_TRAILING_ICON: "i4"
    }
      , Ha = {
        DENSE_LABEL_SCALE: .923,
        LABEL_SCALE: .75
    }
      , Hb = "pattern min max required step minlength maxlength".split(" ")
      , Ib = "color date datetime-local month range time week".split(" ")
      , bb = ["mousedown", "touchstart"]
      , cb = ["click", "keydown"]
      , Jb = function(v) {
        function f(a, c) {
            void 0 === c && (c = {});
            var p = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return p.isFocused_ = !1,
            p.receivedUserInput_ = !1,
            p.isValid_ = !0,
            p.useNativeValidation_ = !0,
            p.helperText_ = c.helperText,
            p.characterCounter_ = c.characterCounter,
            p.leadingIcon_ = c.leadingIcon,
            p.trailingIcon_ = c.trailingIcon,
            p.inputFocusHandler_ = function() {
                return p.activateFocus()
            }
            ,
            p.inputBlurHandler_ = function() {
                return p.deactivateFocus()
            }
            ,
            p.inputInputHandler_ = function() {
                return p.handleInput()
            }
            ,
            p.setPointerXOffset_ = function(z) {
                return p.setTransformOrigin(z)
            }
            ,
            p.textFieldInteractionHandler_ = function() {
                return p.handleTextFieldInteraction()
            }
            ,
            p.validationAttributeChangeHandler_ = function(z) {
                return p.handleValidationAttributeChange(z)
            }
            ,
            p
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return va
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return ua
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return Ha
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "shouldAlwaysFloat_", {
            get: function() {
                var a = this.getNativeInput_().type;
                return 0 <= Ib.indexOf(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "shouldFloat", {
            get: function() {
                return this.shouldAlwaysFloat_ || this.isFocused_ || !!this.getValue() || this.isBadInput_()
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "shouldShake", {
            get: function() {
                return !this.isFocused_ && !this.isValid() && !!this.getValue()
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    hasClass: function() {
                        return !0
                    },
                    registerTextFieldInteractionHandler: function() {},
                    deregisterTextFieldInteractionHandler: function() {},
                    registerInputInteractionHandler: function() {},
                    deregisterInputInteractionHandler: function() {},
                    registerValidationAttributeChangeHandler: function() {
                        return new MutationObserver(function() {}
                        )
                    },
                    deregisterValidationAttributeChangeHandler: function() {},
                    getNativeInput: function() {
                        return null
                    },
                    isFocused: function() {
                        return !1
                    },
                    activateLineRipple: function() {},
                    deactivateLineRipple: function() {},
                    setLineRippleTransformOrigin: function() {},
                    shakeLabel: function() {},
                    floatLabel: function() {},
                    hasLabel: function() {
                        return !1
                    },
                    getLabelWidth: function() {
                        return 0
                    },
                    hasOutline: function() {
                        return !1
                    },
                    notchOutline: function() {},
                    closeOutline: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            var a = this;
            this.adapter_.isFocused() ? this.inputFocusHandler_() : this.adapter_.hasLabel() && this.shouldFloat && (this.notchOutline(!0),
            this.adapter_.floatLabel(!0));
            this.adapter_.registerInputInteractionHandler("focus", this.inputFocusHandler_);
            this.adapter_.registerInputInteractionHandler("blur", this.inputBlurHandler_);
            this.adapter_.registerInputInteractionHandler("input", this.inputInputHandler_);
            bb.forEach(function(c) {
                a.adapter_.registerInputInteractionHandler(c, a.setPointerXOffset_)
            });
            cb.forEach(function(c) {
                a.adapter_.registerTextFieldInteractionHandler(c, a.textFieldInteractionHandler_)
            });
            this.validationObserver_ = this.adapter_.registerValidationAttributeChangeHandler(this.validationAttributeChangeHandler_);
            this.setCharacterCounter_(this.getValue().length)
        }
        ,
        f.prototype.destroy = function() {
            var a = this;
            this.adapter_.deregisterInputInteractionHandler("focus", this.inputFocusHandler_);
            this.adapter_.deregisterInputInteractionHandler("blur", this.inputBlurHandler_);
            this.adapter_.deregisterInputInteractionHandler("input", this.inputInputHandler_);
            bb.forEach(function(c) {
                a.adapter_.deregisterInputInteractionHandler(c, a.setPointerXOffset_)
            });
            cb.forEach(function(c) {
                a.adapter_.deregisterTextFieldInteractionHandler(c, a.textFieldInteractionHandler_)
            });
            this.adapter_.deregisterValidationAttributeChangeHandler(this.validationObserver_)
        }
        ,
        f.prototype.handleTextFieldInteraction = function() {
            var a = this.adapter_.getNativeInput();
            a && a.disabled || (this.receivedUserInput_ = !0)
        }
        ,
        f.prototype.handleValidationAttributeChange = function(a) {
            var c = this;
            a.some(function(p) {
                return -1 < Hb.indexOf(p) && (c.styleValidity_(!0),
                !0)
            });
            -1 < a.indexOf("maxlength") && this.setCharacterCounter_(this.getValue().length)
        }
        ,
        f.prototype.notchOutline = function(a) {
            this.adapter_.hasOutline() && (a ? (a = this.adapter_.hasClass(va.DENSE) ? Ha.DENSE_LABEL_SCALE : Ha.LABEL_SCALE,
            a *= this.adapter_.getLabelWidth(),
            this.adapter_.notchOutline(a)) : this.adapter_.closeOutline())
        }
        ,
        f.prototype.activateFocus = function() {
            this.isFocused_ = !0;
            this.styleFocused_(this.isFocused_);
            this.adapter_.activateLineRipple();
            this.adapter_.hasLabel() && (this.notchOutline(this.shouldFloat),
            this.adapter_.floatLabel(this.shouldFloat),
            this.adapter_.shakeLabel(this.shouldShake));
            this.helperText_ && this.helperText_.showToScreenReader()
        }
        ,
        f.prototype.setTransformOrigin = function(a) {
            var c = a.touches;
            a = c ? c[0] : a;
            c = a.target.getBoundingClientRect();
            this.adapter_.setLineRippleTransformOrigin(a.clientX - c.left)
        }
        ,
        f.prototype.handleInput = function() {
            this.autoCompleteFocus();
            this.setCharacterCounter_(this.getValue().length)
        }
        ,
        f.prototype.autoCompleteFocus = function() {
            this.receivedUserInput_ || this.activateFocus()
        }
        ,
        f.prototype.deactivateFocus = function() {
            this.isFocused_ = !1;
            this.adapter_.deactivateLineRipple();
            var a = this.isValid();
            this.styleValidity_(a);
            this.styleFocused_(this.isFocused_);
            this.adapter_.hasLabel() && (this.notchOutline(this.shouldFloat),
            this.adapter_.floatLabel(this.shouldFloat),
            this.adapter_.shakeLabel(this.shouldShake));
            this.shouldFloat || (this.receivedUserInput_ = !1)
        }
        ,
        f.prototype.getValue = function() {
            return this.getNativeInput_().value
        }
        ,
        f.prototype.setValue = function(a) {
            this.getValue() !== a && (this.getNativeInput_().value = a);
            this.setCharacterCounter_(a.length);
            a = this.isValid();
            this.styleValidity_(a);
            this.adapter_.hasLabel() && (this.notchOutline(this.shouldFloat),
            this.adapter_.floatLabel(this.shouldFloat),
            this.adapter_.shakeLabel(this.shouldShake))
        }
        ,
        f.prototype.isValid = function() {
            return this.useNativeValidation_ ? this.isNativeInputValid_() : this.isValid_
        }
        ,
        f.prototype.setValid = function(a) {
            this.isValid_ = a;
            this.styleValidity_(a);
            a = !a && !this.isFocused_;
            this.adapter_.hasLabel() && this.adapter_.shakeLabel(a)
        }
        ,
        f.prototype.setUseNativeValidation = function(a) {
            this.useNativeValidation_ = a
        }
        ,
        f.prototype.isDisabled = function() {
            return this.getNativeInput_().disabled
        }
        ,
        f.prototype.setDisabled = function(a) {
            this.getNativeInput_().disabled = a;
            this.styleDisabled_(a)
        }
        ,
        f.prototype.setHelperTextContent = function(a) {
            this.helperText_ && this.helperText_.setContent(a)
        }
        ,
        f.prototype.setLeadingIconAriaLabel = function(a) {
            this.leadingIcon_ && this.leadingIcon_.setAriaLabel(a)
        }
        ,
        f.prototype.setLeadingIconContent = function(a) {
            this.leadingIcon_ && this.leadingIcon_.setContent(a)
        }
        ,
        f.prototype.setTrailingIconAriaLabel = function(a) {
            this.trailingIcon_ && this.trailingIcon_.setAriaLabel(a)
        }
        ,
        f.prototype.setTrailingIconContent = function(a) {
            this.trailingIcon_ && this.trailingIcon_.setContent(a)
        }
        ,
        f.prototype.setCharacterCounter_ = function(a) {
            if (this.characterCounter_) {
                var c = this.getNativeInput_().maxLength;
                if (-1 === c)
                    throw Error("MDCTextFieldFoundation: Expected maxlength html property on text input or textarea.");
                this.characterCounter_.setCounterValue(a, c)
            }
        }
        ,
        f.prototype.isBadInput_ = function() {
            return this.getNativeInput_().validity.badInput || !1
        }
        ,
        f.prototype.isNativeInputValid_ = function() {
            return this.getNativeInput_().validity.valid
        }
        ,
        f.prototype.styleValidity_ = function(a) {
            var c = f.cssClasses.INVALID;
            a ? this.adapter_.removeClass(c) : this.adapter_.addClass(c);
            this.helperText_ && this.helperText_.setValidity(a)
        }
        ,
        f.prototype.styleFocused_ = function(a) {
            var c = f.cssClasses.FOCUSED;
            a ? this.adapter_.addClass(c) : this.adapter_.removeClass(c)
        }
        ,
        f.prototype.styleDisabled_ = function(a) {
            var c = f.cssClasses
              , p = c.DISABLED;
            c = c.INVALID;
            a ? (this.adapter_.addClass(p),
            this.adapter_.removeClass(c)) : this.adapter_.removeClass(p);
            this.leadingIcon_ && this.leadingIcon_.setDisabled(a);
            this.trailingIcon_ && this.trailingIcon_.setDisabled(a)
        }
        ,
        f.prototype.getNativeInput_ = function() {
            return (this.adapter_ ? this.adapter_.getNativeInput() : null) || {
                disabled: !1,
                maxLength: -1,
                type: "input",
                validity: {
                    badInput: !1,
                    valid: !0
                },
                value: ""
            }
        }
        ,
        f
    }(C)
      , ja = {
        HELPER_TEXT_PERSISTENT: "f4",
        HELPER_TEXT_VALIDATION_MSG: "q4",
        ROOT: "c4"
    }
      , Aa = {
        ARIA_HIDDEN: "aria-hidden",
        ROLE: "role",
        ROOT_SELECTOR: "." + ja.ROOT
    }
      , db = function(v) {
        function f(a) {
            return v.call(this, x({}, f.defaultAdapter, a)) || this
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return ja
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return Aa
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    addClass: function() {},
                    removeClass: function() {},
                    hasClass: function() {
                        return !1
                    },
                    setAttr: function() {},
                    removeAttr: function() {},
                    setContent: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.setContent = function(a) {
            this.adapter_.setContent(a)
        }
        ,
        f.prototype.setPersistent = function(a) {
            a ? this.adapter_.addClass(ja.HELPER_TEXT_PERSISTENT) : this.adapter_.removeClass(ja.HELPER_TEXT_PERSISTENT)
        }
        ,
        f.prototype.setValidation = function(a) {
            a ? this.adapter_.addClass(ja.HELPER_TEXT_VALIDATION_MSG) : this.adapter_.removeClass(ja.HELPER_TEXT_VALIDATION_MSG)
        }
        ,
        f.prototype.showToScreenReader = function() {
            this.adapter_.removeAttr(Aa.ARIA_HIDDEN)
        }
        ,
        f.prototype.setValidity = function(a) {
            var c = this.adapter_.hasClass(ja.HELPER_TEXT_PERSISTENT);
            (a = this.adapter_.hasClass(ja.HELPER_TEXT_VALIDATION_MSG) && !a) ? this.adapter_.setAttr(Aa.ROLE, "alert") : this.adapter_.removeAttr(Aa.ROLE);
            c || a || this.hide_()
        }
        ,
        f.prototype.hide_ = function() {
            this.adapter_.setAttr(Aa.ARIA_HIDDEN, "true")
        }
        ,
        f
    }(C)
      , Kb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "foundation", {
            get: function() {
                return this.foundation_
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new db({
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                setAttr: function(c, p) {
                    return a.root_.setAttribute(c, p)
                },
                removeAttr: function(c) {
                    return a.root_.removeAttribute(c)
                },
                setContent: function(c) {
                    a.root_.textContent = c
                }
            })
        }
        ,
        f
    }(E)
      , eb = {
        ICON_EVENT: "MDCTextField:icon",
        ICON_ROLE: "button"
    }
      , Lb = {
        ROOT: "h4"
    }
      , fb = ["click", "keydown"]
      , gb = function(v) {
        function f(a) {
            var c = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return c.savedTabIndex_ = null,
            c.interactionHandler_ = function(p) {
                return c.handleInteraction(p)
            }
            ,
            c
        }
        return g(f, v),
        Object.defineProperty(f, "strings", {
            get: function() {
                return eb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return Lb
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    getAttr: function() {
                        return null
                    },
                    setAttr: function() {},
                    removeAttr: function() {},
                    setContent: function() {},
                    registerInteractionHandler: function() {},
                    deregisterInteractionHandler: function() {},
                    notifyIconAction: function() {}
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            var a = this;
            this.savedTabIndex_ = this.adapter_.getAttr("tabindex");
            fb.forEach(function(c) {
                a.adapter_.registerInteractionHandler(c, a.interactionHandler_)
            })
        }
        ,
        f.prototype.destroy = function() {
            var a = this;
            fb.forEach(function(c) {
                a.adapter_.deregisterInteractionHandler(c, a.interactionHandler_)
            })
        }
        ,
        f.prototype.setDisabled = function(a) {
            this.savedTabIndex_ && (a ? (this.adapter_.setAttr("tabindex", "-1"),
            this.adapter_.removeAttr("role")) : (this.adapter_.setAttr("tabindex", this.savedTabIndex_),
            this.adapter_.setAttr("role", eb.ICON_ROLE)))
        }
        ,
        f.prototype.setAriaLabel = function(a) {
            this.adapter_.setAttr("aria-label", a)
        }
        ,
        f.prototype.setContent = function(a) {
            this.adapter_.setContent(a)
        }
        ,
        f.prototype.handleInteraction = function(a) {
            var c = "Enter" === a.key || 13 === a.keyCode;
            ("click" === a.type || c) && this.adapter_.notifyIconAction()
        }
        ,
        f
    }(C)
      , Mb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "foundation", {
            get: function() {
                return this.foundation_
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new gb({
                getAttr: function(c) {
                    return a.root_.getAttribute(c)
                },
                setAttr: function(c, p) {
                    return a.root_.setAttribute(c, p)
                },
                removeAttr: function(c) {
                    return a.root_.removeAttribute(c)
                },
                setContent: function(c) {
                    a.root_.textContent = c
                },
                registerInteractionHandler: function(c, p) {
                    return a.listen(c, p)
                },
                deregisterInteractionHandler: function(c, p) {
                    return a.unlisten(c, p)
                },
                notifyIconAction: function() {
                    return a.emit(gb.strings.ICON_EVENT, {}, !0)
                }
            })
        }
        ,
        f
    }(E)
      , Nb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        f.prototype.initialize = function(a, c, p, z, G, H, M) {
            void 0 === a && (a = function(Q, fa) {
                return new ba(Q,fa)
            }
            );
            void 0 === c && (c = function(Q) {
                return new Qa(Q)
            }
            );
            void 0 === p && (p = function(Q) {
                return new Kb(Q)
            }
            );
            void 0 === z && (z = function(Q) {
                return new Gb(Q)
            }
            );
            void 0 === G && (G = function(Q) {
                return new Mb(Q)
            }
            );
            void 0 === H && (H = function(Q) {
                return new Pa(Q)
            }
            );
            void 0 === M && (M = function(Q) {
                return new Ua(Q)
            }
            );
            this.input_ = this.root_.querySelector(ua.INPUT_SELECTOR);
            var L = this.root_.querySelector(ua.LABEL_SELECTOR);
            this.label_ = L ? H(L) : null;
            this.lineRipple_ = (H = this.root_.querySelector(ua.LINE_RIPPLE_SELECTOR)) ? c(H) : null;
            this.outline_ = (c = this.root_.querySelector(ua.OUTLINE_SELECTOR)) ? M(c) : null;
            H = db.strings;
            this.helperText_ = (H = (c = (M = this.root_.nextElementSibling) && M.classList.contains(va.HELPER_LINE)) && M && M.querySelector(H.ROOT_SELECTOR)) ? p(H) : null;
            p = ab.strings;
            H = this.root_.querySelector(p.ROOT_SELECTOR);
            !H && c && M && (H = M.querySelector(p.ROOT_SELECTOR));
            this.characterCounter_ = H ? z(H) : null;
            this.trailingIcon_ = this.leadingIcon_ = null;
            z = this.root_.querySelectorAll(ua.ICON_SELECTOR);
            0 < z.length && (1 < z.length ? (this.leadingIcon_ = G(z[0]),
            this.trailingIcon_ = G(z[1])) : this.root_.classList.contains(va.WITH_LEADING_ICON) ? this.leadingIcon_ = G(z[0]) : this.trailingIcon_ = G(z[0]));
            this.ripple = this.createRipple_(a)
        }
        ,
        f.prototype.destroy = function() {
            this.ripple && this.ripple.destroy();
            this.lineRipple_ && this.lineRipple_.destroy();
            this.helperText_ && this.helperText_.destroy();
            this.characterCounter_ && this.characterCounter_.destroy();
            this.leadingIcon_ && this.leadingIcon_.destroy();
            this.trailingIcon_ && this.trailingIcon_.destroy();
            this.label_ && this.label_.destroy();
            this.outline_ && this.outline_.destroy();
            v.prototype.destroy.call(this)
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            this.disabled = this.input_.disabled
        }
        ,
        Object.defineProperty(f.prototype, "value", {
            get: function() {
                return this.foundation_.getValue()
            },
            set: function(a) {
                this.foundation_.setValue(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "disabled", {
            get: function() {
                return this.foundation_.isDisabled()
            },
            set: function(a) {
                this.foundation_.setDisabled(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "valid", {
            get: function() {
                return this.foundation_.isValid()
            },
            set: function(a) {
                this.foundation_.setValid(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "required", {
            get: function() {
                return this.input_.required
            },
            set: function(a) {
                this.input_.required = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "pattern", {
            get: function() {
                return this.input_.pattern
            },
            set: function(a) {
                this.input_.pattern = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "minLength", {
            get: function() {
                return this.input_.minLength
            },
            set: function(a) {
                this.input_.minLength = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "maxLength", {
            get: function() {
                return this.input_.maxLength
            },
            set: function(a) {
                0 > a ? this.input_.removeAttribute("maxLength") : this.input_.maxLength = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "min", {
            get: function() {
                return this.input_.min
            },
            set: function(a) {
                this.input_.min = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "max", {
            get: function() {
                return this.input_.max
            },
            set: function(a) {
                this.input_.max = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "step", {
            get: function() {
                return this.input_.step
            },
            set: function(a) {
                this.input_.step = a
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "helperTextContent", {
            set: function(a) {
                this.foundation_.setHelperTextContent(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "leadingIconAriaLabel", {
            set: function(a) {
                this.foundation_.setLeadingIconAriaLabel(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "leadingIconContent", {
            set: function(a) {
                this.foundation_.setLeadingIconContent(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "trailingIconAriaLabel", {
            set: function(a) {
                this.foundation_.setTrailingIconAriaLabel(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "trailingIconContent", {
            set: function(a) {
                this.foundation_.setTrailingIconContent(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "useNativeValidation", {
            set: function(a) {
                this.foundation_.setUseNativeValidation(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.focus = function() {
            this.input_.focus()
        }
        ,
        f.prototype.layout = function() {
            this.foundation_.notchOutline(this.foundation_.shouldFloat)
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = x({}, this.getRootAdapterMethods_(), this.getInputAdapterMethods_(), this.getLabelAdapterMethods_(), this.getLineRippleAdapterMethods_(), this.getOutlineAdapterMethods_());
            return new Jb(a,this.getFoundationMap_())
        }
        ,
        f.prototype.getRootAdapterMethods_ = function() {
            var a = this;
            return {
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                registerTextFieldInteractionHandler: function(c, p) {
                    return a.listen(c, p)
                },
                deregisterTextFieldInteractionHandler: function(c, p) {
                    return a.unlisten(c, p)
                },
                registerValidationAttributeChangeHandler: function(c) {
                    var p = new MutationObserver(function(z) {
                        return c(function(G) {
                            return G.map(function(H) {
                                return H.attributeName
                            }).filter(function(H) {
                                return H
                            })
                        }(z))
                    }
                    );
                    return p.observe(a.input_, {
                        attributes: !0
                    }),
                    p
                },
                deregisterValidationAttributeChangeHandler: function(c) {
                    return c.disconnect()
                }
            }
        }
        ,
        f.prototype.getInputAdapterMethods_ = function() {
            var a = this;
            return {
                getNativeInput: function() {
                    return a.input_
                },
                isFocused: function() {
                    return document.activeElement === a.input_
                },
                registerInputInteractionHandler: function(c, p) {
                    return a.input_.addEventListener(c, p)
                },
                deregisterInputInteractionHandler: function(c, p) {
                    return a.input_.removeEventListener(c, p)
                }
            }
        }
        ,
        f.prototype.getLabelAdapterMethods_ = function() {
            var a = this;
            return {
                floatLabel: function(c) {
                    return a.label_ && a.label_.float(c)
                },
                getLabelWidth: function() {
                    return a.label_ ? a.label_.getWidth() : 0
                },
                hasLabel: function() {
                    return !!a.label_
                },
                shakeLabel: function(c) {
                    return a.label_ && a.label_.shake(c)
                }
            }
        }
        ,
        f.prototype.getLineRippleAdapterMethods_ = function() {
            var a = this;
            return {
                activateLineRipple: function() {
                    a.lineRipple_ && a.lineRipple_.activate()
                },
                deactivateLineRipple: function() {
                    a.lineRipple_ && a.lineRipple_.deactivate()
                },
                setLineRippleTransformOrigin: function(c) {
                    a.lineRipple_ && a.lineRipple_.setRippleCenter(c)
                }
            }
        }
        ,
        f.prototype.getOutlineAdapterMethods_ = function() {
            var a = this;
            return {
                closeOutline: function() {
                    return a.outline_ && a.outline_.closeNotch()
                },
                hasOutline: function() {
                    return !!a.outline_
                },
                notchOutline: function(c) {
                    return a.outline_ && a.outline_.notch(c)
                }
            }
        }
        ,
        f.prototype.getFoundationMap_ = function() {
            return {
                characterCounter: this.characterCounter_ ? this.characterCounter_.foundation : void 0,
                helperText: this.helperText_ ? this.helperText_.foundation : void 0,
                leadingIcon: this.leadingIcon_ ? this.leadingIcon_.foundation : void 0,
                trailingIcon: this.trailingIcon_ ? this.trailingIcon_.foundation : void 0
            }
        }
        ,
        f.prototype.createRipple_ = function(a) {
            var c = this
              , p = this.root_.classList.contains(va.TEXTAREA)
              , z = this.root_.classList.contains(va.OUTLINED);
            if (p || z)
                return null;
            p = x({}, ba.createAdapter(this), {
                isSurfaceActive: function() {
                    return t(c.input_, ":active")
                },
                registerInteractionHandler: function(G, H) {
                    return c.input_.addEventListener(G, H)
                },
                deregisterInteractionHandler: function(G, H) {
                    return c.input_.removeEventListener(G, H)
                }
            });
            return a(this.root_, new aa(p))
        }
        ,
        f
    }(E)
      , ha = {
        ACTIVE: "s6",
        DISABLED: "i6",
        DISCRETE: "v6",
        FOCUS: "t6",
        HAS_TRACK_MARKER: "w6",
        IN_TRANSIT: "u6",
        IS_DISCRETE: "v6"
    }
      , U = {
        ARIA_DISABLED: "aria-disabled",
        ARIA_VALUEMAX: "aria-valuemax",
        ARIA_VALUEMIN: "aria-valuemin",
        ARIA_VALUENOW: "aria-valuenow",
        CHANGE_EVENT: "MDCSlider:change",
        INPUT_EVENT: "MDCSlider:input",
        LAST_TRACK_MARKER_SELECTOR: ".l6:last-child",
        PIN_VALUE_MARKER_SELECTOR: ".r6",
        STEP_DATA_ATTR: "data-step",
        THUMB_CONTAINER_SELECTOR: ".q6",
        TRACK_MARKER_CONTAINER_SELECTOR: ".m6",
        TRACK_SELECTOR: ".j6"
    }
      , Ia = {
        PAGE_FACTOR: 4
    }
      , hb = ["mousedown", "pointerdown", "touchstart"]
      , ib = ["mouseup", "pointerup", "touchend"]
      , Ob = {
        mousedown: "mousemove",
        pointerdown: "pointermove",
        touchstart: "touchmove"
    }
      , Pb = function(v) {
        function f(a) {
            var c = v.call(this, x({}, f.defaultAdapter, a)) || this;
            return c.savedTabIndex_ = NaN,
            c.active_ = !1,
            c.inTransit_ = !1,
            c.isDiscrete_ = !1,
            c.hasTrackMarker_ = !1,
            c.handlingThumbTargetEvt_ = !1,
            c.min_ = 0,
            c.max_ = 100,
            c.step_ = 0,
            c.value_ = 0,
            c.disabled_ = !1,
            c.preventFocusState_ = !1,
            c.thumbContainerPointerHandler_ = function() {
                return c.handlingThumbTargetEvt_ = !0
            }
            ,
            c.interactionStartHandler_ = function(p) {
                return c.handleDown_(p)
            }
            ,
            c.keydownHandler_ = function(p) {
                return c.handleKeydown_(p)
            }
            ,
            c.focusHandler_ = function() {
                return c.handleFocus_()
            }
            ,
            c.blurHandler_ = function() {
                return c.handleBlur_()
            }
            ,
            c.resizeHandler_ = function() {
                return c.layout()
            }
            ,
            c
        }
        return g(f, v),
        Object.defineProperty(f, "cssClasses", {
            get: function() {
                return ha
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "strings", {
            get: function() {
                return U
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "numbers", {
            get: function() {
                return Ia
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f, "defaultAdapter", {
            get: function() {
                return {
                    hasClass: function() {
                        return !1
                    },
                    addClass: function() {},
                    removeClass: function() {},
                    getAttribute: function() {
                        return null
                    },
                    setAttribute: function() {},
                    removeAttribute: function() {},
                    computeBoundingRect: function() {
                        return {
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            width: 0,
                            height: 0
                        }
                    },
                    getTabIndex: function() {
                        return 0
                    },
                    registerInteractionHandler: function() {},
                    deregisterInteractionHandler: function() {},
                    registerThumbContainerInteractionHandler: function() {},
                    deregisterThumbContainerInteractionHandler: function() {},
                    registerBodyInteractionHandler: function() {},
                    deregisterBodyInteractionHandler: function() {},
                    registerResizeHandler: function() {},
                    deregisterResizeHandler: function() {},
                    notifyInput: function() {},
                    notifyChange: function() {},
                    setThumbContainerStyleProperty: function() {},
                    setTrackStyleProperty: function() {},
                    setMarkerValue: function() {},
                    appendTrackMarkers: function() {},
                    removeTrackMarkers: function() {},
                    setLastTrackMarkersStyleProperty: function() {},
                    isRTL: function() {
                        return !1
                    }
                }
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.init = function() {
            var a = this;
            this.isDiscrete_ = this.adapter_.hasClass(ha.IS_DISCRETE);
            this.hasTrackMarker_ = this.adapter_.hasClass(ha.HAS_TRACK_MARKER);
            hb.forEach(function(c) {
                a.adapter_.registerInteractionHandler(c, a.interactionStartHandler_);
                a.adapter_.registerThumbContainerInteractionHandler(c, a.thumbContainerPointerHandler_)
            });
            this.adapter_.registerInteractionHandler("keydown", this.keydownHandler_);
            this.adapter_.registerInteractionHandler("focus", this.focusHandler_);
            this.adapter_.registerInteractionHandler("blur", this.blurHandler_);
            this.adapter_.registerResizeHandler(this.resizeHandler_);
            this.layout();
            this.isDiscrete_ && 0 === this.getStep() && (this.step_ = 1)
        }
        ,
        f.prototype.destroy = function() {
            var a = this;
            hb.forEach(function(c) {
                a.adapter_.deregisterInteractionHandler(c, a.interactionStartHandler_);
                a.adapter_.deregisterThumbContainerInteractionHandler(c, a.thumbContainerPointerHandler_)
            });
            this.adapter_.deregisterInteractionHandler("keydown", this.keydownHandler_);
            this.adapter_.deregisterInteractionHandler("focus", this.focusHandler_);
            this.adapter_.deregisterInteractionHandler("blur", this.blurHandler_);
            this.adapter_.deregisterResizeHandler(this.resizeHandler_)
        }
        ,
        f.prototype.setupTrackMarker = function() {
            if (this.isDiscrete_ && this.hasTrackMarker_ && 0 !== this.getStep()) {
                var a = this.getMin()
                  , c = this.getMax()
                  , p = this.getStep();
                a = (c - a) / p;
                var z = Math.ceil(a) !== a;
                (z && (a = Math.ceil(a)),
                this.adapter_.removeTrackMarkers(),
                this.adapter_.appendTrackMarkers(a),
                z) && this.adapter_.setLastTrackMarkersStyleProperty("flex-grow", String((c - a * p) / p + 1))
            }
        }
        ,
        f.prototype.layout = function() {
            this.rect_ = this.adapter_.computeBoundingRect();
            this.updateUIForCurrentValue_()
        }
        ,
        f.prototype.getValue = function() {
            return this.value_
        }
        ,
        f.prototype.setValue = function(a) {
            this.setValue_(a, !1)
        }
        ,
        f.prototype.getMax = function() {
            return this.max_
        }
        ,
        f.prototype.setMax = function(a) {
            if (a < this.min_)
                throw Error("Cannot set max to be less than the slider's minimum value");
            this.max_ = a;
            this.setValue_(this.value_, !1, !0);
            this.adapter_.setAttribute(U.ARIA_VALUEMAX, String(this.max_));
            this.setupTrackMarker()
        }
        ,
        f.prototype.getMin = function() {
            return this.min_
        }
        ,
        f.prototype.setMin = function(a) {
            if (a > this.max_)
                throw Error("Cannot set min to be greater than the slider's maximum value");
            this.min_ = a;
            this.setValue_(this.value_, !1, !0);
            this.adapter_.setAttribute(U.ARIA_VALUEMIN, String(this.min_));
            this.setupTrackMarker()
        }
        ,
        f.prototype.getStep = function() {
            return this.step_
        }
        ,
        f.prototype.setStep = function(a) {
            if (0 > a)
                throw Error("Step cannot be set to a negative number");
            this.isDiscrete_ && ("number" != typeof a || 1 > a) && (a = 1);
            this.step_ = a;
            this.setValue_(this.value_, !1, !0);
            this.setupTrackMarker()
        }
        ,
        f.prototype.isDisabled = function() {
            return this.disabled_
        }
        ,
        f.prototype.setDisabled = function(a) {
            this.disabled_ = a;
            this.toggleClass_(ha.DISABLED, this.disabled_);
            this.disabled_ ? (this.savedTabIndex_ = this.adapter_.getTabIndex(),
            this.adapter_.setAttribute(U.ARIA_DISABLED, "true"),
            this.adapter_.removeAttribute("tabindex")) : (this.adapter_.removeAttribute(U.ARIA_DISABLED),
            isNaN(this.savedTabIndex_) || this.adapter_.setAttribute("tabindex", String(this.savedTabIndex_)))
        }
        ,
        f.prototype.handleDown_ = function(a) {
            var c = this;
            if (!this.disabled_) {
                this.preventFocusState_ = !0;
                this.setInTransit_(!this.handlingThumbTargetEvt_);
                this.handlingThumbTargetEvt_ = !1;
                this.setActive_(!0);
                var p = function(H) {
                    c.handleMove_(H)
                }
                  , z = Ob[a.type]
                  , G = function M() {
                    c.handleUp_();
                    c.adapter_.deregisterBodyInteractionHandler(z, p);
                    ib.forEach(function(L) {
                        return c.adapter_.deregisterBodyInteractionHandler(L, M)
                    })
                };
                this.adapter_.registerBodyInteractionHandler(z, p);
                ib.forEach(function(M) {
                    return c.adapter_.registerBodyInteractionHandler(M, G)
                });
                this.setValueFromEvt_(a)
            }
        }
        ,
        f.prototype.handleMove_ = function(a) {
            a.preventDefault();
            this.setValueFromEvt_(a)
        }
        ,
        f.prototype.handleUp_ = function() {
            this.setActive_(!1);
            this.adapter_.notifyChange()
        }
        ,
        f.prototype.getPageX_ = function(a) {
            return a.targetTouches && 0 < a.targetTouches.length ? a.targetTouches[0].pageX : a.pageX
        }
        ,
        f.prototype.setValueFromEvt_ = function(a) {
            a = this.getPageX_(a);
            a = this.computeValueFromPageX_(a);
            this.setValue_(a, !0)
        }
        ,
        f.prototype.computeValueFromPageX_ = function(a) {
            var c = this.max_
              , p = this.min_;
            a = (a - this.rect_.left) / this.rect_.width;
            return this.adapter_.isRTL() && (a = 1 - a),
            p + a * (c - p)
        }
        ,
        f.prototype.handleKeydown_ = function(a) {
            var c = this.getKeyId_(a);
            c = this.getValueForKeyId_(c);
            isNaN(c) || (a.preventDefault(),
            this.adapter_.addClass(ha.FOCUS),
            this.setValue_(c, !0),
            this.adapter_.notifyChange())
        }
        ,
        f.prototype.getKeyId_ = function(a) {
            return "ArrowLeft" === a.key || 37 === a.keyCode ? "ArrowLeft" : "ArrowRight" === a.key || 39 === a.keyCode ? "ArrowRight" : "ArrowUp" === a.key || 38 === a.keyCode ? "ArrowUp" : "ArrowDown" === a.key || 40 === a.keyCode ? "ArrowDown" : "Home" === a.key || 36 === a.keyCode ? "Home" : "End" === a.key || 35 === a.keyCode ? "End" : "PageUp" === a.key || 33 === a.keyCode ? "PageUp" : "PageDown" === a.key || 34 === a.keyCode ? "PageDown" : ""
        }
        ,
        f.prototype.getValueForKeyId_ = function(a) {
            var c = this.max_
              , p = this.min_;
            c = this.step_ || (c - p) / 100;
            switch (this.adapter_.isRTL() && ("ArrowLeft" === a || "ArrowRight" === a) && (c = -c),
            a) {
            case "ArrowLeft":
            case "ArrowDown":
                return this.value_ - c;
            case "ArrowRight":
            case "ArrowUp":
                return this.value_ + c;
            case "Home":
                return this.min_;
            case "End":
                return this.max_;
            case "PageUp":
                return this.value_ + c * Ia.PAGE_FACTOR;
            case "PageDown":
                return this.value_ - c * Ia.PAGE_FACTOR;
            default:
                return NaN
            }
        }
        ,
        f.prototype.handleFocus_ = function() {
            this.preventFocusState_ || this.adapter_.addClass(ha.FOCUS)
        }
        ,
        f.prototype.handleBlur_ = function() {
            this.preventFocusState_ = !1;
            this.adapter_.removeClass(ha.FOCUS)
        }
        ,
        f.prototype.setValue_ = function(a, c, p) {
            if (void 0 === p && (p = !1),
            a !== this.value_ || p) {
                p = this.min_;
                var z = this.max_;
                this.step_ && a !== p && a !== z && (a = this.quantize_(a));
                a < p ? a = p : a > z && (a = z);
                this.value_ = a;
                this.adapter_.setAttribute(U.ARIA_VALUENOW, String(this.value_));
                this.updateUIForCurrentValue_();
                c && (this.adapter_.notifyInput(),
                this.isDiscrete_ && this.adapter_.setMarkerValue(a))
            }
        }
        ,
        f.prototype.quantize_ = function(a) {
            return Math.round(a / this.step_) * this.step_
        }
        ,
        f.prototype.updateUIForCurrentValue_ = function() {
            var a = this
              , c = this.min_
              , p = (this.value_ - c) / (this.max_ - c)
              , z = p * this.rect_.width;
            this.adapter_.isRTL() && (z = this.rect_.width - z);
            var G = function(M, L) {
                if (M.document && "function" == typeof M.document.createElement && L in A) {
                    M = M.document.createElement("div");
                    var Q = A[L];
                    L = Q.standard;
                    Q = Q.prefixed;
                    return L in M.style ? L : Q
                }
                return L
            }(window, "transform")
              , H = u(window, "transitionend");
            this.inTransit_ && this.adapter_.registerThumbContainerInteractionHandler(H, function L() {
                a.setInTransit_(!1);
                a.adapter_.deregisterThumbContainerInteractionHandler(H, L)
            });
            requestAnimationFrame(function() {
                a.adapter_.setThumbContainerStyleProperty(G, "translateX(" + z + "px) translateX(-50%)");
                a.adapter_.setTrackStyleProperty(G, "scaleX(" + p + ")")
            })
        }
        ,
        f.prototype.setActive_ = function(a) {
            this.active_ = a;
            this.toggleClass_(ha.ACTIVE, this.active_)
        }
        ,
        f.prototype.setInTransit_ = function(a) {
            this.inTransit_ = a;
            this.toggleClass_(ha.IN_TRANSIT, this.inTransit_)
        }
        ,
        f.prototype.toggleClass_ = function(a, c) {
            c ? this.adapter_.addClass(a) : this.adapter_.removeClass(a)
        }
        ,
        f
    }(C)
      , Qb = function(v) {
        function f() {
            return null !== v && v.apply(this, arguments) || this
        }
        return g(f, v),
        f.attachTo = function(a) {
            return new f(a)
        }
        ,
        Object.defineProperty(f.prototype, "value", {
            get: function() {
                return this.foundation_.getValue()
            },
            set: function(a) {
                this.foundation_.setValue(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "min", {
            get: function() {
                return this.foundation_.getMin()
            },
            set: function(a) {
                this.foundation_.setMin(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "max", {
            get: function() {
                return this.foundation_.getMax()
            },
            set: function(a) {
                this.foundation_.setMax(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "step", {
            get: function() {
                return this.foundation_.getStep()
            },
            set: function(a) {
                this.foundation_.setStep(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        Object.defineProperty(f.prototype, "disabled", {
            get: function() {
                return this.foundation_.isDisabled()
            },
            set: function(a) {
                this.foundation_.setDisabled(a)
            },
            enumerable: !0,
            configurable: !0
        }),
        f.prototype.initialize = function() {
            this.thumbContainer_ = this.root_.querySelector(U.THUMB_CONTAINER_SELECTOR);
            this.track_ = this.root_.querySelector(U.TRACK_SELECTOR);
            this.pinValueMarker_ = this.root_.querySelector(U.PIN_VALUE_MARKER_SELECTOR);
            this.trackMarkerContainer_ = this.root_.querySelector(U.TRACK_MARKER_CONTAINER_SELECTOR)
        }
        ,
        f.prototype.getDefaultFoundation = function() {
            var a = this;
            return new Pb({
                hasClass: function(c) {
                    return a.root_.classList.contains(c)
                },
                addClass: function(c) {
                    return a.root_.classList.add(c)
                },
                removeClass: function(c) {
                    return a.root_.classList.remove(c)
                },
                getAttribute: function(c) {
                    return a.root_.getAttribute(c)
                },
                setAttribute: function(c, p) {
                    return a.root_.setAttribute(c, p)
                },
                removeAttribute: function(c) {
                    return a.root_.removeAttribute(c)
                },
                computeBoundingRect: function() {
                    return a.root_.getBoundingClientRect()
                },
                getTabIndex: function() {
                    return a.root_.tabIndex
                },
                registerInteractionHandler: function(c, p) {
                    return a.listen(c, p)
                },
                deregisterInteractionHandler: function(c, p) {
                    return a.unlisten(c, p)
                },
                registerThumbContainerInteractionHandler: function(c, p) {
                    a.thumbContainer_.addEventListener(c, p)
                },
                deregisterThumbContainerInteractionHandler: function(c, p) {
                    a.thumbContainer_.removeEventListener(c, p)
                },
                registerBodyInteractionHandler: function(c, p) {
                    return document.body.addEventListener(c, p)
                },
                deregisterBodyInteractionHandler: function(c, p) {
                    return document.body.removeEventListener(c, p)
                },
                registerResizeHandler: function(c) {
                    return window.addEventListener("resize", c)
                },
                deregisterResizeHandler: function(c) {
                    return window.removeEventListener("resize", c)
                },
                notifyInput: function() {
                    return a.emit(U.INPUT_EVENT, a)
                },
                notifyChange: function() {
                    return a.emit(U.CHANGE_EVENT, a)
                },
                setThumbContainerStyleProperty: function(c, p) {
                    a.thumbContainer_.style.setProperty(c, p)
                },
                setTrackStyleProperty: function(c, p) {
                    return a.track_.style.setProperty(c, p)
                },
                setMarkerValue: function(c) {
                    return a.pinValueMarker_.innerText = c.toLocaleString()
                },
                appendTrackMarkers: function(c) {
                    for (var p = document.createDocumentFragment(), z = 0; z < c; z++) {
                        var G = document.createElement("div");
                        G.classList.add("l6");
                        p.appendChild(G)
                    }
                    a.trackMarkerContainer_.appendChild(p)
                },
                removeTrackMarkers: function() {
                    for (; a.trackMarkerContainer_.firstChild; )
                        a.trackMarkerContainer_.removeChild(a.trackMarkerContainer_.firstChild)
                },
                setLastTrackMarkersStyleProperty: function(c, p) {
                    a.root_.querySelector(U.LAST_TRACK_MARKER_SELECTOR).style.setProperty(c, p)
                },
                isRTL: function() {
                    return "rtl" === getComputedStyle(a.root_).direction
                }
            })
        }
        ,
        f.prototype.initialSyncWithDOM = function() {
            var a = this.parseFloat_(this.root_.getAttribute(U.ARIA_VALUENOW), this.value)
              , c = this.parseFloat_(this.root_.getAttribute(U.ARIA_VALUEMIN), this.min)
              , p = this.parseFloat_(this.root_.getAttribute(U.ARIA_VALUEMAX), this.max);
            c >= this.max ? (this.max = p,
            this.min = c) : (this.min = c,
            this.max = p);
            this.step = this.parseFloat_(this.root_.getAttribute(U.STEP_DATA_ATTR), this.step);
            this.value = a;
            this.disabled = this.root_.hasAttribute(U.ARIA_DISABLED) && "false" !== this.root_.getAttribute(U.ARIA_DISABLED);
            this.foundation_.setupTrackMarker()
        }
        ,
        f.prototype.layout = function() {
            this.foundation_.layout()
        }
        ,
        f.prototype.stepUp = function(a) {
            void 0 === a && (a = this.step || 1);
            this.value += a
        }
        ,
        f.prototype.stepDown = function(a) {
            void 0 === a && (a = this.step || 1);
            this.value -= a
        }
        ,
        f.prototype.parseFloat_ = function(a, c) {
            a = parseFloat(a);
            return "number" == typeof a && isFinite(a) ? a : c
        }
        ,
        f
    }(E);
    window.PLANETCALC = {
        dialogIndex: 2E3,
        init: function(v) {
            function f(a) {
                var c = a + "_menu"
                  , p = document.getElementById("btn_" + c);
                p && p.addEventListener("click", function() {
                    if (!(z = window.app_menus[c])) {
                        var z, G = document.getElementById(c);
                        G && ((z = PLANETCALC.menu(G)).setIsHoisted(!0),
                        z.setAnchorElement(p),
                        window.app_menus[c] = z)
                    }
                    return z.open = !z.open,
                    !1
                })
            }
            window.MathJax && window.MathJax.Hub.Config({
                "HTML-CSS": {
                    linebreaks: {
                        automatic: !0,
                        width: "container"
                    }
                }
            });
            v = v || document;
            y(v, "fe", r);
            y(v, "j4", Nb);
            y(v, "c2", ba);
            y(v, "u2", rb);
            y(v, "j2", jb);
            y(v, "x6", lb);
            y(v, "_", Za);
            window.app_menus = {};
            f("change_language");
            f("profile");
            f("main")
        },
        slider: function(v) {
            return new Qb(v)
        },
        menu: function(v) {
            v = new Ra(v);
            return v.showNear = w,
            v
        },
        select: function(v) {
            return new Za(v)
        },
        dialog: function(v) {
            v = new ob(v);
            return v.foundation_.adapter_.isDialog = function(f) {
                return !0
            }
            ,
            v
        },
        element: function(v, f, a) {
            v = document.createElement(v);
            return v.className = f,
            a && a.appendChild(v),
            v
        },
        snackbar: function(v) {
            var f = {
                dismiss: function() {
                    v.classList.remove("le");
                    v.__timerid = 0
                },
                open: function() {
                    v.classList.remove("le");
                    v.classList.add("le")
                }
            };
            f.open();
            var a = v.querySelectorAll(".te");
            a.length ? a.forEach(function(c) {
                c.addEventListener("click", function() {
                    f.dismiss()
                })
            }) : (v.__timerid && clearTimeout(v.__timerid),
            a = setTimeout(function() {
                f.dismiss()
            }, 0),
            v.__timerid = a);
            return f
        }
    }
}
]);
function PCUserDataHandler(b) {
    function d(t) {
        for (var q = window.CurrentPageCalculators, r = 0; r < q.length; ++r)
            if (q[r].CalculatorID == t)
                return $(q[r].Dialog.GetElement()).find(".y9").first().text();
        return ""
    }
    function e(t) {
        var q = 0, r;
        for (r in t)
            if ("string" === typeof t[r] && "[{" == t[r].substr(0, 2))
                try {
                    var w = JSON.parse(t[r]);
                    q += w.reduce(function(y, B) {
                        return y + (B.file ? B.file.size : 0)
                    }, 0)
                } catch (y) {}
        return q
    }
    function g(t) {
        m || "function" != typeof PCUserDataHandlerImpl || (m = new PCUserDataHandlerImpl(b));
        m && t(m)
    }
    var h = b.calcid
      , l = this
      , k = PageCalculators.getById(h)
      , u = null;
    $("#" + b.id).find(".pc-btn-new,.pc-btn-embed,.pc-btn-share").on("click", function(t) {
        t = $(t.currentTarget);
        u = t.hasClass("pc-btn-share") ? "share" : t.hasClass("pc-btn-embed") ? "embed" : null;
        k.save();
        return !1
    });
    $("#" + b.id).find(".pc-btn-embed-wol").on("click", function(t) {
        if (t = window.embeddialog) {
            var q = dialoghandlerembed_calculator.data;
            q.calculator != b.calcid && (q.calculator = b.calcid,
            q.label = d(b.calcid),
            dialoghandlerembed_calculator.prepare(q));
            t.open()
        } else
            BSMakePOSTRequest("/frame/embed/", {
                OnResponseText: function(r) {
                    r = $(document.body).append(r).find("#dialogembed_calculator");
                    PLANETCALC.init(r[0]);
                    r = PLANETCALC.dialog(r[0]);
                    r.listen("MDCDialog:cancel", function() {
                        dialoghandlerembed_calculator.oncommand("cancel")
                    });
                    window.embeddialog = r;
                    r.open()
                }
            }, {
                id: b.calcid
            })
    });
    $("#" + b.tableid).find(".pc-btn-save").on("click", function() {
        k.save(b.getTableHandler().getSelected()[0].id);
        return !1
    });
    k.addEventListener("save", function(t) {
        var q = [];
        q.push({
            id: t.detail.data,
            calculator: h,
            data: t.detail.values
        });
        t = q[0].data;
        var r = e(t);
        32768 < r ? alert(formatMessage(PCL.err_save_long_file, PSS.getHRSize(r), PSS.getHRSize(32768))) : (t = PSS.utfSize(JSON.stringify(t)),
        65535 < t ? alert(formatMessage(PCL.err_data_too_long, PSS.getHRSize(t), PSS.getHRSize(65535))) : (q = JSON.stringify(q),
        BSMakePOSTRequest("/service/userdata/save/", {
            OnResponse: function(w) {
                k.setProfile(w[h], !0);
                switch (u) {
                case "embed":
                    l.embed(w[h].id);
                    break;
                case "share":
                    l.share(w[h].id)
                }
                u = null
            },
            OnError: function(w) {
                if (5 == w.code) {
                    var y = document.location
                      , B = w.domain + "/"
                      , x = window.location.pathname.match(/\/(\d+)\//);
                    y.href = B + (x ? x[1] : 0) + "/?loginrequirednow=1&_ud=" + w.data + "&_act=" + u
                }
                u = null
            }
        }, {
            data: q
        })))
    });
    var m = null;
    l.share = function(t) {
        g(function(q) {
            q.share(t)
        })
    }
    ;
    l.embed = function(t) {
        g(function(q) {
            q.embed(t)
        })
    }
    ;
    l.loadData = function(t) {
        g(function(q) {
            q.loadData(t)
        })
    }
    ;
    l.delete = function(t, q, r) {
        g(function(w) {
            w.delete(t, q, r)
        })
    }
    ;
    l.update = function(t, q, r) {
        g(function(w) {
            w.update(t, q, r)
        })
    }
    ;
    l.getRecords = function(t, q, r, w, y, B) {
        g(function(x) {
            x.getRecords(t, q, r, w, y, B)
        })
    }
}
function CalculatorHandler(b, d) {
    function e(x, A) {
        x = x.Header.Columns;
        for (var D in A)
            x[D].visible = A[D]
    }
    function g(x, A) {
        var D = x.Header;
        A.forEach(function(C) {
            D.CloneColumn(C[0], C[1], C[2], C[3])
        })
    }
    function h(x) {
        m.Dialog.calculate && $(m.Dialog.GetElement()).prop("disabled", !x)
    }
    function l(x) {
        $("#" + m.Dialog.GetElement().id + "_calculate").find("span").text(x)
    }
    function k(x) {
        var A = b.getInputs(), D;
        for (D in A)
            x(A[D])
    }
    function u(x, A) {
        m.HideCommonError();
        0 != t && (1 == t ? (x && m.setTimerIcon(!0),
        1 != b.infinite && m.enableOutputs(!1)) : 2 == t && (t = 3,
        b.stop()),
        x && (A ? (q && clearTimeout(q),
        q = setTimeout(function() {
            q = 0;
            b.start()
        }, 0)) : b.start()))
    }
    var m = this;
    m.CalculatorID = b.id;
    var t = 0
      , q = 0
      , r = !0
      , w = (b.asyncLoad || 0) + 1
      , y = PSS.adapter(b.adapter)
      , B = {
        opts: function(x, A) {
            m.Dialog[A].GetElementAccessor().showOptions(x)
        },
        newopts: function(x, A) {
            m.Dialog[A].GetElementAccessor().replaceOptions(x)
        },
        show: function(x, A) {
            A = m.Dialog[A];
            x ? A.Show() : A.Hide()
        },
        table: function(x, A) {
            A = b.tables[A];
            x ? A.ShowTable() : A.HideTable()
        },
        graph: function(x, A) {
            A = b.diagrams[A];
            x ? A.Show() : A.Hide()
        },
        showboth: function(x, A) {
            if (b.tables && b.tables[A]) {
                var D = b.tables[A];
                x ? D.Show() : D.Hide()
            }
            b.diagrams && b.diagrams[A] && (A = b.diagrams[A],
            x ? A.Show() : A.Hide())
        },
        columns: function(x, A) {
            e(b.tables[A], x)
        },
        series: function(x, A) {
            e(b.diagrams[A], x)
        },
        clones: function(x, A) {
            g(b.tables[A], x)
        },
        sclones: function(x, A) {
            g(b.diagrams[A], x)
        }
    };
    m.initdialog = function(x) {
        m.Dialog = x;
        if (b.global) {
            var A = window.CurrentPageCalculators;
            A ? A.push(m) : window.CurrentPageCalculators = [m]
        }
        h(!1);
        m.setTimerIcon(!0);
        b.init(m, x)
    }
    ;
    m.onReady = function() {
        0 == --w && (t = 1,
        h(!0),
        b.startOnLoad ? m.Dialog.Validate() && b.start() : m.setTimerIcon(!1))
    }
    ;
    m.onStart = function(x) {
        m.setTimerIcon(!0);
        x ? (t = 2,
        l(d.stop)) : m.enableOutputs(!1)
    }
    ;
    m.onStop = function(x) {
        q || m.setTimerIcon(!1);
        1 != t && l(d.calculate);
        t = 1;
        if (x)
            m.onError(x);
        else {
            if (m.mustfire)
                for (m.mustfire = !1,
                x = 0; x < m.sinks.change.length; ++x)
                    m.sinks.change[x]();
            for (x = 0; x < m.sinks.done.length; ++x)
                try {
                    m.sinks.done[x]()
                } catch (A) {}
            q || m.enableOutputs(!0)
        }
    }
    ;
    m.onError = function(x) {
        if (-1 != window.location.href.indexOf("debug"))
            throw x;
        x.source && m.Dialog[x.source] ? m.Dialog[x.source].ShowError(x.message) : m.ShowCommonError(x.message);
        m.enableOutputs(!1)
    }
    ;
    m.ShowCommonError = function(x) {
        var A = document.getElementById("hlp_default_" + m.Dialog.GetElement().id);
        A ? (A.innerHTML = x,
        x = $(A),
        x.parent().removeClass("x"),
        x.parent().prev().addClass("k8")) : alert(x)
    }
    ;
    m.HideCommonError = function() {
        var x = document.getElementById("hlp_default_" + m.Dialog.GetElement().id);
        x && (x.innerHTML = "",
        x = $(x),
        x.parent().addClass("x"),
        x.parent().prev().removeClass("k8"))
    }
    ;
    m.GetInputValues = function() {
        var x = {};
        k(function(A) {
            x[A.id] = m.Dialog[A.id].GetValue()
        });
        return x
    }
    ;
    m.setTimerIcon = function(x) {
        var A = m.Dialog._progress_
          , D = "block";
        A ? A = A.GetElement() : (A = document.getElementById(m.Dialog.GetElement().id + "_timerplace"),
        D = "inline-block");
        A && (A.style.display = x ? D : "none")
    }
    ;
    m.enableOutputs = function(x) {
        if (r != x) {
            r = x;
            var A = b.getOutputs()
              , D = {
                opacity: 1
            };
            A.forEach(function(C) {
                C.visibleOnProgress || (C = $(C.GetElementToShow()),
                b.timeout ? C.css({}).animate(D, 250) : C.css(D))
            })
        }
    }
    ;
    m.onkeypressed = function(x, A) {
        b.timeout || setTimeout(function() {
            m.Dialog.Validate() && u(b.auto, 0)
        }, 0);
        return !0
    }
    ;
    m.profile = 0;
    m.sinks = {
        change: [],
        done: [],
        profile: [],
        save: []
    };
    m.mustfire = !1;
    m.addEventListener = function(x, A) {
        (x = m.sinks[x]) && x.push(A)
    }
    ;
    m.removeEventListener = function(x, A) {
        if (x = m.sinks[x])
            for (var D = 0; D < x.length; ++D)
                if (x[D] == A) {
                    x.splice(D, 1);
                    break
                }
    }
    ;
    m.setProfile = function(x, A) {
        (m.profile = x) ? (m.setInputData(m.profile.data),
        $(m.Dialog.GetElement()).find(".ba").html(PCF.formatProfile(x))) : m.Dialog.Clear();
        m.update();
        for (var D = 0; D < m.sinks.profile.length; ++D)
            m.sinks.profile[D]({
                detail: {
                    profile: x,
                    created: A
                }
            })
    }
    ;
    m.getProfile = function() {
        return m.profile
    }
    ;
    m.update = function() {
        m.mustfire = !1;
        m.Dialog.Validate() && 0 != t && b.start()
    }
    ;
    m.getInputData = function(x) {
        x = m.GetInputValues();
        return y.encode(x)
    }
    ;
    m.setInputData = function(x) {
        m.Dialog.SetValues(y.decode(x))
    }
    ;
    m.loadFromUrl = function() {
        m.setInputData(PSS.getInputValues(m.CalculatorID));
        m.update()
    }
    ;
    m.save = function(x) {
        for (var A = m.getInputData(), D = 0; D < m.sinks.save.length; ++D)
            m.sinks.save[D]({
                detail: {
                    values: A,
                    data: x
                }
            })
    }
    ;
    m.oninit = function(x) {
        m.onReady()
    }
    ;
    m.onchanged = function(x) {
        m.Dialog[x].ValidateCurrent() && m.Dialog.Validate() ? 0 != t && (m.mustfire = !0,
        u(b.auto, b.timeout)) : (m.mustfire = !1,
        m.enableControls(!1))
    }
    ;
    m.recalculate = function(x) {
        m.Dialog.Validate() && u(!0, b.timeout)
    }
    ;
    m.refresh = function() {
        m.Dialog.Validate() && b.start()
    }
    ;
    m.oncommand = function(x) {
        q && (clearTimeout(q),
        q = 0);
        2 == t ? (t = 3,
        b.stop()) : m.Dialog.Validate() && b.start()
    }
    ;
    m.onSuccess = function(x) {
        b.setResult(x, !0)
    }
    ;
    m.onProgress = function(x, A) {
        b.setResult(A, !1)
    }
    ;
    m.onDisplay = function(x, A) {
        b.resetDisplay();
        for (var D in x)
            for (var C in x[D])
                B[C](x[D][C], D);
        m.Dialog.layout();
        A && A(b.getInputValues())
    }
}
function CalcProgressData() {
    var b = this;
    b.shouldContinue = !1;
    b.shouldStop = !1;
    b.readyListener = null;
    b.ready = !1;
    b.progress = !1;
    b.controls = [];
    b.clear = function() {
        b.controls.forEach(function(d) {
            d.context = null
        });
        b.progress = !1;
        b.shouldContinue = !1;
        b.shouldStop = !1
    }
}
function CalcProgressControl(b) {
    var d = this
      , e = b ? b : new CalcProgressData
      , g = d.context = null
      , h = null;
    d.isInProgress = function() {
        return e.progress
    }
    ;
    e.controls.push(d);
    d.stop = function() {
        e.shouldStop = !0
    }
    ;
    d.repeat = function(l, k) {
        e.shouldStop || (void 0 !== l && (d.context = l),
        h = null,
        g = "number" == typeof k ? [new Promise(function(u) {
            setTimeout(u, 0, k)
        }
        )] : "object" == typeof k ? k.length ? k : [k] : null,
        e.shouldContinue = !0,
        e.progress = !0)
    }
    ;
    d.completed = function() {
        return !e.shouldContinue
    }
    ;
    d.stopped = function() {
        return e.shouldStop
    }
    ;
    d.shouldRepeat = function() {
        var l = e.shouldContinue && !e.shouldStop;
        e.shouldContinue = !1;
        e.shouldStop = !1;
        return l
    }
    ;
    d.onDataReady = function() {
        e.ready = !0;
        e.readyListener && e.readyListener()
    }
    ;
    d.addEventListener = function(l, k) {
        "ready" == l && (e.readyListener = k);
        e.ready && k()
    }
    ;
    d.clear = function() {
        e.clear()
    }
    ;
    d.getData = function() {
        return e
    }
    ;
    d.getSettled = function() {
        return h
    }
    ;
    d.afterPromises = function(l) {
        g ? Promise.allSettled(g).then(function(k) {
            h = k;
            l(!1)
        }) : l(!0)
    }
}
function DisplayAggregator() {
    function b(h, l, k) {
        g[h] || (g[h] = {});
        l && !g[h][l] && (g[h][l] = k)
    }
    function d(h) {
        var l = {}, k;
        for (k in h)
            l[k] = h[k];
        return l
    }
    var e = this
      , g = {};
    e.getData = function() {
        return g
    }
    ;
    e.simple = function(h, l) {
        return {
            GetValue: function() {
                return h
            },
            Display: function(k) {
                b(l);
                g[l].show = !!k
            }
        }
    }
    ;
    e.options = function(h, l) {
        h = e.simple(h, l);
        h.ReplaceOptions = function(k) {
            b(l);
            g[l].newopts = d(k)
        }
        ;
        h.DisplayOptions = function(k) {
            b(l);
            g[l].opts = d(k)
        }
        ;
        return h
    }
    ;
    e.table = function(h, l) {
        return {
            GetValue: function() {
                return h
            },
            Display: function(k) {
                b(l);
                g[l].showboth = !!k
            },
            DisplayColumn: function(k, u) {
                b(l, "clones", []);
                b(l, "columns", {});
                g[l].columns[k] = !!u
            },
            CloneColumn: function() {
                b(l, "clones", []);
                g[l].clones.push(Array.prototype.slice.call(arguments))
            },
            DisplaySeries: function(k, u) {
                b(l, "sclones", []);
                b(l, "series", {});
                g[l].series[k] = !!u
            },
            CloneSeries: function() {
                b(l, "sclones", []);
                g[l].sclones.push(Array.prototype.slice.call(arguments))
            },
            DisplayTable: function(k) {
                b(l);
                g[l].table = !!k
            },
            DisplayGraph: function(k) {
                b(l);
                g[l].graph = !!k
            }
        }
    }
}
function CalcController(b, d) {
    function e(w) {
        b.onError(w)
    }
    function g(w) {
        return Planetcalc[w + d]
    }
    function h(w) {
        return 1 == w.length ? w[0] : w.reduce(function(y, B) {
            for (var x in B)
                y[x] = B[x];
            return y
        }, {})
    }
    function l(w, y) {
        for (var B in w) {
            var x = w[B];
            if ("object" === typeof x && y(x))
                return !0
        }
    }
    function k(w, y, B) {
        try {
            var x = g("Display");
            if (x) {
                var A = new DisplayAggregator;
                x.call(Planetcalc, w, A);
                var D = A.getData();
                w = !1;
                y ? l(D, function(C) {
                    C.opts && delete C.opts;
                    C.newopts && delete C.newopts
                }) : B && (w = l(D, function(C) {
                    return C.opts || C.newopts
                }));
                b.onDisplay(D, w ? B : null);
                return w
            }
        } catch (C) {
            e(C)
        }
        return !1
    }
    function u(w, y, B) {
        var x = g("Data");
        x ? x.call(Planetcalc, w, y, B) : y({})
    }
    function m(w, y, B, x) {
        try {
            var A = g("Calculate").call(Planetcalc, w, x);
            A && A.then && "function" === typeof A.then ? A.then(y).catch(B) : y(A)
        } catch (D) {
            B(D)
        }
    }
    function t(w) {
        m(w, function(y) {
            k(h([w, y]), !0);
            b.onSuccess(y)
        }, e, function(y, B) {
            k(h([w, B]), !0);
            b.onProgress(y, B)
        })
    }
    function q(w) {
        for (var y in w)
            return !0;
        return !1
    }
    function r(w) {
        u(w, function(y) {
            if (q(y)) {
                var B = h([w, y]);
                k(B, !1, function(x) {
                    t(h([x, y]))
                }) || t(B)
            } else
                t(w)
        }, e)
    }
    this.getByName = g;
    this.onCalculate = function(w) {
        k(w, !1, function(y) {
            r(y)
        }) || r(w)
    }
}
var PCMarshal = {
    proxy: {
        bignumber: function(b) {
            return b.toString()
        },
        math: function(b) {
            var d = typeof b;
            return {
                t: d,
                v: "object" == d ? PCM.getMath(b) : b
            }
        }
    },
    stub: {
        bignumber: function(b) {
            return PCR.parse(b)
        },
        math: function(b) {
            if ("object" == b.t) {
                var d = new PCM.grammar;
                b = new PCI.parserLine(b.v);
                d = PCI.match(b, d, d._getRootRule());
                return PCM.translate(d)
            }
            return b.v
        }
    },
    process: {
        record: function(b, d) {
            var e = {}, g;
            for (g in b)
                e[g] = d[g] ? d[g](b[g]) : b[g];
            return e
        },
        recordset: function(b, d) {
            for (var e = [], g = 0; g < b.length; ++g)
                e[g] = PCMarshal.process.record(b[g], d);
            return e
        },
        array: function(b, d) {
            for (var e = [], g = 0; g < b.length; ++g)
                e[g] = d(b[g]);
            return e
        },
        value: function(b, d) {
            return d[n] ? d[n](b) : b
        }
    }
}
  , PCcsv = "object" == typeof PCcsv ? PCcsv : function() {
    function b(d) {
        if (window.Papa)
            d();
        else {
            var e = document.createElement("script");
            e.src = "/plugins/papaparse/papaparse.min.js";
            e.onload = d;
            document.body.appendChild(e)
        }
    }
    return {
        load: function(d, e) {
            b(function() {
                Papa.parse(d, {
                    complete: e,
                    skipEmptyLines: !0,
                    delimitersToGuess: ["\t", "|", ";", ",", Papa.RECORD_SEP, Papa.UNIT_SEP]
                })
            })
        },
        save: function(d, e, g) {
            var h = g ? {
                columns: g
            } : void 0;
            b(function() {
                e(Papa.unparse(d, h))
            })
        },
        save_to_file: function(d, e, g) {
            this.save(d, function(h) {
                var l = document.createElement("a");
                l.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(h));
                l.setAttribute("download", e);
                l.style.display = "none";
                document.body.appendChild(l);
                l.click();
                document.body.removeChild(l)
            }, g)
        }
    }
}();
