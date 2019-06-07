// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {
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
    _prefix;    // configurate target{cmp: comparative analysis, indiv: inidividual analysis}
    _suffix;    // result targets subclasses {vlsm, rlsm, dlsm, osm}
    _preMP;     // previous state of merge policy before switching analysis mode

    constructor(prefix = "", suffix = "") {
        this._MP =this._DEFAULT.MP;
        this._prefix = prefix;
        this._suffix = suffix;
        this._preMP = this._MP;
        if(prefix) {
            this._T = document.querySelector(`#${prefix}-input-T`).value;
            this._E = document.querySelector(`#${prefix}-input-E`).value;
            this._N = document.querySelector(`#${prefix}-input-N`).value;
            this._M = document.querySelector(`#${prefix}-input-M`).value;
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
    get prefix() {return this._prefix;}
    get suffix() {return this._suffix;}
    get preMP() {return this._preMP;}
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
    set prefix(prefix) {
        this._prefix = prefix;
        return this._prefix;
    }
    set suffix(prefix) {
        this._suffix = prefix;
        return this._suffix;
    }
    set preMP(mergePolicy) {
        this._preMP = mergePolicy;
        return this._preMP;
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
        var Mbytes = this.M * Math.pow(10, 6);   // convert to bytes
        var exp = ((this.N * this.E) / Mbytes) * ((this.T - 1) / this.T);
        L = Math.ceil(getBaseLog(this.T, exp));
        console.log("Computed Level = " + L);
        return (L < 1) ? 0 : L;
    }
    /* Having known the numer of levels,
     * compute the number of entries per run in the ith level 
     */
    _getEntryNum(ith) {
        var nr = 0; // number of entries each run
        var Mbytes = this.M * Math.pow(10, 6);   // convert to bytes
        var nl = Math.floor(Mbytes * Math.pow(this.T, ith) / this.E);  // number of entries per level
        if (this.MP) nr = Math.floor(nl / this.T);
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

    showBush() {
        var L = this._getL();
        var btnList = [];
        var parent = document.querySelector(`#${this.suffix}-res`);
        if (this.MP) btnList = this._getBtnGroups(parent, L, this.T);
        else btnList = this._getBtns(parent, L, this.T);
        clear(parent);

        for (var i = 0; i <= L; i++) {
            var res_wrap = document.createElement("div");
            res_wrap.setAttribute("class", `row ${this.suffix}-result`);
            res_wrap.appendChild(btnList[i]);
            parent.appendChild(res_wrap);
        }
    }
    /* update current state */
    update(prefix, mergePolicy = this.MP) {
        this.prefix = prefix;
        this.T = document.querySelector(`#${this.prefix}-input-T`).value;
        this.E = document.querySelector(`#${this.prefix}-input-E`).value;
        this.N = document.querySelector(`#${this.prefix}-input-N`).value;
        this.M = document.querySelector(`#${this.prefix}-input-M`).value;
        this.MP = mergePolicy;
    }

}


class VanillaLSM extends LSM{
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
    }
}

class RocksDBLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
    }
}

class DostoevskyLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
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
            // @Customized for lazy leveling 
            if (level === 0 || level === i ) return elem.clientWidth + "px";    //@Custom
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin; 
            var coef = 1;
            var clientWidth = elem.clientWidth - 1;  
            var m = clientWidth / Math.pow(max_runs, level - 1);
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

                if (i === 0 || i === level) break;  //@Custom, only one run in buffer and last level 
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }
}

class OSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
    }
}

function runCmp() {
    var target = "cmp";
    var input_T = document.querySelector("#cmp-input-T").value;
    var input_E = document.querySelector("#cmp-input-E").value;
    var input_N = document.querySelector("#cmp-input-N").value;
    var input_M = document.querySelector("#cmp-input-M").value;
    var input = {T: input_T, E: input_E, N: input_N, M: input_M};
    validate(this, target, input);

    if (this.id.includes("leveling")) {
        console.log("update leveling demo");
        vlsm.update(target, 0);
        rlsm.update(target, 0);
        dlsm.update(target, 0);
        osm.update(target, 0);
    } else if (this.id.includes("tiering")) {
        console.log("update tiering demo");
        vlsm.update(target, 1);
        rlsm.update(target, 1);
        dlsm.update(target, 1);
        osm.update(target, 1);
    } else {
        console.log("simply update");
        vlsm.update(target);
        rlsm.update(target);
        dlsm.update(target);
        osm.update(target);
    }

    vlsm.showBush();
    rlsm.showBush();
    dlsm.showBush();
    osm.showBush();

}



/* Initialize the configuration and tree bush reuslt
 * when indiv-analysis being displayed
 */
function initCmp() {
    var vlsm = new VanillaLSM("cmp", "vlsm");
    var rlsm = new RocksDBLSM("cmp", "rlsm");
    var dlsm = new DostoevskyLSM("cmp", "dlsm");
    var osm = new OSM("cmp", "osm");
    window.rlsm = rlsm;     // pass to global
    window.vlsm = vlsm;
    window.dlsm = dlsm;
    window.osm = osm;
    window.obj = {rlsm:window.rlsm, vlsm:window.vlsm, dlsm:window.dlsm, osm:window.osm};
    vlsm.showBush();
    rlsm.showBush();
    dlsm.showBush();
    osm.showBush();
}

