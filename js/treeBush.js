// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {
// N : number of entries
// L : number of Levels
// E : size of an entry(bytes)
// T : size ratio
// M : buffer capacity(MB);
// MP : Merge policy;
// prefix: configurate target{cmp: comparative analysis, indiv: inidividual analysis}
// suffix: result targets subclasses {vlsm, rlsm, dlsm, osm}
// preMP : previous state of merge policy before switching analysis mode
class LSM {
    constructor(prefix = "", suffix = "") {
        this._DEFAULT = {
            T: 2,
            E: 16,
            N: 1048576,
            M: 2,
            MP: 0
        };
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
        this._L = this._getL();     
    }

    get T() {return this._T;}
    get E() {return this._E;}
    get N() {return this._N;}
    get M() {return this._M;}
    get MP() {return this._MP;}
    get L() {return this._L;}
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
    set L(level) {
        this._L = level;
        return this._L;
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

    _isAllInBuffer() {
        var Mbytes = this.M * Math.pow(2, 20);
        var nEntry_M = Math.floor(Mbytes / this.E);     // number of entries fit into buffer
        return this.N <= nEntry_M;
    }

    _getL(entryNum = this.N) {
        // entryNum must > 0
        if (entryNum == 0) return 1;
        var L;
        var Mbytes = this.M * Math.pow(2, 20);
        var nEntry_M = Math.floor(Mbytes / this.E);     // number of entries fit into buffer
        var log = entryNum * (this.T - 1) / (nEntry_M * this.T) + 1;
        L = Math.ceil(getBaseLog(this.T, log));
        return (L < 1) ? 1 : L;
    }
 
    /* Having known the ith level,
     * Return #entires per run could contain at that level 
     * Computing based on the buffer capacity of #ENTRY
     */
    _getRunCapacity(ith) {
        var Mbytes = this.M * Math.pow(2, 20);   // convert to bytes
        var nEntry_M = Math.floor(Mbytes / this.E);
        var nEntry_L = nEntry_M * Math.pow(this.T, ith);
        if (this.MP && ith) return nEntry_L / this.T;
        else return nEntry_L;
    }

    _getLevelCapacity(ith) {
        var Mbytes = this.M * Math.pow(2, 20);   
        var nEntry_M = Math.floor(Mbytes / this.E);
        var nEntry_L = nEntry_M * Math.pow(this.T, ith);
        return nEntry_L;
    }
    _sumLevelsCapacity(levels) {
        var sum = 0;
        for (let i = 1; i <= levels; i++) {
            sum += this._getLevelCapacity(i);
        }
        return sum;
    }
    /* Based on the buffer capacity of #ENTRY,
     * compute the number of entries per run for jth run in ith level; 
     */
    _getEntryNum(ith, jth, run_capacity) {
        var Mbytes = this.M * Math.pow(2, 20);
        var cur_capacity = this._sumLevelsCapacity(ith);
        var li_capacity = this._getLevelCapacity(ith);
        var isLastLevel = this.N <= cur_capacity;
        if (isLastLevel) {
            var offset = this.N - cur_capacity + li_capacity;
            if(this.MP) {
                for (var j = 0; j < this.T; j++) {
                    if ((j + 1) * run_capacity >= offset) break;
                }
                if (jth > j) return 0;
                else if (jth < j) return run_capacity;
                else return offset - jth * run_capacity;
            } else {     // not reaching the last level
                return offset;
            }
        } else {
            return run_capacity;
        }     
    }

    /* Compute the number of entries in ith level;
     * Return a string to be displayed when triggering ToolTip  
     */
    _getTipText(ith, run_capacity, entry_num) {
        var text = "Level " + ith + ": This run contains " + entry_num + "/" + run_capacity + " entries";
        return text;
    }
    /* Calculate current amount and set the width of runs
     * Return a list of button objects 
     */
    _getBtns(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var run_capacity = 0;
        var context = "";
        var getWidth = function(i) {
            var coef = 1;  
            var base_width = 10;
            var client_width = elem.clientWidth - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
        };

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            button = createBtn(run_width);
            run_capacity = this._getRunCapacity(i);
            context = this._getTipText(i, run_capacity, 0);   // jth run = 0;
            setToolTip(button, "left", context);
            setRunGradient(button, 0);
            runs[i] = button;
        }
        return runs;
    }

    _getBtnGroups(elem, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_capacity = 0;
        var context = "";

        var getWidth = function(i) {
            // Return the width for each button in a btn-group regarding to tiering
            // if (level === 0) return elem.clientWidth + "px";
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var client_width = elem.clientWidth - 1;  // -1 to avoid stacking 
            var m = client_width / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            run_capacity = this._getRunCapacity(i);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    context = this._getTipText(i, run_capacity, 0);
                    setRunGradient(child, 0);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child); 
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }

