import {SvgPlus} from "./SvgPlus/4.js"
import {Slider, ElementGrid} from "./slider.js"
function hsv2rgb (hsb) {

    var rgb = { };
    var h = Math.round(360 * hsb.h / 255);
    var s = Math.round(hsb.s);
    var v = Math.round(hsb.v);

        if (s == 0) {

        rgb.r = rgb.g = rgb.b = v;
        } else {
        var t1 = v;
        var t2 = (255 - s) * v / 255;
        var t3 = (t1 - t2) * (h % 60) / 60;

            if (h == 360) h = 0;

                if (h < 60) { rgb.r = t1; rgb.b = t2; rgb.g = t2 + t3 }
                else if (h < 120) { rgb.g = t1; rgb.b = t2; rgb.r = t1 - t3 }
                else if (h < 180) { rgb.g = t1; rgb.r = t2; rgb.b = t2 + t3 }
                else if (h < 240) { rgb.b = t1; rgb.r = t2; rgb.g = t1 - t3 }
                else if (h < 300) { rgb.b = t1; rgb.g = t2; rgb.r = t2 + t3 }
                else if (h < 360) { rgb.r = t1; rgb.g = t2; rgb.b = t1 - t3 }
                else { rgb.r = 0; rgb.g = 0; rgb.b = 0 }
        }

    return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

class S255 extends SvgPlus {
    constructor(){
        super("slider-255")

        this.slider = this.createChild(Slider, {
            events: {
                "change": () => {
                    this.number.value = Math.round(this.slider.value * 255);
                    this.dispatchEvent(new Event("change"))
                }
            }
        })

        this.number = this.createChild("input", {type: "number", events: {
            input: () => {
                this.slider.value = this.number.value / 255;
                this.dispatchEvent(new Event("change"))
            }
        }});

        this.value = 0;
    }

    get value() {
        return Math.round(this.slider.value * 255);
    }

    set value (value) {
        this.slider.value = value /255;
        this.number.value = Math.round(value);
    }
}
class TransEquation extends SvgPlus {
    constructor() {
        super("div")

        this.a = this.createChild("input", {type: "number", events: {input: () => {
            this.dispatchEvent(new Event("change"))
        }}});
        this.createChild("span", {content: " + "})
        this.b = this.createChild("input", {type: "number", events: {input: () => {
            this.dispatchEvent(new Event("change"))
        }}});
        this.createChild("span", {content: " * t"})
        this.value = [0, 1]
    }

    set value([a, b]) {
        this.a.value = a;
        this.b.value = b;
    }

    get value(){
        return [Number(this.a.value), Number(this.b.value)];
    }
}

const DEFAULT_MODE = "fixed";
const MODE_NUMS = ["fixed", "linear", "wave"]
const MODES = {
    "fixed": {
        input: S255,
        func: (t, value) => value,
        num: 0,
        size: 1,
        toBytes: (v) => [v]
    },
    "linear": {
        input: TransEquation,
        func: (t, [a, b]) => {
            let x = a + b * t
            let y = Math.floor(x);
            return (x - y) * 255;
        },
        num: 1,
        size: 8,
        toBytes: ([a,b]) => {
            let floats = new Float32Array(2);  // two indexes each 4 bytes
            floats[0] = a;
            floats[1] = b;
            return new Int8Array(floats.buffer);
        }
    },
    "wave": {
        input: TransEquation,
        func: (t, [a, b]) => {
            let x = (a + b * t) * 2 * Math.PI;
            let tc = 255 * (1 - Math.cos(x)) / 2;
            return tc;
        },
        num: 2,
        size: 8,
        toBytes: ([a,b]) => {
            let floats = new Float32Array(2);  // two indexes each 4 bytes
            floats[0] = a;
            floats[1] = b;
            return new Int8Array(floats.buffer);
        }
    },
}

class ColorParamSelector extends SvgPlus {
    constructor() {
        super("color-param-selector");
        this.modeSelect = this.createChild("select", {events: {
            input: (e) => {
                this.mode = this.modeSelect.value;


            }
        }});
        for (let mode in MODES) {
            this.modeSelect.createChild("option", {value: mode, content: mode})
        }
        this.inputContainer = this.createChild("div");
        this.mode = DEFAULT_MODE;
    }

    set mode(mode){
        this.inputContainer.innerHTML = "";
        this.input = this.inputContainer.createChild(MODES[mode].input, {events: {change: () => {
            this.dispatchEvent(new Event("change"))
        }}});
        this._mode = mode;
    }
    get mode() {
        return this._mode;
    }

    get value() {
        return [this.mode, this.input.value]
    }

    set value([mode, value]) {
        this.mode = mode;
        this.input.value = value;
    }
}


class ColorView extends SvgPlus {
    constructor() {
        super("color-view")
        this.color = this.createChild("div", {class: "color"});
        this.t = this.createChild("div")
    }


    set col(c){
        this._color = c;
    }
    get col(){
        return this._color;
    }

    update(t) {
        if (this.col) {
            let tl = t - Math.floor(t);
    
            this.t.innerHTML = `t = ${tl.toPrecision(1)}`
    
            let c = this.col;
                    
            let hsv = c.map(([type, value]) => MODES[type].func(t, value));
            let [h,s, v] = hsv;
            
            let col = hsv2rgb({h,s,v})
            
            this.color.styles = {
                background: col
            }
        }
    }
}



class PixelSetter extends SvgPlus {
    constructor(){
        super("pixel-setter")
        let hsv = []
        for (let type of ["hue", "staturation", "value"]) {
            let e = this.createChild("div", {class: "cps-box"});
            e.createChild("div", {content: type})
            hsv.push(e.createChild(ColorParamSelector, {events: {
                change: (e) => {
                    this.onChange()
                }
            }}))
        }
        this.hsv = hsv;
        this.cview = this.createChild(ColorView)
    }

    onChange(){
        this.cview.col = this.value;
        
    }

    get value() {
        return this.hsv.map(e => e.value)
    }

    set value(value) {
        value.map((sv, i) => this.hsv[i].value = sv);
    }
}


class GridPixel extends SvgPlus {
    constructor(){
        super("div");
        this.color = [['fixed', 0], ['fixed', 0], ['fixed', 0]]
    }

    update(t){
        if (this.color) {
            let c = this.color;
            let hsv = c.map(([type, value]) => MODES[type].func(t, value));
            let [h,s, v] = hsv;
            let col = hsv2rgb({h,s,v})
            this.styles = {
                background: col
            }
        }
    }
}

class ColorGrid extends ElementGrid {
    constructor() {
        super("div", [5, 6], GridPixel);
        this.styles = {display: "inline-grid"};
        this.class = "grid"
    }
    update(t){
        this.forEachCell(c => c.update(t))
    }

    copy() {
        let copy = new ColorGrid();

        copy.forEachCell((c, i, j) => {
            c.color = this[i][j].color
        })

        return copy;
    }
}

class FrameIcon extends SvgPlus {
    constructor(disp){
        super("div");
        this.class = "f-icon"
        this.copy = disp.copy();
        this.appendChild(this.copy);
        this.createChild("button", {name: "delete", content: "x", events: {
            click: () => this.dispatchEvent(new Event("delete"))
        }})

        this.createChild("button", {name: "copy", content: "^", events: {
            click: () => this.dispatchEvent(new Event("copy"))
        }})

        this.createChild("button", {name: "left", content: "<", events: {
            click: () => this.dispatchEvent(new Event("left"))
        }})

        this.createChild("button", {name: "right", content: ">", events: {
            click: () => this.dispatchEvent(new Event("right"))
        }})
    }
    update(...args) {
        this.copy.update(...args);
    }
    forEachCell(...args) {
        this.copy.forEachCell(...args);
    }
}

class MatrixAnim extends SvgPlus {

    constructor() {
        super("matrix-anim")
        let o1 = this.createChild("div");
        let r1 = o1.createChild("div", {class: "editor"});
        let btns = o1.createChild("div", {class: "buttons"})
        let r2 = o1.createChild("div", {class: "settings"});

        let o2 = this.createChild("div");
        let r3 = o2.createChild("div", {class: "frames"});
        let r4 = o2.createChild("div")
        this.demo = r4.createChild(ColorGrid)
        this.animLength = 2000;
        let mat = r1.createChild(ColorGrid)

        btns.createChild("button", {content: "save", events: {
            click: () => this.save()
        }})
        btns.createChild("button", {content: "+",
            events: {
                click: () => {
                    // let copy = mat.copy()
                    // copy.ondblclick = () => {
                    //     copy.remove();
                    // }
                    let f = r3.createChild(FrameIcon, {events: {
                        delete: () => f.remove(),
                        copy: () => {
                            f.forEachCell((c, i, j) => {
                                mat[i][j].color = c.color;
                            })
                            console.log("copy");
                            
                        },
                        left: () => {
                            if (f.previousSibling) {
                                f.previousSibling.before(f);
                            }
                        },
                        right: () => {
                            if (f.nextElementSibling) {
                                f.nextElementSibling.after(f);
                            }
                        }
                    }}, mat);

                }
            }
        })

        let time = r2.createChild("div")
        let bpm = time.createChild("div")
        bpm.createChild("span", {content: "BPM"})
        this.bpm = bpm.createChild("input", {type: "number", value: 120, events: {input: () => this.onBPM()}})
        let beats = time.createChild("div");
        beats.createChild("span", {content: "beats"});
        this.beats = beats.createChild("input", {type: "number", value: 4, events: {input: () => this.onBPM()}})

        let set = r2.createChild(PixelSetter);
        this.set = set;
        
     
        this._frames = r3;

        mat.forEachCell((c) => {
            c.onclick = () => {
                c.color = set.value;
            }
            c.addEventListener("contextmenu", (e) => {
                c.color = new Array(3).fill(["fixed", 0]);
                e.preventDefault();
            })
        })
        this.mat = mat;
        this.start();
    }

    onBPM(){
        let bpm = this.bpm.value;
        let beats = this.beats.value;

        let beat_ms = 1000 / (bpm / 60);
        let bar_ms = beats * beat_ms;

        if (bar_ms == 0) bar_ms = 1000;
        
        this.animLength = bar_ms;

    }

    get frames() {
        return [...this._frames.children]
    }
    async start() {
        while(true) {
            let t = performance.now();
            let t_cont = t/this.animLength;
    

            this.mat.update(t_cont)
            this.frames.forEach(f => {
                f.update(t_cont)
            })

            if (this.frames.length > 0) {
                
                let i = Math.floor(this.frames.length * (t_cont - Math.floor(t_cont)));
                
                this.frames[i].forEachCell((c, i, j)=> {
                    this.demo[i][j].color = c.color;
                })
                this.demo.update(t_cont)
            }
            this.set.cview.update(t_cont);
            
            await new Promise((resolve, reject) => {
                window.requestAnimationFrame(resolve);
            })
        }
    }

    // import(bytes) {
    //     let size = bytes[0] * 256 + bytes[1];
    //     let ptypes = []
    //     for (let i = 0; i < size; i++) {
    //        for (let j = 0; j < 30; j++) {
    //         let idx = i * 30 + j + 2;
    //         let b = bytes[idx];
    //        }
    //     }
    // }

    save(){
        let bin = this.export();
        let name = prompt("enter a name")
        let text = `unsigned char ${name}[] = {${bin.join(",")}};`
        let blob = new Blob([text], {type: "text"});
        let url = URL.createObjectURL(blob);
        let a = new SvgPlus("a");
        a.props = {href: url, download: name + ".txt"}
        a.click()
    }

    export(){
        let frames = this.frames;
        let ptypes = frames.flatMap(f => {
            let pt = []
            f.forEachCell(c => {
                let color = c.color;
                let [ht, st, vt] = color.map(p => MODES[p[0]].num);

                

                let pixelt = ht + (st << 2) + (vt << 4);
                pt.push(pixelt);
            });
            return pt;
        });

        let pdata = frames.flatMap(f => {
            let bytes = [];
            f.forEachCell(c => {
                let pbytes = c.color.map(([type, val]) => MODES[type].toBytes(val))
                for (let b of pbytes) {
                    bytes.push(...b);
                }
            })
            return bytes;
        })
        let size = frames.length;
        let binary = new Uint8Array([size%256, Math.floor(size/256), ...ptypes, ...pdata]);
        return binary
    }

}


document.body.appendChild(new MatrixAnim)