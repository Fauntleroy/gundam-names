
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var dist = {exports: {}};

    (function (module, exports) {
    (function (global, factory) {
      factory(exports) ;
    }(commonjsGlobal, (function (exports) {
      var gundam = [
      	[
      		"",
      		"",
      		"Gaia"
      	],
      	[
      		"",
      		"",
      		"Mash"
      	],
      	[
      		"",
      		"",
      		"Ortega"
      	],
      	[
      		"",
      		"",
      		"Tianem"
      	],
      	[
      		"",
      		"",
      		"Wakkein"
      	],
      	[
      		"Acous",
      		"",
      		""
      	],
      	[
      		"Akahana",
      		"",
      		""
      	],
      	[
      		"Amuro",
      		"",
      		"Ray"
      	],
      	[
      		"Antonio",
      		"",
      		"Callas"
      	],
      	[
      		"Asakura",
      		"",
      		""
      	],
      	[
      		"Bamlo",
      		"",
      		""
      	],
      	[
      		"Barom",
      		"",
      		""
      	],
      	[
      		"Beebe",
      		"",
      		""
      	],
      	[
      		"Bison",
      		"",
      		""
      	],
      	[
      		"Boraskyniv",
      		"",
      		""
      	],
      	[
      		"Bright",
      		"",
      		"Noa"
      	],
      	[
      		"Butsham",
      		"",
      		""
      	],
      	[
      		"Callahan",
      		"",
      		""
      	],
      	[
      		"Camilla",
      		"",
      		""
      	],
      	[
      		"Carioca",
      		"",
      		""
      	],
      	[
      		"Cecilia",
      		"",
      		"Irene"
      	],
      	[
      		"Challia",
      		"",
      		"Bull"
      	],
      	[
      		"Char",
      		"",
      		"Aznable"
      	],
      	[
      		"Clamp",
      		"",
      		""
      	],
      	[
      		"Connolly",
      		"",
      		""
      	],
      	[
      		"Conscon",
      		"",
      		""
      	],
      	[
      		"Cozun",
      		"",
      		"Graham"
      	],
      	[
      		"Crowley",
      		"",
      		"Hamon"
      	],
      	[
      		"Crown",
      		"",
      		""
      	],
      	[
      		"Cuaran",
      		"",
      		""
      	],
      	[
      		"Cucuruz",
      		"",
      		"Doan"
      	],
      	[
      		"Darota",
      		"",
      		""
      	],
      	[
      		"Degwin",
      		"Sodo",
      		"Zabi"
      	],
      	[
      		"Delamin",
      		"",
      		""
      	],
      	[
      		"Denim",
      		"",
      		""
      	],
      	[
      		"Dimitri",
      		"",
      		""
      	],
      	[
      		"Dozle",
      		"",
      		"Zabi"
      	],
      	[
      		"Dren",
      		"",
      		""
      	],
      	[
      		"Elran",
      		"",
      		""
      	],
      	[
      		"Fix",
      		"",
      		""
      	],
      	[
      		"Fraw",
      		"",
      		"Bow"
      	],
      	[
      		"Gadem",
      		"",
      		""
      	],
      	[
      		"Garma",
      		"",
      		"Zabi"
      	],
      	[
      		"Gene",
      		"",
      		""
      	],
      	[
      		"Ghien",
      		"",
      		""
      	],
      	[
      		"Gihren",
      		"",
      		"Zabi"
      	],
      	[
      		"Giyal",
      		"",
      		""
      	],
      	[
      		"Godard",
      		"",
      		""
      	],
      	[
      		"Gopp",
      		"",
      		""
      	],
      	[
      		"Goro",
      		"",
      		""
      	],
      	[
      		"Guevil",
      		"",
      		""
      	],
      	[
      		"Habe",
      		"",
      		""
      	],
      	[
      		"Hamble",
      		"",
      		""
      	],
      	[
      		"Haro",
      		"",
      		""
      	],
      	[
      		"Hayato",
      		"",
      		"Kobayashi"
      	],
      	[
      		"Howard",
      		"",
      		""
      	],
      	[
      		"Humrau",
      		"",
      		""
      	],
      	[
      		"Ivanov",
      		"",
      		""
      	],
      	[
      		"Jimba",
      		"",
      		"Ral"
      	],
      	[
      		"Jittal",
      		"",
      		""
      	],
      	[
      		"Job",
      		"",
      		"John"
      	],
      	[
      		"Johann",
      		"Abraham",
      		"Revil"
      	],
      	[
      		"Joyce",
      		"",
      		""
      	],
      	[
      		"Judock",
      		"",
      		""
      	],
      	[
      		"Kai",
      		"",
      		"Shiden"
      	],
      	[
      		"Kal",
      		"",
      		""
      	],
      	[
      		"Kamp",
      		"",
      		""
      	],
      	[
      		"Keji",
      		"",
      		""
      	],
      	[
      		"Klink",
      		"",
      		""
      	],
      	[
      		"Kohm",
      		"",
      		""
      	],
      	[
      		"Kolin",
      		"",
      		""
      	],
      	[
      		"Kom",
      		"",
      		""
      	],
      	[
      		"Kycilia",
      		"",
      		"Zabi"
      	],
      	[
      		"Lackoc",
      		"",
      		""
      	],
      	[
      		"Lalah",
      		"",
      		"Sune"
      	],
      	[
      		"Lang",
      		"",
      		""
      	],
      	[
      		"Li",
      		"",
      		"Hwan"
      	],
      	[
      		"M'Quve",
      		"",
      		""
      	],
      	[
      		"Madison",
      		"",
      		""
      	],
      	[
      		"Magu",
      		"",
      		""
      	],
      	[
      		"March",
      		"",
      		""
      	],
      	[
      		"Marker",
      		"",
      		"Clan"
      	],
      	[
      		"Matilda",
      		"",
      		"Ajan"
      	],
      	[
      		"Matthew",
      		"",
      		""
      	],
      	[
      		"Maximilian",
      		"",
      		""
      	],
      	[
      		"Meyer",
      		"",
      		""
      	],
      	[
      		"Mile",
      		"",
      		""
      	],
      	[
      		"Mirai",
      		"",
      		"Yashima"
      	],
      	[
      		"Miru",
      		"",
      		""
      	],
      	[
      		"Mosk",
      		"",
      		"Han"
      	],
      	[
      		"Mulligan",
      		"",
      		""
      	],
      	[
      		"Omar",
      		"",
      		"Fang"
      	],
      	[
      		"Oscar",
      		"",
      		"Dublin"
      	],
      	[
      		"Paolo",
      		"",
      		"Cassius"
      	],
      	[
      		"Ramba",
      		"",
      		"Ral"
      	],
      	[
      		"Reed",
      		"",
      		""
      	],
      	[
      		"Rio",
      		"",
      		"Marini"
      	],
      	[
      		"Ross",
      		"",
      		""
      	],
      	[
      		"Ryu",
      		"",
      		"Jose"
      	],
      	[
      		"Sagred",
      		"",
      		""
      	],
      	[
      		"Sayla",
      		"",
      		"Mass"
      	],
      	[
      		"Seki",
      		"",
      		""
      	],
      	[
      		"Shin",
      		"",
      		""
      	],
      	[
      		"Simus",
      		"",
      		"Al Bakharov"
      	],
      	[
      		"Sleggar",
      		"",
      		"Law"
      	],
      	[
      		"Slender",
      		"",
      		""
      	],
      	[
      		"Smith",
      		"",
      		"Onizawa"
      	],
      	[
      		"Sol",
      		"",
      		""
      	],
      	[
      		"Stetch",
      		"",
      		""
      	],
      	[
      		"Sunmalo",
      		"",
      		""
      	],
      	[
      		"Tachi",
      		"",
      		""
      	],
      	[
      		"Tamura",
      		"",
      		""
      	],
      	[
      		"Tem",
      		"",
      		"Ray"
      	],
      	[
      		"Tokwan",
      		"",
      		""
      	],
      	[
      		"Torgan",
      		"",
      		""
      	],
      	[
      		"Twanning",
      		"",
      		""
      	],
      	[
      		"Uragan",
      		"",
      		""
      	],
      	[
      		"Vammas",
      		"",
      		""
      	],
      	[
      		"Vice",
      		"",
      		""
      	],
      	[
      		"Woody",
      		"",
      		"Malden"
      	],
      	[
      		"Zeygan",
      		"",
      		""
      	]
      ];
      var hathaway = [
      	[
      		"Civet",
      		"",
      		"Anhern"
      	],
      	[
      		"Emerelda",
      		"",
      		"Zubin"
      	],
      	[
      		"Fencer",
      		"",
      		"Mayne"
      	],
      	[
      		"Gass",
      		"",
      		"Huguest"
      	],
      	[
      		"Gawman",
      		"",
      		"Nobile"
      	],
      	[
      		"Gigi",
      		"",
      		"Andalucia"
      	],
      	[
      		"Golf",
      		"",
      		""
      	],
      	[
      		"Hathaway",
      		"",
      		"Noa"
      	],
      	[
      		"Hendrix",
      		"",
      		"Hiyo"
      	],
      	[
      		"Hundley",
      		"",
      		"Yeoksan"
      	],
      	[
      		"Iram",
      		"",
      		"Masam"
      	],
      	[
      		"Julia",
      		"",
      		"Suga"
      	],
      	[
      		"Karl",
      		"",
      		"Eyinstein"
      	],
      	[
      		"Kelia",
      		"",
      		"Dace"
      	],
      	[
      		"Kenji",
      		"",
      		"Mitsuda"
      	],
      	[
      		"Kenneth",
      		"",
      		"Sleg"
      	],
      	[
      		"Lane",
      		"",
      		"Aim"
      	],
      	[
      		"Mace",
      		"",
      		"Flower"
      	],
      	[
      		"Mafty",
      		"Navue",
      		"Erin"
      	],
      	[
      		"Max",
      		"",
      		"Harriet"
      	],
      	[
      		"Maximilian",
      		"",
      		"Nikolai"
      	],
      	[
      		"Mihessia",
      		"",
      		"Hence"
      	],
      	[
      		"Minecche",
      		"",
      		"Kestalgino"
      	],
      	[
      		"Purser",
      		"",
      		""
      	],
      	[
      		"Quack",
      		"",
      		"Salver"
      	],
      	[
      		"Ray",
      		"",
      		"Lagoid"
      	],
      	[
      		"Raymond",
      		"",
      		"Cain"
      	]
      ];
      var narrative = [
      	[
      		"Amaja",
      		"",
      		""
      	],
      	[
      		"Averaev",
      		"",
      		""
      	],
      	[
      		"Banagher",
      		"",
      		"Links"
      	],
      	[
      		"Brick",
      		"",
      		"Teclato"
      	],
      	[
      		"Delao",
      		"",
      		""
      	],
      	[
      		"Erika",
      		"",
      		"Yugo"
      	],
      	[
      		"Escola",
      		"",
      		"Goeda"
      	],
      	[
      		"Flaste",
      		"",
      		"Schole"
      	],
      	[
      		"Franco",
      		"",
      		""
      	],
      	[
      		"Iago",
      		"",
      		"Haakana"
      	],
      	[
      		"Jona",
      		"",
      		"Basta"
      	],
      	[
      		"Marga",
      		"",
      		""
      	],
      	[
      		"Martha",
      		"",
      		"Vist Carbine"
      	],
      	[
      		"Mauri",
      		"",
      		""
      	],
      	[
      		"Michele",
      		"",
      		"Luio"
      	],
      	[
      		"Mineva",
      		"Lao",
      		"Zabi"
      	],
      	[
      		"Monaghan",
      		"",
      		"Bakharov"
      	],
      	[
      		"Pavel",
      		"",
      		""
      	],
      	[
      		"Rita",
      		"",
      		"Bernal"
      	],
      	[
      		"Stephanie",
      		"",
      		"Luio"
      	],
      	[
      		"Suberoa",
      		"",
      		"Zinnerman"
      	],
      	[
      		"Takuya",
      		"",
      		"Irei"
      	],
      	[
      		"Taman",
      		"",
      		""
      	],
      	[
      		"Woomin",
      		"",
      		"Luio"
      	],
      	[
      		"Zoltan",
      		"",
      		"Akkanen"
      	]
      ];
      var thunderbolt = [
      	[
      		"",
      		"",
      		"Burroughs"
      	],
      	[
      		"",
      		"",
      		"Layton"
      	],
      	[
      		"Alicia",
      		"",
      		""
      	],
      	[
      		"Barclay",
      		"",
      		""
      	],
      	[
      		"Bianca",
      		"",
      		"Carlyle"
      	],
      	[
      		"Billy",
      		"",
      		"Hickam"
      	],
      	[
      		"Bull",
      		"",
      		""
      	],
      	[
      		"Chow",
      		"",
      		"Ming"
      	],
      	[
      		"Claudia",
      		"",
      		"Peer"
      	],
      	[
      		"Cornelius",
      		"",
      		"KaKa"
      	],
      	[
      		"Creed",
      		"",
      		""
      	],
      	[
      		"Daryl",
      		"",
      		"Lorenz"
      	],
      	[
      		"Denver",
      		"",
      		"Roach"
      	],
      	[
      		"Fisher",
      		"",
      		"Ness"
      	],
      	[
      		"Graham",
      		"",
      		""
      	],
      	[
      		"Hoover",
      		"",
      		"Aisla"
      	],
      	[
      		"Io",
      		"",
      		"Fleming"
      	],
      	[
      		"J.J.",
      		"",
      		"Sexton"
      	],
      	[
      		"Josh",
      		"",
      		""
      	],
      	[
      		"Karla",
      		"",
      		"Mitchum"
      	],
      	[
      		"Keith",
      		"",
      		"Myers"
      	],
      	[
      		"Levan",
      		"",
      		"Fuu"
      	],
      	[
      		"Meg",
      		"",
      		"Reem"
      	],
      	[
      		"Monica",
      		"",
      		"Humphrey"
      	],
      	[
      		"Petro",
      		"",
      		"Garcia"
      	],
      	[
      		"Phillip",
      		"",
      		"Kaufman"
      	],
      	[
      		"Sabastian",
      		"",
      		"Morse"
      	],
      	[
      		"Sean",
      		"",
      		"Mitadera"
      	],
      	[
      		"Sonia",
      		"",
      		""
      	],
      	[
      		"Vincent",
      		"",
      		"Pike"
      	]
      ];
      var unicorn = [
      	[
      		"Aaron",
      		"",
      		"Terzieff"
      	],
      	[
      		"Alberto",
      		"",
      		"Vist"
      	],
      	[
      		"Alec",
      		"",
      		""
      	],
      	[
      		"Angelo",
      		"",
      		"Sauper"
      	],
      	[
      		"Anna",
      		"",
      		"Links"
      	],
      	[
      		"Audrey",
      		"",
      		"Burne"
      	],
      	[
      		"Banagher",
      		"",
      		"Links"
      	],
      	[
      		"Bancroft",
      		"",
      		""
      	],
      	[
      		"Beltorchika",
      		"",
      		"Irma"
      	],
      	[
      		"Besson",
      		"",
      		""
      	],
      	[
      		"Bollard",
      		"",
      		""
      	],
      	[
      		"Bright",
      		"",
      		"Noa"
      	],
      	[
      		"Cardeas",
      		"",
      		"Vist"
      	],
      	[
      		"Conroy",
      		"",
      		"Haagensen"
      	],
      	[
      		"Daguza",
      		"",
      		"Mackle"
      	],
      	[
      		"Daryl",
      		"",
      		"McGuinness"
      	],
      	[
      		"Denis",
      		"",
      		""
      	],
      	[
      		"Douglas",
      		"",
      		"Doillon"
      	],
      	[
      		"Ester",
      		"",
      		""
      	],
      	[
      		"Fee",
      		"",
      		"Zinnerman"
      	],
      	[
      		"Flaste",
      		"",
      		"Schole"
      	],
      	[
      		"Full",
      		"",
      		"Frontal"
      	],
      	[
      		"Gael",
      		"",
      		"Chan"
      	],
      	[
      		"Galom",
      		"",
      		"Gorga"
      	],
      	[
      		"Gilboa",
      		"",
      		"Sant"
      	],
      	[
      		"Hasan",
      		"",
      		""
      	],
      	[
      		"Helm",
      		"",
      		"Converse"
      	],
      	[
      		"Hill",
      		"",
      		"Dawson"
      	],
      	[
      		"Homare",
      		"",
      		""
      	],
      	[
      		"Jonah",
      		"",
      		"Gibney"
      	],
      	[
      		"Kai",
      		"",
      		"Shiden"
      	],
      	[
      		"Kora",
      		"",
      		"Sant"
      	],
      	[
      		"Liam",
      		"",
      		"Borrinea"
      	],
      	[
      		"Loni",
      		"",
      		"Garvey"
      	],
      	[
      		"Marco",
      		"",
      		""
      	],
      	[
      		"Marida",
      		"",
      		"Cruz"
      	],
      	[
      		"Marie",
      		"",
      		"Zinnerman"
      	],
      	[
      		"Martha",
      		"",
      		"Vist Carbine"
      	],
      	[
      		"Meran",
      		"",
      		""
      	],
      	[
      		"Micott",
      		"",
      		"Bartsch"
      	],
      	[
      		"Mihiro",
      		"",
      		"Oiwakken"
      	],
      	[
      		"Nashiri",
      		"",
      		"Lazar"
      	],
      	[
      		"Nigel",
      		"",
      		"Garrett"
      	],
      	[
      		"Norm",
      		"",
      		"Basilicock"
      	],
      	[
      		"Otto",
      		"",
      		"Midas"
      	],
      	[
      		"Ricardo",
      		"",
      		"Marcenas"
      	],
      	[
      		"Riddhe",
      		"",
      		"Marcenas"
      	],
      	[
      		"Ronan",
      		"",
      		"Marcenas"
      	],
      	[
      		"Russet",
      		"",
      		""
      	],
      	[
      		"Savoir",
      		"",
      		""
      	],
      	[
      		"Sercel",
      		"",
      		"Mitukale"
      	],
      	[
      		"Sergi",
      		"",
      		""
      	],
      	[
      		"Suberoa",
      		"",
      		"Zinnerman"
      	],
      	[
      		"Syam",
      		"",
      		"Vist"
      	],
      	[
      		"Sydow",
      		"",
      		"Omoki"
      	],
      	[
      		"Takuya",
      		"",
      		"Irei"
      	],
      	[
      		"Tikva",
      		"",
      		"Sant"
      	],
      	[
      		"Tom",
      		"",
      		""
      	],
      	[
      		"Tomura",
      		"",
      		""
      	],
      	[
      		"Tucci",
      		"",
      		"Sant"
      	],
      	[
      		"Utalde",
      		"",
      		"Husher"
      	],
      	[
      		"Watts",
      		"",
      		"Stepney"
      	],
      	[
      		"Yonem",
      		"",
      		"Kirks"
      	]
      ];
      var zeta = [
      	[
      		"Kamille",
      		"",
      		"Bidan"
      	],
      	[
      		"Fa",
      		"",
      		"Yuiry"
      	],
      	[
      		"Quattro",
      		"",
      		"Bajeena"
      	],
      	[
      		"Bright",
      		"",
      		"Noa"
      	],
      	[
      		"Apolly",
      		"",
      		"Bay"
      	],
      	[
      		"Roberto",
      		"",
      		""
      	],
      	[
      		"Reccoa",
      		"",
      		"Londe"
      	],
      	[
      		"Henken",
      		"",
      		"Bekkener"
      	],
      	[
      		"Katz",
      		"",
      		"Kobayashi"
      	],
      	[
      		"Astonaige",
      		"",
      		"Medoz"
      	],
      	[
      		"Hasan",
      		"",
      		""
      	],
      	[
      		"Kai",
      		"",
      		"Shiden"
      	],
      	[
      		"Anna",
      		"",
      		"Hanna"
      	],
      	[
      		"Toraja",
      		"",
      		"Toraja"
      	],
      	[
      		"Tripper",
      		"",
      		""
      	],
      	[
      		"Samarn",
      		"",
      		""
      	],
      	[
      		"Saegusa",
      		"",
      		""
      	],
      	[
      		"Abu",
      		"",
      		"Dabia"
      	],
      	[
      		"Caesar",
      		"",
      		""
      	],
      	[
      		"",
      		"",
      		"Callman"
      	],
      	[
      		"Hayaii",
      		"",
      		""
      	],
      	[
      		"",
      		"",
      		"Manack"
      	],
      	[
      		"",
      		"",
      		"Torres"
      	],
      	[
      		"Bask",
      		"",
      		"Om"
      	],
      	[
      		"Jerid",
      		"",
      		"Messa"
      	],
      	[
      		"Kacrikon",
      		"",
      		"Cacooler"
      	],
      	[
      		"Emma",
      		"",
      		"Sheen"
      	],
      	[
      		"Lila",
      		"Milla",
      		"Rira"
      	],
      	[
      		"Matosh",
      		"",
      		""
      	],
      	[
      		"Franklin",
      		"",
      		"Bidan"
      	],
      	[
      		"Hilda",
      		"",
      		"Bidan"
      	],
      	[
      		"Four",
      		"",
      		"Murasame"
      	],
      	[
      		"Rosamia",
      		"",
      		"Badam"
      	],
      	[
      		"Jamaican",
      		"",
      		"Daninghan"
      	],
      	[
      		"Mouar",
      		"",
      		"Pharaoh"
      	],
      	[
      		"Sarah",
      		"",
      		"Zabiarov"
      	],
      	[
      		"Yazan",
      		"",
      		"Gable"
      	],
      	[
      		"Jamitov",
      		"",
      		"Hymen"
      	],
      	[
      		"Paptimus",
      		"",
      		"Scirocco"
      	],
      	[
      		"Ted",
      		"",
      		"Ayachi"
      	],
      	[
      		"Dolk",
      		"",
      		""
      	],
      	[
      		"Wong",
      		"",
      		"Lee"
      	],
      	[
      		"Melanie",
      		"Hue",
      		"Carbine"
      	],
      	[
      		"Haman",
      		"",
      		"Karn"
      	],
      	[
      		"Mineva",
      		"Lao",
      		"Zabi"
      	],
      	[
      		"Stephanie",
      		"",
      		"Luio"
      	],
      	[
      		"Margareta",
      		"",
      		""
      	],
      	[
      		"Ramban",
      		"",
      		"Sqwarm"
      	],
      	[
      		"Mezun",
      		"",
      		"Mex"
      	],
      	[
      		"Amelia",
      		"",
      		""
      	]
      ];
      var data = {
      	"0080": [
      	[
      		"",
      		"",
      		"Killing"
      	],
      	[
      		"",
      		"",
      		"Rugens"
      	],
      	[
      		"",
      		"",
      		"von Helsing"
      	],
      	[
      		"Alfred",
      		"",
      		"Izuruha"
      	],
      	[
      		"Andy",
      		"",
      		"Strauss"
      	],
      	[
      		"Bernard",
      		"",
      		"Wiseman"
      	],
      	[
      		"Carioca",
      		"",
      		""
      	],
      	[
      		"Charlie",
      		"",
      		""
      	],
      	[
      		"Chay",
      		"",
      		""
      	],
      	[
      		"Christina",
      		"",
      		"Mackenzie"
      	],
      	[
      		"Dolores",
      		"",
      		"Hayes"
      	],
      	[
      		"Ems",
      		"",
      		"Izuruha"
      	],
      	[
      		"Gabriel",
      		"Ramirez",
      		"Garcia"
      	],
      	[
      		"Michiko",
      		"",
      		"Izuruha"
      	],
      	[
      		"Mikhail",
      		"",
      		"Kaminsky"
      	],
      	[
      		"Richard",
      		"",
      		"Lumumba"
      	],
      	[
      		"Steiner",
      		"",
      		"Hardy"
      	],
      	[
      		"Stuart",
      		"",
      		""
      	],
      	[
      		"Telcott",
      		"",
      		""
      	]
      ],
      	"0083": [
      	[
      		"",
      		"",
      		"Bergman"
      	],
      	[
      		"",
      		"",
      		"Bicock"
      	],
      	[
      		"",
      		"",
      		"O’Sullivan"
      	],
      	[
      		"Adamski",
      		"",
      		""
      	],
      	[
      		"Aiguille",
      		"",
      		"Delaz"
      	],
      	[
      		"Akram",
      		"",
      		"Harida"
      	],
      	[
      		"Alloys",
      		"",
      		"Mozley"
      	],
      	[
      		"Alpha",
      		"",
      		"Bate"
      	],
      	[
      		"Anavel",
      		"",
      		"Gato"
      	],
      	[
      		"Bask",
      		"",
      		"Om"
      	],
      	[
      		"Bernard",
      		"",
      		"Monsha"
      	],
      	[
      		"Bily",
      		"",
      		"Glardle"
      	],
      	[
      		"Bob",
      		"",
      		""
      	],
      	[
      		"Chap",
      		"",
      		"Adel"
      	],
      	[
      		"Chuck",
      		"",
      		"Keith"
      	],
      	[
      		"Cima",
      		"",
      		"Garahau"
      	],
      	[
      		"Deatroaf",
      		"",
      		"Kocsel"
      	],
      	[
      		"Dick",
      		"",
      		"Allen"
      	],
      	[
      		"Draize",
      		"",
      		""
      	],
      	[
      		"Eiphar",
      		"",
      		"Synapse"
      	],
      	[
      		"Gaily",
      		"",
      		""
      	],
      	[
      		"Gene",
      		"",
      		"Coliny"
      	],
      	[
      		"Green",
      		"",
      		"Wyatt"
      	],
      	[
      		"Haman",
      		"",
      		"Karn"
      	],
      	[
      		"Hawkins",
      		"",
      		"Marnery"
      	],
      	[
      		"Heintz",
      		"",
      		""
      	],
      	[
      		"Horst",
      		"",
      		"Harness"
      	],
      	[
      		"Ivan",
      		"",
      		"Paserov"
      	],
      	[
      		"Jacqueline",
      		"",
      		"Simone"
      	],
      	[
      		"Jamitov",
      		"",
      		"Hymen"
      	],
      	[
      		"John",
      		"",
      		"Kowen"
      	],
      	[
      		"Joshua",
      		"",
      		"Purpleton"
      	],
      	[
      		"Kalent",
      		"",
      		""
      	],
      	[
      		"Karius",
      		"",
      		"Otto"
      	],
      	[
      		"Kelley",
      		"",
      		"Layzner"
      	],
      	[
      		"Kou",
      		"",
      		"Uraki"
      	],
      	[
      		"Kult",
      		"",
      		""
      	],
      	[
      		"Kurena",
      		"",
      		"Hacksell"
      	],
      	[
      		"Latuera",
      		"",
      		"Chapra"
      	],
      	[
      		"Lucette",
      		"",
      		"Audevie"
      	],
      	[
      		"Mora",
      		"",
      		"Boscht"
      	],
      	[
      		"Nakohha",
      		"",
      		"Nakato"
      	],
      	[
      		"Neuen",
      		"",
      		"Bitter"
      	],
      	[
      		"Nick",
      		"",
      		"Orville"
      	],
      	[
      		"Nina",
      		"",
      		"Purpleton"
      	],
      	[
      		"Peter",
      		"",
      		"Purpleton"
      	],
      	[
      		"Peter",
      		"",
      		"Scott"
      	],
      	[
      		"Poral",
      		"",
      		"Guilish"
      	],
      	[
      		"Raban",
      		"",
      		"Karcs"
      	],
      	[
      		"South",
      		"",
      		"Burning"
      	],
      	[
      		"William",
      		"",
      		"Morris"
      	],
      	[
      		"Wolfgang",
      		"",
      		"Waal"
      	],
      	[
      		"Yuri",
      		"",
      		"Hasler"
      	]
      ],
      	"08th-ms-team": [
      	[
      		"",
      		"",
      		"Kojima"
      	],
      	[
      		"Aina",
      		"",
      		"Sahalin"
      	],
      	[
      		"Arth",
      		"",
      		""
      	],
      	[
      		"Baresto",
      		"",
      		"Rosita"
      	],
      	[
      		"Barry",
      		"",
      		""
      	],
      	[
      		"Bone",
      		"",
      		"Abust"
      	],
      	[
      		"Chibi",
      		"",
      		""
      	],
      	[
      		"Cynthia",
      		"",
      		""
      	],
      	[
      		"Dell",
      		"",
      		""
      	],
      	[
      		"Eledore",
      		"",
      		"Massis"
      	],
      	[
      		"Gihren",
      		"",
      		"Zabi"
      	],
      	[
      		"Ginias",
      		"",
      		"Sahalin"
      	],
      	[
      		"Hige",
      		"",
      		""
      	],
      	[
      		"Isan",
      		"",
      		"Ryer"
      	],
      	[
      		"Jacob",
      		"",
      		""
      	],
      	[
      		"Jidan",
      		"",
      		"Nickard"
      	],
      	[
      		"Karen",
      		"",
      		"Joshua"
      	],
      	[
      		"Kiki",
      		"",
      		"Rosita"
      	],
      	[
      		"Maria",
      		"",
      		""
      	],
      	[
      		"Masado",
      		"",
      		""
      	],
      	[
      		"Michel",
      		"",
      		"Ninorich"
      	],
      	[
      		"Mike",
      		"",
      		""
      	],
      	[
      		"Nielba",
      		"",
      		""
      	],
      	[
      		"Noppo",
      		"",
      		""
      	],
      	[
      		"Norris",
      		"",
      		"Packard"
      	],
      	[
      		"Pietro",
      		"",
      		""
      	],
      	[
      		"Rob",
      		"",
      		""
      	],
      	[
      		"Runen",
      		"",
      		""
      	],
      	[
      		"Sally",
      		"",
      		""
      	],
      	[
      		"Shiro",
      		"",
      		"Amada"
      	],
      	[
      		"Terry",
      		"",
      		"Sanders Jr."
      	],
      	[
      		"Topp",
      		"",
      		""
      	],
      	[
      		"Walter",
      		"",
      		"Janowitz"
      	],
      	[
      		"Yuri",
      		"",
      		"Kellerne"
      	]
      ],
      	gundam: gundam,
      	hathaway: hathaway,
      	narrative: narrative,
      	thunderbolt: thunderbolt,
      	unicorn: unicorn,
      	zeta: zeta
      };

      function sample(array) {
        const length = array == null ? 0 : array.length;
        return length ? array[Math.floor(Math.random() * length)] : undefined
      }

      function generateName (options) {
        options = { middleNameRarity: 0.01, ...options };
        let collection;
        if (options.collection) {
          collection = data[options.collection];
        }
        else {
          collection = [];
          for (const collectionName in data) {
            collection = collection.concat(data[collectionName]);
          }
        }

        const firstNames = [];
        const middleNames = [];
        const lastNames = [];

        for (const nameGroup of collection) {
          if (nameGroup[0]) firstNames.push(nameGroup[0]);
          if (nameGroup[1]) middleNames.push(nameGroup[1]);
          if (nameGroup[2]) lastNames.push(nameGroup[2]);
        }

        const firstName = sample(firstNames);
        const middleName = Math.random() > (1 - options.middleNameRarity) ? sample(middleNames) : null;
        const lastName = sample(lastNames);

        return [firstName, middleName, lastName].join(' ');
      }

      exports.generateName = generateName;

      Object.defineProperty(exports, '__esModule', { value: true });

    })));
    }(dist, dist.exports));

    var GundamNames = /*@__PURE__*/getDefaultExportFromCjs(dist.exports);

    /* docs-src/App.svelte generated by Svelte v3.42.1 */
    const file = "docs-src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let small;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			small = element("small");
    			small.textContent = "Hello,";
    			br = element("br");
    			t1 = text(/*name*/ ctx[0]);
    			attr_dev(small, "class", "svelte-1xd1bq2");
    			add_location(small, file, 7, 5, 137);
    			add_location(br, file, 7, 26, 158);
    			attr_dev(h1, "class", "svelte-1xd1bq2");
    			add_location(h1, file, 7, 1, 133);
    			attr_dev(main, "class", "svelte-1xd1bq2");
    			add_location(main, file, 6, 0, 125);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, small);
    			append_dev(h1, br);
    			append_dev(h1, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const name = GundamNames.generateName();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ GundamNames, name });
    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=index.js.map