    showBush() {
        var btn_list = [];
        var parent = document.querySelector(`#${this.suffix}-res`);
        if (this.MP) btn_list = this._getBtnGroups(parent, this.L, this.T);
        else btn_list = this._getBtns(parent, this.L, this.T);
        clear(parent);

        for (var i = 1; i <= this.L; i++) {
            var div_wrap = document.createElement("div");
            div_wrap.setAttribute("class", `row ${this.suffix}-result`);
            div_wrap.appendChild(btn_list[i]);
            parent.appendChild(div_wrap);
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
        this.L = this._getL();
    }

}


class VanillaLSM extends LSM{
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
    }

    _getEntryNum(n, run_capacity, jth) {
        var offset = n;
        if(this.MP) {
            for (var j = 0; j < this.T; j++) {
                if ((j + 1) * run_capacity >= offset) break;
            }
            if (jth > j) return 0;
            else if (jth < j) return run_capacity;
            else return offset - jth * run_capacity;
        } else {     // not reaching the last level
            return offset;
        }
    }

    /* Detect whether current level should be filled up
     * lth > 1
     * Return True, fill with current level capacity
     * Return False, fill with previous level capacity
     */
    _isFull(n, lth) {
        return n - super._sumLevelsCapacity(lth - 1) > (this.T - 1) * super._getLevelCapacity(lth - 1);
    }
    _getOffsetFactor(n, lth) {
        var offset = n - super._sumLevelsCapacity(lth - 1);
        var prev_capacity = super._getLevelCapacity(lth - 1);
        for (var i = 1; i <= this.T - 1; i++) {
            if (offset <= i * prev_capacity) {
                break;
            }
        }
        return i;
    }

    _renderLeveler(elem, n) {
        n = (n < 0) ? 0 : n;
        var l = super._getL(n);
        var l_capacity = super._getLevelCapacity(l);
        var context = "";
        var rate = 0;
        var entry_num = 0;
        if (l == 1) {
            // set n on l1
            entry_num = this._getEntryNum(n, l_capacity);
            rate = n / l_capacity;
            context = super._getTipText(l, l_capacity, entry_num);
            setToolTip(elem[l], "left", context);
            setRunGradient(elem[l], rate);
            return;
        }

        if (this._isFull(n, l)) {
            entry_num = l_capacity;
            rate = entry_num / l_capacity;
            context = super._getTipText(l, l_capacity, entry_num);
            n = n - l_capacity;
        } else {
            entry_num = this._getOffsetFactor(n, l) * super._getLevelCapacity(l - 1);
            rate = entry_num / l_capacity;
            context = super._getTipText(l, l_capacity, entry_num);
            n = n - entry_num;
        }
        setToolTip(elem[l], "left", context);
        setRunGradient(elem[l], rate);
        return this._renderLeveler(elem, n);
    }

    _renderTier(elem, n, max_runs) {
        n = (n < 0) ? 0 : n;
        var l = super._getL(n);
        var l_capacity = super._getLevelCapacity(l);
        var r_capacity = super._getRunCapacity(l);
        var context = "";
        var rate = 0;
        var entry_num = 0;
        if (l == 1) {
            // set n on l 1
            for (var j = 0; j < max_runs; j++) {
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                } else {
                    entry_num = this._getEntryNum(n, r_capacity, j);
                    rate = entry_num / r_capacity;
                    context = super._getTipText(l, r_capacity, entry_num);
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
                }
            }  
            return;
        }

