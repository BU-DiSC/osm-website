// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {
// Event attributes, trigger
// Analysis mode selection trigger
document.querySelector("#customRadio1").onclick = display;
document.querySelector("#customRadio2").onclick = display;
// Individual LSM configuration trigger
document.querySelector("#vlsm-input-T").onchange = run;
document.querySelector("#vlsm-input-T").onwheel = run;
document.querySelector("#vlsm-input-E").onchange = run;
document.querySelector("#vlsm-input-E").onwheel = run;
document.querySelector("#vlsm-input-N").onchange = run;
document.querySelector("#vlsm-input-N").onwheel = run;
document.querySelector("#vlsm-input-M").onchange = run;
document.querySelector("#vlsm-input-M").onwheel = run;
document.querySelector("#vlsm-tiering").onclick = run;
document.querySelector("#vlsm-leveling").onclick = run;
document.querySelector("#rlsm-input-T").onchange = run
document.querySelector("#rlsm-input-T").onwheel = run;
document.querySelector("#rlsm-input-E").onchange = run;
document.querySelector("#rlsm-input-E").onwheel = run;
document.querySelector("#rlsm-input-N").onchange = run;
document.querySelector("#rlsm-input-N").onwheel = run;
document.querySelector("#rlsm-input-M").onchange = run;
document.querySelector("#rlsm-input-M").onwheel = run;
document.querySelector("#rlsm-tiering").onclick = run;
document.querySelector("#rlsm-leveling").onclick = run;
document.querySelector("#dlsm-input-T").onchange = run
document.querySelector("#dlsm-input-T").onwheel = run;
document.querySelector("#dlsm-input-E").onchange = run;
document.querySelector("#dlsm-input-E").onwheel = run;
document.querySelector("#dlsm-input-N").onchange = run;
document.querySelector("#dlsm-input-N").onwheel = run;
document.querySelector("#dlsm-input-M").onchange = run;
document.querySelector("#dlsm-input-M").onwheel = run;
document.querySelector("#dlsm-tiering").onclick = run;
document.querySelector("#dlsm-leveling").onclick = run;
document.querySelector("#osm-input-T").onchange = run
document.querySelector("#osm-input-T").onwheel = run;
document.querySelector("#osm-input-E").onchange = run;
document.querySelector("#osm-input-E").onwheel = run;
document.querySelector("#osm-input-N").onchange = run;
document.querySelector("#osm-input-N").onwheel = run;
document.querySelector("#osm-input-M").onchange = run;
document.querySelector("#osm-input-M").onwheel = run;
document.querySelector("#osm-tiering").onclick = run;
document.querySelector("#osm-leveling").onclick = run;
// N : number of entries
// L : number of Levels
// E : size of an entry(bytes)
// T : size ratio
// M : buffer capacity(MB);


class LSM {
    _T; 
    _E;
    _N;
    _M;
    _MP;
    _DEFAULT = {
        T: 2,
        E: 16,
        N: 4294967296,
        M: 256,
        MP: 0
    };
    _target;

    constructor(target = "") {
        this._MP =this._DEFAULT.MP;
        this._target = target;
        if(target) {
            this._T = document.querySelector(`#${target}-input-T`).value;
            this._E = document.querySelector(`#${target}-input-E`).value;
            this._N = document.querySelector(`#${target}-input-N`).value;
            this._M = document.querySelector(`#${target}-input-M`).value;
        } else {
            this._T = this._DEFAULT.T;
            this._E = this._DEFAULT.E;
            this._N = this._DEFAULT.N;
            this._M = this._DEFAULT.M;
        }     
    }

    get T() {return this._T;}
    get E() {return this._E;}
    get N() {return this._N;}
    get M() {return this._M;}
    get MP() {return this._MP;}
    get DEFAULT() {return this._DEFAULT;}
    set T(ratio) {
        this._T = ratio;
        return this._T;
    }
    set E(entrySize) {
        this._E = entrySize;
        return this._E;
    }
    set N(entryNum) {
        this._N = entryNum;
        return this._N;
    }
    set M(bufferSize) {
        this._M = bufferSize;
        return this._M;
    }
    set MP(mergePolicy) {
        this._MP = mergePolicy;
        return this._MP;
    }
    set DEFAULT(defaultObj) {
        this._DEFAULT = defaultObj;
        return this._DEFAULT;
    }