/* Display one of analysis mode according to
 * it's corresponding button triggers onlick event
 */
function display() {
    switch (this.id) {
        case "customRadio1":
            hideElem("#indiv-conf-row");
            showElem("#cmp-conf-row");
            showElem(".cmp-indiv-mp");
            switchContext("cmp");
            break;
        case "customRadio2":
            hideElem(".cmp-indiv-mp");
            hideElem("#cmp-conf-row");
            showElem("#indiv-conf-row");
            switchContext("");
            break;
        default:
            console.log(this.id);
            alert("Invalid: Unknown anlysis model selected");
    }

    function switchContext(target = "cmp") {
        if (target === "cmp") {
            // scenario1: jump to comparative analysis
            // For each, store current MP as tmpMP
            // restore preMP as current MP
            // store tmpMP as preMP
            // update("cmp") and show 
            for (var key in window.obj) {
                var obj = window.obj[key];
                console.log(obj);
                var tmpMP = obj.MP;
                obj.MP = obj.preMP;
                obj.preMP = tmpMP;
                obj.update("cmp");
                obj.showBush();
            }
        } else {    // ... update(indiv)
            for (var key in window.obj) {
                console.log(target);
                var obj = window.obj[key];
                console.log(obj);
                var tmpMP = obj.MP;
                obj.MP = obj.preMP;
                obj.preMP = tmpMP;
                obj.update(key);
                obj.showBush();
            }
        }
    }
}


/* General API for runing different tree bush
 * Event driven
 */
