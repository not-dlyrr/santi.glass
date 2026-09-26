/* @ds-bundle: {"format":4,"namespace":"SantiGlass","components":[{"name":"GlassToggle"},{"name":"Button"},{"name":"GlassCard"},{"name":"Switch"},{"name":"SegmentedControl"},{"name":"Slider"},{"name":"SearchField"},{"name":"List"},{"name":"ListRow"},{"name":"TabBar"},{"name":"Icon"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useLayoutEffect = React.useLayoutEffect;
  var useRef = React.useRef;

  function cx() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ');
  }

  function omit(obj, keys) {
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) === -1) out[k] = obj[k];
    }
    return out;
  }

  // controlled when value is passed, uncontrolled otherwise
  function useControl(value, fallback, onChange) {
    var s = useState(fallback);
    var controlled = value !== undefined;
    return [
      controlled ? value : s[0],
      function (next) {
        if (!controlled) s[1](next);
        if (onChange) onChange(next);
      }
    ];
  }

  /* ------------------------------------------------------------------
     liquid glass setting: one system-wide switch, on by default.
     stored on <html data-glass="on|off">, persisted when storage exists.
     ------------------------------------------------------------------ */
  var STORAGE_KEY = 'santi.glass.liquid';
  var listeners = [];

  function readStored() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      if (v === '0') return false;
      if (v === '1') return true;
    } catch (e) {}
    return null;
  }

  function prefersReducedTransparency() {
    try {
      return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  var stored = readStored();
  var glassOn = stored === null ? !prefersReducedTransparency() : stored;

  function writeAttr() {
    document.documentElement.setAttribute('data-glass', glassOn ? 'on' : 'off');
  }
  writeAttr();

  function getLiquidGlass() {
    return glassOn;
  }

  function setLiquidGlass(on, opts) {
    on = !!on;
    if (!(opts && opts.persist === false)) {
      try { window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (e) {}
    }
    if (on === glassOn) return;
    glassOn = on;
    writeAttr();
    listeners.slice().forEach(function (fn) { fn(on); });
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  function useLiquidGlass() {
    var s = useState(glassOn);
    useEffect(function () {
      s[1](glassOn);
      return subscribe(function (v) { s[1](v); });
    }, []);
    return [s[0], setLiquidGlass];
  }

  /* ------------------------------------------------------------------
     lens engine: physically based refraction through a convex glass rim.
     per element it builds a displacement map (snell's law over a squircle
     bezel profile), a specular rim map, and an svg filter that splits rgb
     for dispersion. applied with backdrop-filter: url(#id) where the engine
     supports it (chromium: chrome, edge, electron, webview2). elsewhere the
     css blur fallback in bundle.css is used.
     ------------------------------------------------------------------ */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var uid = 0;
  var mapCache = {};

  var LENS_SUPPORTED = (function () {
    try {
      if (!window.CSS || !CSS.supports('backdrop-filter', 'url(#a)')) return false;
      var brands = navigator.userAgentData && navigator.userAgentData.brands;
      if (brands && brands.some(function (b) { return /Chromium|Chrome|Edge/.test(b.brand); })) return true;
      var ua = navigator.userAgent;
      return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua);
    } catch (e) {
      return false;
    }
  })();
  document.documentElement.setAttribute('data-lens', LENS_SUPPORTED ? 'refract' : 'blur');

  function num(style, name, fallback) {
    var v = parseFloat(style.getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }

  function readParams(el, strong) {
    var s = getComputedStyle(el);
    return {
      bezel: num(s, '--lens-bezel', 22),
      depth: num(s, '--lens-depth', 20),
      ior: num(s, '--lens-ior', 1.5),
      aberration: num(s, '--lens-aberration', 0.1),
      frost: strong ? num(s, '--lens-frost-strong', 8) : num(s, '--lens-frost', 1.5),
      specular: num(s, '--lens-specular', 0.6),
      saturation: num(s, '--lens-saturation', 1.5)
    };
  }

  // squircle bezel: height y(t) = (1 - (1 - t)^4)^(1/4), t = 0 at the rim, 1 where the flat top begins
  function slopeAt(t) {
    t = Math.min(Math.max(t, 0.002), 1);
    var a = 1 - t;
    var inner = 1 - a * a * a * a;
    return (a * a * a) * Math.pow(inner, -0.75);
  }

  function bend(t, ior) {
    var h = Math.pow(1 - Math.pow(1 - t, 4), 0.25); // local glass height, 0 at the rim, 1 on the flat top
    var th1 = Math.atan(slopeAt(t));
    var th2 = Math.asin(Math.min(1, Math.sin(th1) / ior));
    return Math.tan(th1 - th2) * (0.35 + h);
  }

  function buildMaps(W, H, R, p) {
    var key = [W, H, R, p.bezel, p.depth, p.ior, p.specular].join('|');
    if (mapCache[key]) return mapCache[key];

    var bezel = Math.max(2, Math.min(p.bezel, Math.min(W, H) / 2 - 1));
    var cxm = W / 2, cym = H / 2;
    var hx = W / 2 - R, hy = H / 2 - R;
    var n = W * H;
    var vx = new Float32Array(n), vy = new Float32Array(n), sp = new Float32Array(n);
    var maxD = 0.0001;
    var lx = -0.6, ly = -0.8; // light from the top left
    var rimBend = bend(0.002, p.ior);

    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = y * W + x;
        var px = x + 0.5 - cxm, py = y + 0.5 - cym;
        var sx = px < 0 ? -1 : 1, sy = py < 0 ? -1 : 1;
        var qx = Math.abs(px) - hx, qy = Math.abs(py) - hy;
        var nx, ny, dist;
        if (qx > 0 && qy > 0) {
          var len = Math.sqrt(qx * qx + qy * qy);
          dist = len - R;
          nx = sx * qx / len;
          ny = sy * qy / len;
        } else if (qx > qy) {
          dist = qx - R;
          nx = sx; ny = 0;
        } else {
          dist = qy - R;
          nx = 0; ny = sy;
        }
        var d = -dist; // distance inward from the rim
        if (d <= 0 || d >= bezel) continue;
        var t = d / bezel;

        // refraction: normal tilt from the profile slope, snell's law for the bent ray, integrated over
        // the glass thickness. the physical curve is normalized against the rim value and widened so the
        // band reads at ui scale; lens-depth is the peak displacement in px.
        var disp = p.depth * Math.pow(bend(t, p.ior) / rimBend, 0.45);
        // sample inward so the rim shows compressed content from under the glass
        vx[i] = -nx * disp;
        vy[i] = -ny * disp;
        if (disp > maxD) maxD = disp;

        // specular: fresnel-ish rim, strongest where the normal faces the light, a softer bounce opposite
        var facing = nx * lx + ny * ly;
        var rim = Math.pow(1 - t, 3);
        var edge = d < 1.5 ? 0.9 : 0;
        var key1 = Math.pow(Math.max(0, facing), 1.6);
        var key2 = 0.45 * Math.pow(Math.max(0, -facing), 2);
        sp[i] = Math.min(1, (key1 + key2) * rim * 1.4 + edge * (0.35 + 0.65 * Math.max(key1, key2)));
      }
    }

    var scale = maxD * 2;
    var c1 = document.createElement('canvas');
    c1.width = W; c1.height = H;
    var g1 = c1.getContext('2d');
    var im1 = g1.createImageData(W, H);
    var c2 = document.createElement('canvas');
    c2.width = W; c2.height = H;
    var g2 = c2.getContext('2d');
    var im2 = g2.createImageData(W, H);
    for (var j = 0; j < n; j++) {
      var o = j * 4;
      im1.data[o] = Math.round((0.5 + vx[j] / scale) * 255);
      im1.data[o + 1] = Math.round((0.5 + vy[j] / scale) * 255);
      im1.data[o + 2] = 128;
      im1.data[o + 3] = 255;
      im2.data[o] = 255;
      im2.data[o + 1] = 255;
      im2.data[o + 2] = 255;
      im2.data[o + 3] = Math.round(sp[j] * p.specular * 255);
    }
    g1.putImageData(im1, 0, 0);
    g2.putImageData(im2, 0, 0);
    var out = { disp: c1.toDataURL('image/png'), spec: c2.toDataURL('image/png'), scale: scale };
    mapCache[key] = out;
    return out;
  }

  function defsRoot() {
    var svg = document.getElementById('sg-lens-defs');
    if (!svg) {
      svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('id', 'sg-lens-defs');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.position = 'absolute';
      svg.style.width = '0';
      svg.style.height = '0';
      svg.style.overflow = 'hidden';
      svg.style.pointerEvents = 'none';
      document.body.appendChild(svg);
    }
    return svg;
  }

  function channel(r, g, b) {
    return r + ' 0 0 0 0  0 ' + g + ' 0 0 0  0 0 ' + b + ' 0 0  0 0 0 1 0';
  }

  function writeFilter(id, W, H, maps, p) {
    var root = defsRoot();
    var f = document.getElementById(id);
    if (!f) {
      f = document.createElementNS(SVGNS, 'filter');
      f.setAttribute('id', id);
      root.appendChild(f);
    }
    var a = p.aberration;
    var s = maps.scale;
    f.setAttribute('x', '0');
    f.setAttribute('y', '0');
    f.setAttribute('width', String(W));
    f.setAttribute('height', String(H));
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('primitiveUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML =
      '<feGaussianBlur in="SourceGraphic" stdDeviation="' + p.frost + '" edgeMode="duplicate" result="frost"/>' +
      '<feImage href="' + maps.disp + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="none" result="map"/>' +
      '<feDisplacementMap in="frost" in2="map" scale="' + (s * (1 + a)).toFixed(2) + '" xChannelSelector="R" yChannelSelector="G" result="dR"/>' +
      '<feDisplacementMap in="frost" in2="map" scale="' + s.toFixed(2) + '" xChannelSelector="R" yChannelSelector="G" result="dG"/>' +
      '<feDisplacementMap in="frost" in2="map" scale="' + (s * (1 - a)).toFixed(2) + '" xChannelSelector="R" yChannelSelector="G" result="dB"/>' +
      '<feColorMatrix in="dR" type="matrix" values="' + channel(1, 0, 0) + '" result="r"/>' +
      '<feColorMatrix in="dG" type="matrix" values="' + channel(0, 1, 0) + '" result="g"/>' +
      '<feColorMatrix in="dB" type="matrix" values="' + channel(0, 0, 1) + '" result="b"/>' +
      '<feComposite in="r" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg"/>' +
      '<feComposite in="rg" in2="b" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rgb"/>' +
      '<feColorMatrix in="rgb" type="saturate" values="' + p.saturation + '" result="sat"/>' +
      '<feImage href="' + maps.spec + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="none" result="spec"/>' +
      '<feComposite in="spec" in2="sat" operator="over"/>';
  }

  function useLens(ref, opts) {
    var glass = useLiquidGlass()[0];
    var strong = !!(opts && opts.strong);
    var enabled = !(opts && opts.enabled === false);
    useLayoutEffect(function () {
      var el = ref.current;
      if (!el) return;
      if (!glass || !enabled || !LENS_SUPPORTED || prefersReducedTransparency()) return;
      var id = 'sg-lens-' + (++uid);
      var layer = document.createElement('span');
      layer.className = 'sg-lens-layer';
      layer.setAttribute('aria-hidden', 'true');
      el.insertBefore(layer, el.firstChild);
      el.classList.add('sg-lens-on');
      var last = '';
      function apply() {
        var W = Math.round(layer.offsetWidth), H = Math.round(layer.offsetHeight);
        if (W < 4 || H < 4 || W * H > 1600000) return;
        var R = parseFloat(getComputedStyle(layer).borderTopLeftRadius) || 0;
        R = Math.min(R, W / 2, H / 2);
        var p = readParams(el, strong);
        var sig = [W, H, R, p.bezel, p.depth, p.ior, p.aberration, p.frost, p.specular, p.saturation].join('|');
        if (sig === last) return;
        last = sig;
        writeFilter(id, W, H, buildMaps(W, H, R, p), p);
        layer.style.backdropFilter = 'url(#' + id + ')';
        layer.style.webkitBackdropFilter = 'url(#' + id + ')';
      }
      function move(e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }
      function enter() { el.classList.add('is-lit'); }
      function leave() { el.classList.remove('is-lit'); }
      apply();
      var ro = new ResizeObserver(apply);
      ro.observe(el);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      return function () {
        ro.disconnect();
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointerleave', leave);
        if (layer.parentNode) layer.parentNode.removeChild(layer);
        el.classList.remove('sg-lens-on', 'is-lit');
        var f = document.getElementById(id);
        if (f && f.parentNode) f.parentNode.removeChild(f);
      };
    }, [glass, strong, enabled]);
  }

  /* ------------------------------------------------------------------
     icons
     ------------------------------------------------------------------ */
  var PATHS = {
    house: 'M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z',
    search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20',
    sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
    person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5',
    bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4',
    wifi: 'M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a7.5 7.5 0 0 1 11 0M9.5 16a3 3 0 0 1 5 0M12 19.2v.1',
    moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
    music: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
    sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
    lock: 'M6.5 11h11v9h-11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
    plus: 'M12 5v14M5 12h14',
    drop: 'M12 3.5c3.5 4.2 6 7.6 6 10.5a6 6 0 0 1-12 0c0-2.9 2.5-6.3 6-10.5z',
    chevron: 'M9.5 6l6 6-6 6'
  };

  function Icon(p) {
    var size = p.size || 22;
    return h(
      'svg',
      {
        className: cx('sg-icon', p.className),
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: p.weight || 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        role: p.label ? 'img' : undefined,
        'aria-label': p.label,
        'aria-hidden': p.label ? undefined : true
      },
      h('path', { d: PATHS[p.name] || '' })
    );
  }

  /* ------------------------------------------------------------------
     components
     ------------------------------------------------------------------ */
  function Switch(p) {
    var st = useControl(p.checked, !!p.defaultChecked, p.onChange);
    return h(
      'label',
      { className: cx('sg-switch', p.className) },
      p.label ? h('span', { className: 'sg-switch-label' }, p.label) : null,
      h('input', {
        type: 'checkbox',
        role: 'switch',
        checked: st[0],
        disabled: p.disabled,
        'aria-label': p.label ? undefined : p['aria-label'],
        onChange: function (e) { st[1](e.target.checked); }
      }),
      h('span', { className: 'sg-switch-track', 'aria-hidden': true }, h('span', { className: 'sg-switch-knob' }))
    );
  }

  function GlassToggle(p) {
    var g = useLiquidGlass();
    return h(Switch, {
      label: p.label === undefined ? 'Liquid Glass' : p.label,
      'aria-label': p['aria-label'] || 'Liquid Glass',
      checked: g[0],
      className: p.className,
      onChange: function (v) {
        g[1](v);
        if (p.onChange) p.onChange(v);
      }
    });
  }

  function Button(p) {
    var ref = useRef(null);
    var variant = p.variant || 'filled';
    var size = p.size || 'regular';
    useLens(ref, { enabled: variant === 'glass' });
    var rest = omit(p, ['variant', 'size', 'className', 'children', 'icon']);
    return h(
      'button',
      Object.assign({ type: 'button' }, rest, {
        ref: ref,
        className: cx('sg-btn', 'sg-btn-' + variant, 'sg-btn-' + size, variant === 'glass' && 'sg-glass', p.className)
      }),
      p.icon ? h(Icon, { name: p.icon, size: size === 'small' ? 16 : 19, weight: 2 }) : null,
      p.children
    );
  }

  function GlassCard(p) {
    var ref = useRef(null);
    var strong = p.strength === 'strong';
    useLens(ref, { strong: strong });
    var rest = omit(p, ['strength', 'className', 'children', 'as']);
    return h(
      p.as || 'div',
      Object.assign({}, rest, {
        ref: ref,
        className: cx('sg-glass', 'sg-card', strong && 'sg-glass-strong', p.className)
      }),
      p.children
    );
  }

  function SegmentedControl(p) {
    var options = p.options || [];
    var st = useControl(p.value, p.defaultValue !== undefined ? p.defaultValue : options[0], p.onChange);
    var index = Math.max(0, options.indexOf(st[0]));
    return h(
      'div',
      {
        className: cx('sg-seg', p.className),
        role: 'radiogroup',
        'aria-label': p['aria-label'],
        style: { '--n': options.length, '--i': index }
      },
      h('span', { className: 'sg-seg-thumb', 'aria-hidden': true }),
      options.map(function (o) {
        var on = o === st[0];
        return h(
          'button',
          {
            key: o,
            type: 'button',
            role: 'radio',
            'aria-checked': on,
            className: cx('sg-seg-item', on && 'is-on'),
            onClick: function () { st[1](o); }
          },
          o
        );
      })
    );
  }

  function Slider(p) {
    var min = p.min == null ? 0 : p.min;
    var max = p.max == null ? 100 : p.max;
    var st = useControl(p.value, p.defaultValue == null ? (min + max) / 2 : p.defaultValue, p.onChange);
    var pct = ((st[0] - min) / (max - min)) * 100;
    return h(
      'div',
      { className: cx('sg-slider', p.className) },
      p.minIcon ? h(Icon, { name: p.minIcon, size: 18 }) : null,
      h('input', {
        type: 'range',
        min: min,
        max: max,
        step: p.step || 1,
        value: st[0],
        'aria-label': p['aria-label'],
        style: { '--pct': pct + '%' },
        onChange: function (e) { st[1](Number(e.target.value)); }
      }),
      p.maxIcon ? h(Icon, { name: p.maxIcon, size: 22 }) : null
    );
  }

  function SearchField(p) {
    var ref = useRef(null);
    useLens(ref, { strong: true });
    var st = useControl(p.value, p.defaultValue || '', p.onChange);
    var placeholder = p.placeholder || 'Search';
    return h(
      'label',
      { ref: ref, className: cx('sg-search', 'sg-glass', 'sg-glass-strong', p.className) },
      h(Icon, { name: 'search', size: 18, weight: 2 }),
      h('input', {
        type: 'search',
        value: st[0],
        placeholder: placeholder,
        'aria-label': placeholder,
        onChange: function (e) { st[1](e.target.value); }
      })
    );
  }

  function List(p) {
    var ref = useRef(null);
    useLens(ref, { strong: true, enabled: !!p.glass });
    return h(
      'section',
      { className: cx('sg-list-wrap', p.className) },
      p.header ? h('h3', { className: 'sg-list-header' }, p.header) : null,
      h('div', { ref: ref, className: cx('sg-list', p.glass && 'sg-glass sg-glass-strong') }, p.children),
      p.footer ? h('p', { className: 'sg-list-footer' }, p.footer) : null
    );
  }

  function ListRow(p) {
    var accessory = p.accessory === undefined ? 'chevron' : p.accessory;
    var isButton = typeof p.onClick === 'function';
    var icon = null;
    if (p.icon) {
      icon = h(
        'span',
        { className: 'sg-row-icon', style: { background: p.iconColor || 'var(--accent)' } },
        typeof p.icon === 'string' ? h(Icon, { name: p.icon, size: 18, weight: 2 }) : p.icon
      );
    }
    var tail = null;
    if (accessory === 'chevron') tail = h(Icon, { name: 'chevron', size: 16, weight: 2.2, className: 'sg-row-chevron' });
    else if (accessory !== 'none') tail = accessory;
    return h(
      isButton ? 'button' : 'div',
      {
        className: cx('sg-row', p.icon && 'has-icon', isButton && 'is-button', p.className),
        type: isButton ? 'button' : undefined,
        onClick: p.onClick
      },
      icon,
      h(
        'span',
        { className: 'sg-row-text' },
        h('span', { className: 'sg-row-title' }, p.title),
        p.subtitle ? h('span', { className: 'sg-row-subtitle' }, p.subtitle) : null
      ),
      p.detail ? h('span', { className: 'sg-row-detail' }, p.detail) : null,
      tail
    );
  }

  function TabBar(p) {
    var ref = useRef(null);
    useLens(ref, { strong: true });
    var items = p.items || [];
    var st = useControl(p.value, p.defaultValue !== undefined ? p.defaultValue : items[0] && items[0].id, p.onChange);
    return h(
      'nav',
      { ref: ref, className: cx('sg-tabbar', 'sg-glass', 'sg-glass-strong', p.className), 'aria-label': p['aria-label'] || 'Tabs' },
      items.map(function (it) {
        var on = it.id === st[0];
        return h(
          'button',
          {
            key: it.id,
            type: 'button',
            className: cx('sg-tab', on && 'is-on'),
            'aria-current': on ? 'page' : undefined,
            onClick: function () { st[1](it.id); }
          },
          h(Icon, { name: it.icon, size: 24 }),
          h('span', { className: 'sg-tab-label' }, it.label)
        );
      })
    );
  }

  window.SantiGlass = Object.assign(window.SantiGlass || {}, {
    GlassToggle: GlassToggle,
    Button: Button,
    GlassCard: GlassCard,
    Switch: Switch,
    SegmentedControl: SegmentedControl,
    Slider: Slider,
    SearchField: SearchField,
    List: List,
    ListRow: ListRow,
    TabBar: TabBar,
    Icon: Icon,
    useLiquidGlass: useLiquidGlass,
    useLens: useLens,
    getLiquidGlass: getLiquidGlass,
    setLiquidGlass: setLiquidGlass,
    lensSupported: LENS_SUPPORTED
  });
})();