    /* Compute the levels of LSM-tree having ratio, _entry, entry size, Mbuffer
     * Return 0 when all in buffer.
     */
    _getL() {
        var L;
        var Mbytes = this._M * Math.pow(10, 6);   // convert to bytes
        var exp = ((this._N * this._E) / Mbytes) * ((this._T - 1) / this._T);
        L = Math.ceil(getBaseLog(this._T, exp));
        console.log("Computed Level = " + L);
        return (L < 1) ? 0 : L;
    }
    /* Having known the numer of levels,
     * compute the number of entries per run in the ith level 
     */
    _getEntryNum(ith) {
        var nr = 0; // number of entries each run
        var Mbytes = this._M * Math.pow(10, 6);   // convert to bytes
        var nl = Math.floor(Mbytes * Math.pow(this._T, ith) / this._E);  // number of entries per level
        if (this._MP) nr = Math.floor(nl / this._T);
        else nr = nl;
        return nr;
    }

    /* Compute the number of entries in ith level;
     * Return a string to be displayed when triggering ToolTip  
     */
    _getTipText(ith) {
        var n = this._getEntryNum(ith);
        var text = "";
        if (ith === 0) {
            text = "Memory Buffer: it contains " + n + " entries";
        } else {
            text = "Level: " + ith + ", this run contains " + n + " entries";
        }
        return text;
    }
    /* Calculate current amount and set the width of runs
     * Return a list of button objects 
     */
    _getBtns(elem, level, ratio) {

        var runs = [];
        var context = "At level: ";

        var getWidth = function(i) {
            var coef = 1;  
            var base_width = 10;
            var clientWidth = elem.clientWidth - 1;  // -1 to avoid stacking
            var m = clientWidth / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(clientWidth / base_width, 1 / level) / ratio;
                m  = base_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
        };

        for (var i = 0; i <= level; i++) {
            var run_width = getWidth(i);
            var button = createBtn(run_width);
            var context = this._getTipText(i);
            setToolTip(button, "left", context);
            runs[i] = button;
        }
        return runs;
    }