function runIndiv() {
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

    if (this.id.includes("leveling")) {
        console.log("update leveling demo");
        obj.update(target, 0);
    } else if (this.id.includes("tiering")) {
        console.log("update tiering demo");
        obj.update(target, 1);
    } else {
        console.log("simply update");
        obj.update(target);
    }
    obj.showBush();
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

function showElem(query) {
    var elementList = document.querySelectorAll(query);
    for (let elem of elementList) {
        elem.style.display = "";
    }
}

function hideElem(query) {
    var elementList = document.querySelectorAll(query);
    for (let elem of elementList) {
        elem.style.display = "none";
    }
}

function clear(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}


initCmp();

// Event attributes, trigger
// Analysis mode selection trigger
document.querySelector("#customRadio1").onclick = display;
document.querySelector("#customRadio2").onclick = display;

document.querySelector("#cmp-input-T").onchange = runCmp;
document.querySelector("#cmp-input-T").onwheel = runCmp;
document.querySelector("#cmp-input-E").onchange = runCmp;
document.querySelector("#cmp-input-E").onwheel = runCmp;
document.querySelector("#cmp-input-N").onchange = runCmp;
document.querySelector("#cmp-input-N").onwheel = runCmp;
document.querySelector("#cmp-input-M").onchange = runCmp;
document.querySelector("#cmp-input-M").onwheel = runCmp;
document.querySelector("#cmp-tiering").onclick = runCmp;
document.querySelector("#cmp-leveling").onclick = runCmp;
// Individual LSM configuration trigger
document.querySelector("#vlsm-input-T").onchange = runIndiv;
document.querySelector("#vlsm-input-T").onwheel = runIndiv;
document.querySelector("#vlsm-input-E").onchange = runIndiv;
document.querySelector("#vlsm-input-E").onwheel = runIndiv;
document.querySelector("#vlsm-input-N").onchange = runIndiv;
document.querySelector("#vlsm-input-N").onwheel = runIndiv;
document.querySelector("#vlsm-input-M").onchange = runIndiv;
document.querySelector("#vlsm-input-M").onwheel = runIndiv;
document.querySelector("#vlsm-tiering").onclick = runIndiv;
document.querySelector("#vlsm-leveling").onclick = runIndiv;
document.querySelector("#rlsm-input-T").onchange = runIndiv
document.querySelector("#rlsm-input-T").onwheel = runIndiv;
document.querySelector("#rlsm-input-E").onchange = runIndiv;
document.querySelector("#rlsm-input-E").onwheel = runIndiv;
document.querySelector("#rlsm-input-N").onchange = runIndiv;
document.querySelector("#rlsm-input-N").onwheel = runIndiv;
document.querySelector("#rlsm-input-M").onchange = runIndiv;
document.querySelector("#rlsm-input-M").onwheel = runIndiv;
document.querySelector("#rlsm-tiering").onclick = runIndiv;
document.querySelector("#rlsm-leveling").onclick = runIndiv;
document.querySelector("#dlsm-input-T").onchange = runIndiv
document.querySelector("#dlsm-input-T").onwheel = runIndiv;
document.querySelector("#dlsm-input-E").onchange = runIndiv;
document.querySelector("#dlsm-input-E").onwheel = runIndiv;
document.querySelector("#dlsm-input-N").onchange = runIndiv;
document.querySelector("#dlsm-input-N").onwheel = runIndiv;
document.querySelector("#dlsm-input-M").onchange = runIndiv;
document.querySelector("#dlsm-input-M").onwheel = runIndiv;
document.querySelector("#dlsm-tiering").onclick = runIndiv;
document.querySelector("#dlsm-leveling").onclick = runIndiv;
document.querySelector("#osm-input-T").onchange = runIndiv
document.querySelector("#osm-input-T").onwheel = runIndiv;
document.querySelector("#osm-input-E").onchange = runIndiv;
document.querySelector("#osm-input-E").onwheel = runIndiv;
document.querySelector("#osm-input-N").onchange = runIndiv;
document.querySelector("#osm-input-N").onwheel = runIndiv;
document.querySelector("#osm-input-M").onchange = runIndiv;
document.querySelector("#osm-input-M").onwheel = runIndiv;
document.querySelector("#osm-tiering").onclick = runIndiv;
document.querySelector("#osm-leveling").onclick = runIndiv;



// function runVanillaLSM() {
//     var input_T = document.querySelector("#vlsm-input-T").value;
//     var input_E = document.querySelector("#vlsm-input-E").value;
//     var input_N = document.querySelector("#vlsm-input-N").value;
//     var input_M = document.querySelector("#vlsm-input-M").value;
//     var input = {T: input_T, E: input_E, N: input_N, M: input_M};

//     validate(this, "vlsm", input);

//     vlsm.T = document.querySelector("#vlsm-input-T").value;
//     vlsm.E = document.querySelector("#vlsm-input-E").value;
//     vlsm.N = document.querySelector("#vlsm-input-N").value;
//     vlsm.M = document.querySelector("#vlsm-input-M").value;

//     if (this.id === "vlsm-leveling") {
//         console.log("update leveling demo");
//         vlsm.MP = 0;
//     } else if (this.id === "vlsm-tiering") {
//         console.log("update tiering demo");
//         vlsm.MP = 1;
//     } else {
//         console.log("simply update");
//     }

//     vlsm.showBush();
// }

// function runRocksDBLSM() {
//     var input_T = document.querySelector("#rlsm-input-T").value;
//     var input_E = document.querySelector("#rlsm-input-E").value;
//     var input_N = document.querySelector("#rlsm-input-N").value;
//     var input_M = document.querySelector("#rlsm-input-M").value;
//     var input = {T: input_T, E: input_E, N: input_N, M: input_M};

//     validate(this, "rlsm", input);

//     rlsm.T = document.querySelector("#rlsm-input-T").value;
//     rlsm.E = document.querySelector("#rlsm-input-E").value;
//     rlsm.N = document.querySelector("#rlsm-input-N").value;
//     rlsm.M = document.querySelector("#rlsm-input-M").value;

//     if (this.id === "rlsm-leveling") {
//         console.log("update leveling demo");
//         rlsm.MP = 0;
//     } else if (this.id === "rlsm-tiering") {
//         console.log("update tiering demo");
//         rlsm.MP = 1;
//     } else {
//         console.log("simply update");
//     }

//     rlsm.showBush();
// }

// function runDostoevskyLSM() {
//     var input_T = document.querySelector("#dlsm-input-T").value;
//     var input_E = document.querySelector("#dlsm-input-E").value;
//     var input_N = document.querySelector("#dlsm-input-N").value;
//     var input_M = document.querySelector("#dlsm-input-M").value;
//     var input = {T: input_T, E: input_E, N: input_N, M: input_M};

//     validate(this, "dlsm", input);

//     dlsm.T = document.querySelector("#dlsm-input-T").value;
//     dlsm.E = document.querySelector("#dlsm-input-E").value;
//     dlsm.N = document.querySelector("#dlsm-input-N").value;
//     dlsm.M = document.querySelector("#dlsm-input-M").value;

//     if (this.id === "dlsm-leveling") {
//         console.log("update leveling demo");
//         dlsm.MP = 0;
//     } else if (this.id === "dlsm-tiering") {
//         console.log("update tiering demo");
//         dlsm.MP = 1;
//     } else {
//         console.log("simply update");
//     }

//     dlsm.showBush();
// }

// function runOSM() {
//     var input_T = document.querySelector("#osm-input-T").value;
//     var input_E = document.querySelector("#osm-input-E").value;
//     var input_N = document.querySelector("#osm-input-N").value;
//     var input_M = document.querySelector("#osm-input-M").value;
//     var input = {T: input_T, E: input_E, N: input_N, M: input_M};

//     validate(this, "osm", input);

//     osm.T = document.querySelector("#osm-input-T").value;
//     osm.E = document.querySelector("#osm-input-E").value;
//     osm.N = document.querySelector("#osm-input-N").value;
//     osm.M = document.querySelector("#osm-input-M").value;

//     if (this.id === "osm-leveling") {
//         console.log("update leveling demo");
//         osm.MP = 0;
//     } else if (this.id === "osm-tiering") {
//         console.log("update tiering demo");
//         osm.MP = 1;
//     } else {
//         console.log("simply update");
//     }

//     osm.showBush();
// }


});