        if (this._isFull(n, l)) {
            entry_num = r_capacity;
            rate = entry_num / r_capacity;
            context = super._getTipText(l, r_capacity, entry_num);
            for (var j = 0; j < max_runs; j++) {
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                } else {
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
                }
            }  
            n = n - l_capacity;
        } else {
            var factor = this._getOffsetFactor(n, l);
            var offset = factor * super._getLevelCapacity(l - 1);
            for (var j = 0; j < max_runs; j++) {
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                } else {
                    entry_num = this._getEntryNum(offset, r_capacity, j);
                    rate = entry_num / r_capacity;
                    context = super._getTipText(l, r_capacity, entry_num);
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
                }
            } 
            n = n - offset;
        }
        return this._renderTier(elem, n, max_runs);
    }

    _getBtns(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var run_capacity = 0;
        var context = "";

        var getWidth = function(i) {
            var coef = 1;  
            var base_width = 10;
            var client_width = elem.clientWidth - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
        };

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            button = createBtn(run_width);
            run_capacity = super._getRunCapacity(i);
            context = super._getTipText(i, run_capacity, 0);   // jth run = 0;
            setToolTip(button, "left", context);
            setRunGradient(button, 0);
            runs[i] = button;
        }
        this._renderLeveler(runs, this.N);
        return runs;
    }
    _getBtnGroups(elem, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_capacity = 0;
        var context = "";
    
    
        var getWidth = function(i) {
            if (level === 0) return elem.clientWidth + "px";
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var client_width = elem.clientWidth - 1;  // -1 to avoid stacking 
            var m = client_width / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            run_capacity = super._getRunCapacity(i);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    context = super._getTipText(i, run_capacity, 0);
                    setRunGradient(child, 0);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);
            }
            btn_groups[i] = group_wrap;
        }
        this._renderTier(btn_groups, this.N, max_runs);
        return btn_groups;
    }
}

class RocksDBLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
    }
    _getBtns(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var run_capacity = 0;
        var context = "";
        var entry_num = 0;
        var rate = 0;
        var getWidth = function(i) {
            var coef = 1;  
            var base_width = 10;
            var client_width = elem.clientWidth - 1;  // -1 to avoid stacking
            var m = client_width / Math.pow(ratio, level);   // level0 actual width;
            if (m < base_width) {
                coef = Math.pow(client_width / base_width, 1 / level) / ratio;
                m  = base_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
        };

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            button = createBtn(run_width);
            run_capacity = super._getRunCapacity(i);
            entry_num = super._getEntryNum(i, 0, run_capacity);
            rate = correctDecimal(entry_num / run_capacity);
            context = super._getTipText(i, run_capacity, entry_num);
            setToolTip(button, "left", context);
            setRunGradient(button, rate);
            runs[i] = button;
        }
        return runs;
    }

    _getBtnGroups(elem, level, ratio) {
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_capacity = 0;
        var context = "";
        var entry_num = 0;
        var rate = 0;

        var getWidth = function(i) {
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var client_width = elem.clientWidth - 1;  // -1 to avoid stacking 
            var m = client_width / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            run_capacity = super._getRunCapacity(i);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    entry_num = super._getEntryNum(i, j, run_capacity);
                    rate = correctDecimal(entry_num / run_capacity);
                    context = super._getTipText(i, run_capacity, entry_num);
                    setRunGradient(child, rate);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child); 
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }


}

class DostoevskyLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
        this._MP = 1;
        this._DEFAULT.MP = 1;
        this._preMP = 1;
    }

    _getRunCapacity(ith, level) {
        var Mbytes = this.M * Math.pow(2, 20);   // convert to bytes
        var nEntry_M = Math.floor(Mbytes / this.E);
        var nEntry_L = nEntry_M * Math.pow(this.T, ith);
        if (ith === 0 || ith === level ) return nEntry_L;
        else return nEntry_L / this.T;
    }

    _getBtnGroups(elem, level, ratio) {
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_capacity = 0;
        var context = "";
        var entry_num = 0;
        var rate = 0;

        var getWidth = function(i) {
            // @Customized for lazy leveling 
            if (level === i ) return elem.clientWidth + "px";    //@Custom
            var base_width = 10;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin; 
            var coef = 1;
            var client_width = elem.clientWidth - 1;  
            var m = client_width / Math.pow(max_runs, level - 1);
            if (m < l1_width) {
                coef = Math.pow(client_width / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        for (var i = 1; i <= level; i++) {
            run_width = getWidth(i);
            group_wrap = document.createElement("div");
            run_capacity = this._getRunCapacity(i, level);
            group_wrap.setAttribute("class", "lsm-btn-group");
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    var context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    entry_num = super._getEntryNum(i, j, run_capacity);
                    rate = correctDecimal(entry_num / run_capacity);
                    context = super._getTipText(i, run_capacity, entry_num);
                    setRunGradient(child, rate);

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
                var tmpMP = obj.MP;
                obj.MP = obj.preMP;
                obj.preMP = tmpMP;
                obj.update("cmp");
                obj.showBush();
            }
        } else {    // ... update(indiv)
            for (var key in window.obj) {
                var obj = window.obj[key];
                var tmpMP = obj.MP;
                obj.MP = obj.preMP;
                obj.preMP = tmpMP;
                obj.update(key);
                obj.showBush();
            }
        }
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


    switch (this.id) {
        case "cmp-vlsm-leveling": 
            vlsm.update(target, 0);
            vlsm.showBush();
            break;
        case "cmp-vlsm-tiering":
            vlsm.update(target, 1);
            vlsm.showBush();
            break;
        case "cmp-rlsm-leveling": 
            rlsm.update(target, 0);
            rlsm.showBush();
            break;
        case "cmp-rlsm-tiering": 
            rlsm.update(target, 1);
            rlsm.showBush();
            break;
        // case "cmp-dlsm-lazyLevel":   // currently untriggered by event, unchanged merge policy
        //     dlsm.update(target, 1);
        //     dlsm.showBush();
        //     break;
        case "cmp-osm-leveling": 
            osm.update(target, 0);
            osm.showBush();
            break;
        case "cmp-osm-tiering": 
            osm.update(target, 1);
            osm.showBush();
            break;
        case "cmp-leveling":
            console.log("update all to leveling");
            vlsm.update(target, 0);
            rlsm.update(target, 0);
            // dlsm.update(target, 1);     // currently untriggered by event, unchanged merge policy
            osm.update(target, 0);
            vlsm.showBush();
            rlsm.showBush();
            dlsm.showBush();
            osm.showBush();
            break;
        case "cmp-tiering":
            console.log("update all to tiering");
            vlsm.update(target, 1);
            rlsm.update(target, 1);
            // dlsm.update(target, 1);     // currently untriggered by event, unchanged merge policy
            osm.update(target, 1);
            vlsm.showBush();
            rlsm.showBush();
            dlsm.showBush();
            osm.showBush();
            break;
        default:
            console.log("simply update all");
            vlsm.update(target);
            rlsm.update(target);
            dlsm.update(target);
            osm.update(target);
            vlsm.showBush();
            rlsm.showBush();
            dlsm.showBush();
            osm.showBush();
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
        case `${target}-vlsm-tiering`:
        case `${target}-vlsm-leveling`:
        case `${target}-rlsm-tiering`:
        case `${target}-rlsm-leveling`:
        // case `${target}-dlsm-lazyLevel`: // currently untriggered by event, unchanged merge policy
        case `${target}-osm-tiering`:
        case `${target}-osm-leveling`:
            break;
        default:
            console.log(self.id);
            alert(`Invalid: Unknown ${target} configuration input`);
    }
    return;
}





//Common Methods

/* FIXED precision of decimal eg. 0.1 + 0.2 = 0.3000000000000004
 * by rounding to a fixed number of decimal places of 15
 */
function correctDecimal(number) {
    return parseFloat(number.toPrecision(15));
}

function getBaseLog(x, y) {
    if (isNaN(x) || isNaN(y)) throw new TypeError("x: " + x +", y: " + y + " must be numbers");
    if (!(x > 0 && y > 0)) {
        throw new RangeError("x: " + x +", y: " + y + " both must > 0");
    } else {
        return correctDecimal(Math.log(y) / Math.log(x));
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

function setRunGradient(elem, rate) {
    var color1 = "#95a5a6";
    var color2 = "#fff";
    var rate1 = rate;
    var rate2 = 1 - rate;
    if (rate === 0) {
        rate1 = 0;
        rate2 = 0;
    }
    var prev_style = elem.getAttribute("style");
    elem.setAttribute("style", prev_style + `; background:linear-gradient(to right, ${color1} ${rate1*100}%, 0, ${color2} ${(rate2)*100}%)`);
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
// Comparative LSM analysis event trigger
document.querySelector("#cmp-input-T").onchange = runCmp;
document.querySelector("#cmp-input-T").onwheel = runCmp;
document.querySelector("#cmp-input-E").onchange = runCmp;
document.querySelector("#cmp-input-E").onwheel = runCmp;
document.querySelector("#cmp-input-N").onchange = runCmp;
document.querySelector("#cmp-input-N").onwheel = runCmp;
document.querySelector("#cmp-input-M").onchange = runCmp;
document.querySelector("#cmp-input-M").onwheel = runCmp;
document.querySelector("#cmp-leveling").onclick = runCmp;
document.querySelector("#cmp-tiering").onclick = runCmp;
document.querySelector("#cmp-vlsm-leveling").onclick = runCmp;
document.querySelector("#cmp-vlsm-tiering").onclick = runCmp;
document.querySelector("#cmp-rlsm-leveling").onclick = runCmp;
document.querySelector("#cmp-rlsm-tiering").onclick = runCmp;
document.querySelector("#cmp-osm-leveling").onclick = runCmp;
document.querySelector("#cmp-osm-tiering").onclick = runCmp;
// Individual LSM analysis event trigger
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


});