    _getBtnGroups(elem, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = 5;
        if (ratio < max_runs) {
            if (level !== 0) max_runs = ratio;
            else max_runs = 1;
        }

        var getWidth = function(i) {
            // Return the width for each button in a btn-group regarding to tiering
            if (level === 0) return elem.clientWidth + "px";
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var clientWidth = elem.clientWidth - 1;  // -1 to avoid stacking 
            var m = clientWidth / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(clientWidth / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 0; i <= level; i++) {
            var run_width = getWidth(i);
            var group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            console.log("Level" + i + " width = " + run_width);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                var context = "";
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    var context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    var context = this._getTipText(i);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);

                if (i === 0) break;  // only one run in buffer level 
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }

    update() {
        var L = this._getL();
        var btnList = [];
        var parent = document.querySelector(`#${this._target}-res`);
        if (this._MP) btnList = this._getBtnGroups(parent, L, this._T);
        else btnList = this._getBtns(parent, L, this._T);
        clear(parent);

        for (var i = 0; i <= L; i++) {
            var res_wrap = document.createElement("div");
            res_wrap.setAttribute("class", `row ${this._target}-result`);
            res_wrap.appendChild(btnList[i]);
            parent.appendChild(res_wrap);
        }
    }

}


class VanillaLSM extends LSM{
    constructor(target) {
        super(target);
    }
}

class RocksDBLSM extends LSM {
    constructor(target) {
        super(target);
    }
}

class DostoevskyLSM extends LSM {
    constructor(target) {
        super(target);
    }
    // @Override
    _getBtnGroups(elem, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = 5;
        if (ratio < max_runs) {
            if (level !== 0) max_runs = ratio;
            else max_runs = 1;
        }

        var getWidth = function(i) {
            // Return the width for each button in a btn-group regarding to tiering
            // *Customized for lazy leveling 
            if (level === 0 || level === i ) return elem.clientWidth + "px";    //*Customized
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var clientWidth = elem.clientWidth - 1;  // -1 to avoid stacking 
            var m = clientWidth / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(clientWidth / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 0; i <= level; i++) {
            var run_width = getWidth(i);
            var group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            console.log("Level" + i + " width = " + run_width);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                var context = "";
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    var context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    var context = super._getTipText(i);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);

                if (i === 0 || i === level) break;  //*Customized, only one run in buffer and last level 
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }
}

class OSM extends LSM {
    constructor(target) {
        super(target);
    }
}

function runVanillaLSM() {
    var input_T = document.querySelector("#vlsm-input-T").value;
    var input_E = document.querySelector("#vlsm-input-E").value;
    var input_N = document.querySelector("#vlsm-input-N").value;
    var input_M = document.querySelector("#vlsm-input-M").value;
    var input = {T: input_T, E: input_E, N: input_N, M: input_M};

    validate(this, "vlsm", input);

    vlsm.T = document.querySelector("#vlsm-input-T").value;
    vlsm.E = document.querySelector("#vlsm-input-E").value;
    vlsm.N = document.querySelector("#vlsm-input-N").value;
    vlsm.M = document.querySelector("#vlsm-input-M").value;

    if (this.id === "vlsm-leveling") {
        console.log("update leveling demo");
        vlsm.MP = 0;
    } else if (this.id === "vlsm-tiering") {
        console.log("update tiering demo");
        vlsm.MP = 1;
    } else {
        console.log("simply update");
    }

    vlsm.update();
}

function runRocksDBLSM() {
    var input_T = document.querySelector("#rlsm-input-T").value;
    var input_E = document.querySelector("#rlsm-input-E").value;
    var input_N = document.querySelector("#rlsm-input-N").value;
    var input_M = document.querySelector("#rlsm-input-M").value;
    var input = {T: input_T, E: input_E, N: input_N, M: input_M};

    validate(this, "rlsm", input);

    rlsm.T = document.querySelector("#rlsm-input-T").value;
    rlsm.E = document.querySelector("#rlsm-input-E").value;
    rlsm.N = document.querySelector("#rlsm-input-N").value;
    rlsm.M = document.querySelector("#rlsm-input-M").value;

    if (this.id === "rlsm-leveling") {
        console.log("update leveling demo");
        rlsm.MP = 0;
    } else if (this.id === "rlsm-tiering") {
        console.log("update tiering demo");
        rlsm.MP = 1;
    } else {
        console.log("simply update");
    }

    rlsm.update();
}

function runDostoevskyLSM() {
    var input_T = document.querySelector("#dlsm-input-T").value;
    var input_E = document.querySelector("#dlsm-input-E").value;
    var input_N = document.querySelector("#dlsm-input-N").value;
    var input_M = document.querySelector("#dlsm-input-M").value;
    var input = {T: input_T, E: input_E, N: input_N, M: input_M};

    validate(this, "dlsm", input);

    dlsm.T = document.querySelector("#dlsm-input-T").value;
    dlsm.E = document.querySelector("#dlsm-input-E").value;
    dlsm.N = document.querySelector("#dlsm-input-N").value;
    dlsm.M = document.querySelector("#dlsm-input-M").value;

    if (this.id === "dlsm-leveling") {
        console.log("update leveling demo");
        dlsm.MP = 0;
    } else if (this.id === "dlsm-tiering") {
        console.log("update tiering demo");
        dlsm.MP = 1;
    } else {
        console.log("simply update");
    }

    dlsm.update();
}

function runOSM() {
    var input_T = document.querySelector("#osm-input-T").value;
    var input_E = document.querySelector("#osm-input-E").value;
    var input_N = document.querySelector("#osm-input-N").value;
    var input_M = document.querySelector("#osm-input-M").value;
    var input = {T: input_T, E: input_E, N: input_N, M: input_M};

    validate(this, "osm", input);

    osm.T = document.querySelector("#osm-input-T").value;
    osm.E = document.querySelector("#osm-input-E").value;
    osm.N = document.querySelector("#osm-input-N").value;
    osm.M = document.querySelector("#osm-input-M").value;

    if (this.id === "osm-leveling") {
        console.log("update leveling demo");
        osm.MP = 0;
    } else if (this.id === "osm-tiering") {
        console.log("update tiering demo");
        osm.MP = 1;
    } else {
        console.log("simply update");
    }

    osm.update();
}


//Common Methods

function getBaseLog(x, y) {
    if (isNaN(x) || isNaN(y)) throw new TypeError("x: " + x +", y: " + y + " must be numbers");
    if (!(x > 0 && y > 0)) {
        throw new RangeError("x: " + x +", y: " + y + " both must > 0");
    } else {
        return Math.log(y) / Math.log(x);
    }
}

function isPowerOfTwo(x) {
    if (isNaN(x)) throw new TypeError(x + " must be a number");
    if (x == 0) return false;
    else return x && !(x & (x - 1));
}

function nextPowerOfTwo(x) {
    // The reuslt should not less than 1
    if (isNaN(x)) throw new TypeError(x + " must be a number");
    if (x < 1) return 1;
    var exp = Math.ceil(getBaseLog(2, x));
    var result = Math.pow(2, exp);
    return (x === result) ? result * 2 : result;
}

function lastPowerOfTwo(x) {
    // The reuslt should not less than 1
    if (isNaN(x)) throw new TypeError(x + " must be a number");
    if (x <= 1) return 1;
    var exp = Math.floor(getBaseLog(2, x));
    var result = Math.pow(2, exp);
    return (x === result) ? result / 2 : result;
}


function setToolTip(elem, pos, text) {
    if (!(typeof pos === 'string' || pos instanceof String)) {
        throw new TypeError(pos + " must be a string or string object");
    } else if (!(pos == "left" || pos == "right" || pos == "top" || pos == "bottom")){
        throw new RangeError(pos + " must be a left or right or top or bottom");
    }
    elem.setAttribute("data-toggle", "tooltip");
    elem.setAttribute("data-placement", pos);
    elem.setAttribute("title", "" + text);
}

function createDots(width) {
    var dots = document.createElement("span");
    dots.setAttribute("class", "abbr-dot text-center");
    dots.setAttribute("style", "width:" + width);
    dots.textContent = "..."
    return dots;
}

function createBtn(width) {
    var btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("class", "lsm-btn btn btn-secondary");
    btn.setAttribute("style", "width:" + width);
    return btn;
}


function clear(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/* Display one of analysis mode according to
 * it's corresponding button triggers onlick event
 */
function display() {
    var indiv_conf = document.querySelector("#indiv-conf-row");
    var indiv_bush = document.querySelector("#indiv-bush-row");
    var cmp_conf = document.querySelector("#cmp-conf-row");
    switch (this.id) {
        case "customRadio1":
            cmp_conf.style.display = "";
            indiv_conf.style.display = "none";
            indiv_bush.style.display = "none";
            break;
        case "customRadio2":
            cmp_conf.style.display = "none";
            indiv_conf.style.display = "";
            indiv_bush.style.display = "";
            initIndiv();
            break;
        default:
            console.log(this.id);
            alert("Invalid: Unknown anlysis model selected");
    }
}
/* General API for runing different tree bush
 * Event driven
 */
function run() {
    var target = "";
    switch (this.id.charAt(0)) {
        case 'v': 
            target = "vlsm";
            break;
        case 'r':
            target = "rlsm";
            break;
        case 'd':
            target = "dlsm";
            break;
        case 'o':
            target = "osm";
            break;
        default:
            console.log(self.id);
            alert("Invalid: Unknown event target");
    }
    var obj = window.obj[target]; 
    var input_T = document.querySelector(`#${target}-input-T`).value;
    var input_E = document.querySelector(`#${target}-input-E`).value;
    var input_N = document.querySelector(`#${target}-input-N`).value;
    var input_M = document.querySelector(`#${target}-input-M`).value;
    var input = {T: input_T, E: input_E, N: input_N, M: input_M};

    validate(this, target, input);

    obj.T = document.querySelector(`#${target}-input-T`).value;
    obj.E = document.querySelector(`#${target}-input-E`).value;
    obj.N = document.querySelector(`#${target}-input-N`).value;
    obj.M = document.querySelector(`#${target}-input-M`).value;

    if (this.id === `${target}-leveling`) {
        console.log("update leveling demo");
        obj.MP = 0;
    } else if (this.id === `${target}-tiering`) {
        console.log("update tiering demo");
        obj.MP = 1;
    } else {
        console.log("simply update");
    }
    obj.update();
}

/* Validate and correct the input */
function validate(self, target, input) {
    // T >= 2, N, E > 1, M > 0
    if (!self.classList.contains(`${target}-input`)) {
        alert(`Invalid: Unknown ${target} configuration input`);
        return;
    }
    switch (self.id) {
        case `${target}-input-T`:
            if (input.T <= 1) {
                document.querySelector(`#${target}-input-T`).value = 2;
                // alert("Invalid: The minimal ratio of LSM-Tree is 2");
            }
            break;
        case `${target}-input-N`:
            if (input.N < 1) {
                document.querySelector(`#${target}-input-N`).value = 1;
                // alert("Invalid: The minimal number of entries of LSM-Tree is 1");
            }
            break;
        case `${target}-input-E`:
                if (input.E < 1) {
                document.querySelector(`#${target}-input-E`).value = 1;
                // alert("Invalid: The minimal entry size of LSM-Tree is 1 bytes");
            }
            break;
        case `${target}-input-M`:
                if (input.M <= 0) {
                document.querySelector(`#${target}-input-M`).value = 1;
                // alert("Invalid: The buffer size of LSM-Tree must > 0");
            }
            break;
        case `${target}-tiering`:
        case `${target}-leveling`:
            break;
        default:
            console.log(self.id);
            alert(`Invalid: Unknown ${target} configuration input`);
    }
    return;
}

/* Initialize the configuration and tree bush reuslt
 * when indiv-analysis being displayed
 */
function initIndiv() {
    var vlsm = new VanillaLSM("vlsm");
    var rlsm = new RocksDBLSM("rlsm");
    var dlsm = new DostoevskyLSM("dlsm");
    var osm = new OSM("osm");
    window.rlsm = rlsm;     // pass to global
    window.vlsm = vlsm;
    window.dlsm = dlsm;
    window.osm = osm;
    window.obj = {rlsm:window.rlsm, vlsm:window.vlsm, dlsm:window.dlsm, osm:window.osm};
    vlsm.update();
    rlsm.update();
    dlsm.update();
    osm.update();
}

function initCmp() {
}
// function setStep(element, default_value) {
//     // Having every input gone through this
//     // If step == 0, compute and reset input based on direction && prev_value, 
//     // then compute and set nextStep based on direction && prev_value and set the 
//     var step = element.getAttribute("step");
//     var direction = 0;  
//     var input_value = element.value;
//     var prev_value = parseInt(element.getAttribute("data-old"));
//     if (isNaN(prev_value)) {
//         alert("Invalid: Input is not an number, setting to default");
//         return step;
//     }
//     if (input_value > prev_value) {
//         direction = 1;
//     } else if (input_value < prev_value) {
//         direction = -1;
//     } else {
//         direction = 0;
//     }

//     var nextStep = function() {
//         // Compute nextStep by means of input;
//         // Special case: direction == 0. Compute nextStep by next direction, set nextStep = 0.
//         if (direction === 1) {
//             return nextPowerOfTwo()
//         } 

//     }
//     element.setAttribute("step", "" + next());
//     return step;
// }

});

