// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {
// N : number of entries
// L : number of Levels
// E : size of an entry(bytes)
// T : size ratio
// M : buffer capacity(MB);
// Mbf: memory allocated to bloomFilters
// Mf : memory allocated to FencePointers
// MP : Merge policy;
// F : file size in terms of buffer
// P : page size;
// B : page size in #entries
// s : selectivity of a range lookup
// mu(μ): storage sequential over random access speed
// phi(Φ) : storage write over read speed
// prefix: configurate target{cmp: comparative analysis, indiv: inidividual analysis}\
// K, Z: tunning parameters
// suffix: result targets subclasses {vlsm, rlsm, dlsm, osm}
// preMP : previous state of merge policy before switching analysis mode
class LSM {
    constructor(prefix = "", suffix = "") {
        this._DEFAULT = {
            T: 2,
            E: 16,
            N: 1048576,
            P: 128,
            M: 2097152, //2MB
            Mbf: 1024,
            Mf: 0,
            MP: 0,
            f: 1,
            s: 0.5,
            mu: 1,
            phi: 1,
        };
        this.MP = this.DEFAULT.MP;
        this.prefix = prefix;
        this.suffix = suffix;
        this.preMP = this.MP;

        if(prefix) {
            this.T = document.querySelector(`#${prefix}-input-T`).value;
            this.E = convertToBytes(`#${prefix}-select-E`, document.querySelector(`#${prefix}-input-E`).value);
            this.N = document.querySelector(`#${prefix}-input-N`).value;
            this.M = convertToBytes(`#${prefix}-select-M`, document.querySelector(`#${prefix}-input-M`).value);
            this.f = document.querySelector(`#${prefix}-input-f`).value;
            this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
            this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
            this.s = document.querySelector(`#${prefix}-input-s`).value;
            this.mu = document.querySelector(`#${prefix}-input-mu`).value;
            this.phi = document.querySelector(`#${prefix}-input-phi`).value;
        } else {
            this.T = this._DEFAULT.T;
            this.E = this._DEFAULT.E;
            this.N = this._DEFAULT.N;
            this.M = this._DEFAULT.M;
            this.f = this._DEFAULT.f;
            this.P = this.DEFAULT.P;
            this.Mbf = this.DEFAULT.Mbf;
            this.s = this.DEFAULT.s;
            this.mu = this.DEFAULT.mu;
            this.phi = this.DEFAULT.phi;
        }
        this.L = this._getL();     
    }

    get T() {return this._T;}
    get E() {return this._E;}
    get N() {return this._N;}
    get M() {return this._M;}
    get Mbf() {return this._Mbf;}
    get P() {return this._P;}
    get B() {return Math.floor(correctDecimal(this.P/this.E));} //B = 8
    get MP() {return this._MP;}
    get L() {return this._L;}
    get f() {return this._f;}
    get s() {return this._s;}
    get mu() {return this._mu;}
    get phi() {return this._phi;}
    get K(){
        if(this.MP || this.name === "DostoevskyLSM") return parseInt(this.T);
        else return 1;
    }
    get Z() {
        if (!this.MP || this.name === "DostoevskyLSM") return 1;
        else return this.T
    }
    get prefix() {return this._prefix;}
    get suffix() {return this._suffix;}
    get preMP() {return this._preMP;}
    get DEFAULT() {return this._DEFAULT;}
    get name() { return this.__proto__.constructor.name;}
    set T(ratio) {
        this._T = parseInt(ratio);
        return this._T;
    }
    set E(entrySize) {
        this._E = parseFloat(entrySize);
        return this._E;
    }
    set N(entryNum) {
        this._N = parseFloat(entryNum);
        return this._N;
    }
    set M(bufferSize) {
        this._M = parseFloat(bufferSize);
        return this._M;
    }
    set Mbf(filterSize) {
        this._Mbf = parseFloat(filterSize);
        return this._Mbf;
    }
    set P(pageSize) {
        this._P = parseFloat(pageSize);
        return this._P;
    }
    set MP(mergePolicy) {
        this._MP = parseInt(mergePolicy);
        return this._MP;
    }
    set f(fileSize) {
        this._f = parseFloat(fileSize);
        return this._f;
    }
    set L(level) {
        this._L = parseInt(level);
        return this._L;
    }
    set s(selectivity) {
        this._s = parseFloat(selectivity/100);
        return this._s;
    }
    set mu(constant) {
        this._mu = parseFloat(constant);
        return this._s;
    }
    set phi(constant) {
        this._phi = parseFloat(constant);
        return this._phi;
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
        this._preMP = parseInt(mergePolicy);
        return this._preMP;
    }
    set DEFAULT(defaultObj) {
        this._DEFAULT = defaultObj;
        return this._DEFAULT;
    }

    _isAllInBuffer() {
        var nEntry_M = Math.floor(this.M / this.E);     // number of entries fit into buffer
        return this.N <= nEntry_M;
    }

    _getL(entryNum = this.N) {
        // entryNum must > 0
        if (entryNum == 0) return 1;
        var L;
        var nEntry_M = Math.floor(this.M / this.E);     // number of entries fit into buffer
        var log = entryNum * (this.T - 1) / (nEntry_M * this.T) + 1;
        L = Math.ceil(getBaseLog(this.T, log));
        return (L < 1) ? 1 : L;
    }
    _getFileCapacity() {
        // in terms of #entries
        var nEntry_M = Math.floor(this.M / this.E);     // number of entries fit into buffer
        return Math.floor(correctDecimal(nEntry_M * this.f));
    }
 
    /* Having known the ith level,
     * Return #entires per run could contain at that level 
     * Computing based on the buffer capacity of #ENTRY
     */
    _getRunCapacity(ith) {
        var nEntry_M = Math.floor(this.M / this.E);
        var nEntry_L = nEntry_M * Math.pow(this.T, ith);
        if (this.MP && ith) return nEntry_L / this.T;
        else return nEntry_L;
    }

    _getLevelCapacity(ith) {
        var nEntry_M = Math.floor(this.M / this.E);
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
    _getTipText(ith, run_capacity, entry_num, file_num) {
        var text = "";
        if (this.MP) {
            text =  "Level " + ith + ": This run contains " + entry_num + "/" + run_capacity + " entries in " + file_num + " files";
        } else {
             text = "Level " + ith + ": contains " + entry_num + "/" + run_capacity + " entries in " + file_num + " files";
        }
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
            context = this._getTipText(i, run_capacity, 0, 0);   // jth run = 0;
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
                    context = this._getTipText(i, run_capacity, 0, 0);
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
        var parent = document.querySelector(`#${this.suffix}-bush`);
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
        this.MP = mergePolicy;
        this.T = document.querySelector(`#${this.prefix}-input-T`).value;
        this.E = convertToBytes(`#${this.prefix}-select-E`, document.querySelector(`#${this.prefix}-input-E`).value);
        this.N = document.querySelector(`#${this.prefix}-input-N`).value;
        this.M = convertToBytes(`#${this.prefix}-select-M`, document.querySelector(`#${this.prefix}-input-M`).value);
        this.f = document.querySelector(`#${this.prefix}-input-f`).value;
        this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
        this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
        this.s = document.querySelector(`#${prefix}-input-s`).value;
        this.mu = document.querySelector(`#${prefix}-input-mu`).value;
        this.phi = document.querySelector(`#${prefix}-input-phi`).value;
        this.L = this._getL();
        // set the range of input F
        if (this.MP) document.querySelector(`#${this.prefix}-input-f`).max = "1";
        else document.querySelector(`#${this.prefix}-input-f`).max = "" + this.T;

        this._updateCostResult();
    }
    _updateCostResult() {
        document.querySelector(`#${this.suffix}-W-cost`).textContent = roundTo(this._getUpdateCost(), 4) + " I/O";
        document.querySelector(`#${this.suffix}-R-cost`).textContent = roundTo(this._getZeroPointLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-V-cost`).textContent = roundTo(this._getExistPointLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-sQ-cost`).textContent = roundTo(this._getShortRangeLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-lQ-cost`).textContent = roundTo(this._getLongRangeLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-sAMP-cost`).textContent = roundTo(this._getSpaceAmpCost(), 4);
    }

    _getUpdateCost() {
        // W
        var f1 = this.phi/(this.mu*this.B);
        var f2 = (this.T-1)/(this.K+1) * (this.L-1) + (this.T-1)/(this.Z+1);
        return f1*f2;
    }
    _getZeroPointLookUpCost() {
        //R
        var f1 = Math.exp(-(this.Mbf/this.N)*Math.pow(Math.log(2), 2));
        var f2 = Math.pow(this.Z, (this.T-1)/this.T);
        var f3 = Math.pow(this.K, 1/this.T);
        var f4 = Math.pow(this.T, this.T/(this.T-1)) / (this.T-1)
        return f1*f2*f3*f4;
    }
    _getExistPointLookUpCost()  {
        //V = 1 + R - R/Z * (T-1)/T
        var R = this._getZeroPointLookUpCost();
        return 1 + R - (R/this.Z) * (this.T-1)/this.T;
    }
    _getShortRangeLookUpCost(){
        //sQ
        return this.Z + this.K * (this.L-1);
    }
    _getLongRangeLookUpCost(){
        //lQ
        var f1 = this._getShortRangeLookUpCost();
        var f2 = (1/this.mu) * (this.s/this.B) * (this.Z + 1/this.T);
        return f1 + f2;
    }
    _getSpaceAmpCost() {
        //sAMP
        return this.Z - 1 + 1/this.T;
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
            var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
            context = super._getTipText(l, l_capacity, entry_num, file_num);
            setToolTip(elem[l], "left", context);
            setRunGradient(elem[l], rate);
            return;
        }

        if (this._isFull(n, l)) {
            entry_num = l_capacity;
            rate = entry_num / l_capacity;
            var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
            context = super._getTipText(l, l_capacity, entry_num, file_num);
            n = n - l_capacity;
        } else {
            entry_num = this._getOffsetFactor(n, l) * super._getLevelCapacity(l - 1);
            rate = entry_num / l_capacity;
            var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
            context = super._getTipText(l, l_capacity, entry_num, file_num);
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
                    var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
                    context = super._getTipText(l, r_capacity, entry_num, file_num);
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
                }
            }  
            return;
        }

        if (this._isFull(n, l)) {
            entry_num = r_capacity;
            rate = entry_num / r_capacity;
            var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
            context = super._getTipText(l, r_capacity, entry_num, file_num);
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
                    var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
                    context = super._getTipText(l, r_capacity, entry_num, file_num);
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
            context = super._getTipText(i, run_capacity, 0, 0);   // jth run = 0;
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
                    context = super._getTipText(i, run_capacity, 0, 0);
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
            var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
            context = super._getTipText(i, run_capacity, entry_num, file_num);
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
                    var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
                    context = super._getTipText(i, run_capacity, entry_num, file_num);
                    setRunGradient(child, rate);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child); 
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;
    }

    /* update current state */
    update(prefix, mergePolicy = this.MP) {
        this.prefix = prefix;
        this.MP = mergePolicy;
        this.T = document.querySelector(`#${this.prefix}-input-T`).value;
        this.E = convertToBytes(`#${this.prefix}-select-E`, document.querySelector(`#${this.prefix}-input-E`).value);
        this.N = document.querySelector(`#${this.prefix}-input-N`).value;
        this.M = convertToBytes(`#${this.prefix}-select-M`, document.querySelector(`#${this.prefix}-input-M`).value);
        this.f = document.querySelector(`#${this.prefix}-input-f`).value;
        this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
        this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
        this.s = document.querySelector(`#${prefix}-input-s`).value;
        this.mu = document.querySelector(`#${prefix}-input-mu`).value;
        this.phi = document.querySelector(`#${prefix}-input-phi`).value;
        this.L = this._getL();
        // set the range of input F
        if (this.MP) document.querySelector(`#${this.prefix}-input-f`).max = "1";
        else document.querySelector(`#${this.prefix}-input-f`).max = "" + this.T;
        this._updateCostEquation();
        super._updateCostResult();
    }

    _updateCostEquation() {
        var W = "";
        var R = "";
        var V = "";
        var sQ = "";
        var lQ = "";
        var sAMP = "";
        if (this.MP) {
            W = "$$O({L \\over B})$$";
            R = "$$O(e^{-{M/N}} \\cdot T)$$";
            V = "$$O(1+e^{-{M/N}} \\cdot T)$$";
            sQ = "$$O(L \\cdot T)$$";
            lQ = "$$O({{T \\cdot s} \\over B})$$";
            sAMP = "$$O(T)$$";

        } else {
            W = "$$O({ L \\cdot T \\over B})$$";
            R = "$$O(e^{-{M/N}})$$";
            V = "$$O(1)$$";
            sQ = "$$O(L)$$";
            lQ = "$$O({s \\over B})$$";
            sAMP = "$$O({1 \\over T})$$";
        }
        document.querySelector("#rlsm-W-cost").setAttribute("title", W);
        document.querySelector("#rlsm-R-cost").setAttribute("title", R);
        document.querySelector("#rlsm-V-cost").setAttribute("title", V);
        document.querySelector("#rlsm-sQ-cost").setAttribute("title", sQ);
        document.querySelector("#rlsm-lQ-cost").setAttribute("title", lQ);
        document.querySelector("#rlsm-sAMP-cost").setAttribute("title", sAMP);
        document.querySelector("#rlsm-W-cost").setAttribute("data-original-title", W);
        document.querySelector("#rlsm-R-cost").setAttribute("data-original-title", R);
        document.querySelector("#rlsm-V-cost").setAttribute("data-original-title", V);
        document.querySelector("#rlsm-sQ-cost").setAttribute("data-original-title", sQ);
        document.querySelector("#rlsm-lQ-cost").setAttribute("data-original-title", lQ);
        document.querySelector("#rlsm-sAMP-cost").setAttribute("data-original-title", sAMP);
    }
}

class DostoevskyLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
        this.MP = 1;
        this.DEFAULT.MP = 1;
        this.preMP = 1;
    }

    _getRunCapacity(ith, level) {
        var nEntry_M = Math.floor(this.M / this.E);
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
                    var file_num = Math.ceil(correctDecimal(entry_num / super._getFileCapacity()));
                    context = super._getTipText(i, run_capacity, entry_num, file_num);
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

    update(prefix, mergePolicy = this.MP) {
        this.prefix = prefix;
        this.MP = mergePolicy;
        this.T = document.querySelector(`#${this.prefix}-input-T`).value;
        this.E = convertToBytes(`#${this.prefix}-select-E`, document.querySelector(`#${this.prefix}-input-E`).value);
        this.N = document.querySelector(`#${this.prefix}-input-N`).value;
        this.M = convertToBytes(`#${this.prefix}-select-M`, document.querySelector(`#${this.prefix}-input-M`).value);
        this.f = document.querySelector(`#${this.prefix}-input-f`).value;
        this.P = convertToBytes(`#${prefix}-select-P`, document.querySelector(`#${prefix}-input-P`).value);
        this.Mbf = convertToBytes(`#${prefix}-select-Mbf`, document.querySelector(`#${prefix}-input-Mbf`).value);
        this.s = document.querySelector(`#${prefix}-input-s`).value;
        this.mu = document.querySelector(`#${prefix}-input-mu`).value;
        this.phi = document.querySelector(`#${prefix}-input-phi`).value;
        this.L = this._getL();
        // set the range of input F
        if (this.MP) document.querySelector(`#${this.prefix}-input-f`).max = "1";
        else document.querySelector(`#${this.prefix}-input-f`).max = "" + this.T;

        this._updateCostResult();
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
    window.vlsm.update("cmp");
    window.rlsm.update("cmp");
    window.dlsm.update("cmp");
    window.osm.update("cmp");
    window.vlsm.showBush();
    window.rlsm.showBush();
    window.dlsm.showBush();
    window.osm.showBush();
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
    var input_E = convertToBytes("#cmp-select-E", document.querySelector("#cmp-input-E").value);
    var input_N = document.querySelector("#cmp-input-N").value;
    var input_M = convertToBytes("#cmp-select-M", document.querySelector("#cmp-input-M").value);
    var input_f = document.querySelector("#cmp-input-f").value;
    var input_P = convertToBytes("#cmp-select-P", document.querySelector("#cmp-input-P").value);
    var input_Mbf = convertToBytes("#cmp-select-Mbf", document.querySelector("#cmp-select-Mbf").value);
    var input_s = document.querySelector("#cmp-input-s").value;
    var input_mu = document.querySelector("#cmp-input-mu").value;
    var input_phi = document.querySelector("#cmp-input-phi").value;


    var input = {T: input_T, E: input_E, N: input_N, M: input_M, f: input_f, P: input_P, Mbf: input_Mbf, s: input_s, mu: input_mu, phi: input_phi};
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
            // osm.update(target, 1);
            vlsm.showBush();
            rlsm.showBush();
            dlsm.showBush();
            // osm.showBush();
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
    var input_E = convertToBytes(`#${target}-select-E`, document.querySelector(`#${target}-input-E`).value);
    var input_N = document.querySelector(`#${target}-input-N`).value;
    var input_M = convertToBytes(`#${target}-select-M`, document.querySelector(`#${target}-input-M`).value);
    var input_f = document.querySelector(`#${target}-input-f`).value;
    var input_P = convertToBytes(`#${target}-select-P`, document.querySelector(`#${target}-input-P`).value);
    var input_Mbf = convertToBytes(`#${target}-select-Mbf`, document.querySelector(`#${target}-input-Mbf`).value);
    var input_s = document.querySelector(`#${target}-input-s`).value;
    var input_mu = document.querySelector(`#${target}-input-mu`).value;
    var input_phi = document.querySelector(`#${target}-input-phi`).value;
    var input = {T: input_T, E: input_E, N: input_N, M: input_M, f: input_f, P: input_P, Mbf: input_Mbf, s: input_s, mu: input_mu, phi: input_phi};
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
        case `${target}-input-f`:
            var min = 0;
            var max = parseInt(document.querySelector(`#${target}-input-f`).max);
            if (input.F <= min || input.F > max) document.querySelector(`#${target}-input-f`).value = 1;
            break;
        case `${target}-input-P`:  //TODO
        case `${target}-input-Mbf`:  //TODO
        case `${target}-input-s`:  //TODO
        case `${target}-input-mu`:  //TODO
        case `${target}-input-phi`:  //TODO
        case `${target}-select-T`:
        case `${target}-select-N`:
        case `${target}-select-E`:
        case `${target}-select-M`:
        case `${target}-select-f`:
        case `${target}-tiering`:
        case `${target}-leveling`:
        case `${target}-vlsm-tiering`:
        case `${target}-vlsm-leveling`:
        case `${target}-rlsm-tiering`:
        case `${target}-rlsm-leveling`:
        // case `${target}-dlsm-lazyLevel`: // currently untriggered by event, unchanged merge policy
        // case `${target}-osm-tiering`:
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

function roundTo(number, digits) {
    return parseFloat(number.toFixed(digits));
}

function convertToBytes(target, input) {
    var selector = document.querySelector(target);
    var value = selector[selector.selectedIndex].value;
    switch (value) {
        case "0":  //B
            return input;
        case "1":  //KB
            return input * Math.pow(2, 10);
        case "2":  //MB
            return input * Math.pow(2, 20);
        case "3":  //GB
            return input * Math.pow(2, 30);
        default:
        console.log(value);
        alert(`Invalid: Unknown value of unit in ${target}`);
    }

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
// function checkF(target) {
//     var input_f = document.querySelector(`#${target}-input-f`).value;
//     var obj = window.obj[target]; 
// }


 
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
document.querySelector("#cmp-input-f").onchange = runCmp;
document.querySelector("#cmp-input-f").onwheel = runCmp;
document.querySelector("#cmp-input-P").onchange = runCmp;
document.querySelector("#cmp-input-P").onwheel = runCmp;
document.querySelector("#cmp-input-Mbf").onchange = runCmp;
document.querySelector("#cmp-input-Mbf").onwheel = runCmp;
document.querySelector("#cmp-input-s").onchange = runCmp;
document.querySelector("#cmp-input-s").onwheel = runCmp;
document.querySelector("#cmp-input-mu").onchange = runCmp;
document.querySelector("#cmp-input-mu").onwheel = runCmp;
document.querySelector("#cmp-input-phi").onchange = runCmp;
document.querySelector("#cmp-input-phi").onwheel = runCmp;
document.querySelector("#cmp-leveling").onclick = runCmp;
document.querySelector("#cmp-tiering").onclick = runCmp;
document.querySelector("#cmp-vlsm-leveling").onclick = runCmp;
document.querySelector("#cmp-vlsm-tiering").onclick = runCmp;
document.querySelector("#cmp-rlsm-leveling").onclick = runCmp;
document.querySelector("#cmp-rlsm-tiering").onclick = runCmp;
document.querySelector("#cmp-osm-leveling").onclick = runCmp;
document.querySelector("#cmp-select-M").onchange = runCmp;
document.querySelector("#cmp-select-E").onchange = runCmp;
document.querySelector("#cmp-select-P").onchange = runCmp;
document.querySelector("#cmp-select-Mbf").onchange = runCmp;
// document.querySelector("#cmp-osm-tiering").onclick = runCmp;
// Individual LSM analysis event trigger
document.querySelector("#vlsm-input-T").onchange = runIndiv;
document.querySelector("#vlsm-input-T").onwheel = runIndiv;
document.querySelector("#vlsm-input-E").onchange = runIndiv;
document.querySelector("#vlsm-input-E").onwheel = runIndiv;
document.querySelector("#vlsm-input-N").onchange = runIndiv;
document.querySelector("#vlsm-input-N").onwheel = runIndiv;
document.querySelector("#vlsm-input-M").onchange = runIndiv;
document.querySelector("#vlsm-input-M").onwheel = runIndiv;
document.querySelector("#vlsm-input-f").onchange = runIndiv;
document.querySelector("#vlsm-input-f").onwheel = runIndiv;
document.querySelector("#vlsm-input-P").onchange = runIndiv;
document.querySelector("#vlsm-input-P").onwheel = runIndiv;
document.querySelector("#vlsm-input-Mbf").onchange = runIndiv;
document.querySelector("#vlsm-input-Mbf").onwheel = runIndiv;
document.querySelector("#vlsm-input-s").onchange = runIndiv;
document.querySelector("#vlsm-input-s").onwheel = runIndiv;
document.querySelector("#vlsm-input-mu").onchange = runIndiv;
document.querySelector("#vlsm-input-mu").onwheel = runIndiv;
document.querySelector("#vlsm-input-phi").onchange = runIndiv;
document.querySelector("#vlsm-input-phi").onwheel = runIndiv;
document.querySelector("#vlsm-tiering").onclick = runIndiv;
document.querySelector("#vlsm-leveling").onclick = runIndiv;
document.querySelector("#vlsm-select-M").onchange = runIndiv;
document.querySelector("#vlsm-select-E").onchange = runIndiv;
document.querySelector("#vlsm-select-P").onchange = runIndiv;
document.querySelector("#vlsm-select-Mbf").onchange = runIndiv;
document.querySelector("#rlsm-input-T").onchange = runIndiv
document.querySelector("#rlsm-input-T").onwheel = runIndiv;
document.querySelector("#rlsm-input-E").onchange = runIndiv;
document.querySelector("#rlsm-input-E").onwheel = runIndiv;
document.querySelector("#rlsm-input-N").onchange = runIndiv;
document.querySelector("#rlsm-input-N").onwheel = runIndiv;
document.querySelector("#rlsm-input-M").onchange = runIndiv;
document.querySelector("#rlsm-input-M").onwheel = runIndiv;
document.querySelector("#rlsm-input-f").onchange = runIndiv;
document.querySelector("#rlsm-input-f").onwheel = runIndiv;
document.querySelector("#rlsm-input-P").onchange = runIndiv;
document.querySelector("#rlsm-input-P").onwheel = runIndiv;
document.querySelector("#rlsm-input-Mbf").onchange = runIndiv;
document.querySelector("#rlsm-input-Mbf").onwheel = runIndiv;
document.querySelector("#rlsm-input-s").onchange = runIndiv;
document.querySelector("#rlsm-input-s").onwheel = runIndiv;
document.querySelector("#rlsm-input-mu").onchange = runIndiv;
document.querySelector("#rlsm-input-mu").onwheel = runIndiv;
document.querySelector("#rlsm-input-phi").onchange = runIndiv;
document.querySelector("#rlsm-input-phi").onwheel = runIndiv;
document.querySelector("#rlsm-tiering").onclick = runIndiv;
document.querySelector("#rlsm-leveling").onclick = runIndiv;
document.querySelector("#rlsm-select-M").onchange = runIndiv;
document.querySelector("#rlsm-select-E").onchange = runIndiv;
document.querySelector("#rlsm-select-P").onchange = runIndiv;
document.querySelector("#rlsm-select-Mbf").onchange = runIndiv;
document.querySelector("#dlsm-input-T").onchange = runIndiv
document.querySelector("#dlsm-input-T").onwheel = runIndiv;
document.querySelector("#dlsm-input-E").onchange = runIndiv;
document.querySelector("#dlsm-input-E").onwheel = runIndiv;
document.querySelector("#dlsm-input-N").onchange = runIndiv;
document.querySelector("#dlsm-input-N").onwheel = runIndiv;
document.querySelector("#dlsm-input-M").onchange = runIndiv;
document.querySelector("#dlsm-input-M").onwheel = runIndiv;
document.querySelector("#dlsm-input-f").onchange = runIndiv;
document.querySelector("#dlsm-input-f").onwheel = runIndiv;
document.querySelector("#dlsm-input-P").onchange = runIndiv;
document.querySelector("#dlsm-input-P").onwheel = runIndiv;
document.querySelector("#dlsm-input-Mbf").onchange = runIndiv;
document.querySelector("#dlsm-input-Mbf").onwheel = runIndiv;
document.querySelector("#dlsm-input-s").onchange = runIndiv;
document.querySelector("#dlsm-input-s").onwheel = runIndiv;
document.querySelector("#dlsm-input-mu").onchange = runIndiv;
document.querySelector("#dlsm-input-mu").onwheel = runIndiv;
document.querySelector("#dlsm-input-phi").onchange = runIndiv;
document.querySelector("#dlsm-input-phi").onwheel = runIndiv;
document.querySelector("#dlsm-select-M").onchange = runIndiv;
document.querySelector("#dlsm-select-E").onchange = runIndiv;
document.querySelector("#dlsm-select-P").onchange = runIndiv;
document.querySelector("#dlsm-select-Mbf").onchange = runIndiv;
document.querySelector("#osm-input-T").onchange = runIndiv
document.querySelector("#osm-input-T").onwheel = runIndiv;
document.querySelector("#osm-input-E").onchange = runIndiv;
document.querySelector("#osm-input-E").onwheel = runIndiv;
document.querySelector("#osm-input-N").onchange = runIndiv;
document.querySelector("#osm-input-N").onwheel = runIndiv;
document.querySelector("#osm-input-M").onchange = runIndiv;
document.querySelector("#osm-input-M").onwheel = runIndiv;
document.querySelector("#osm-input-f").onchange = runIndiv;
document.querySelector("#osm-input-f").onwheel = runIndiv;
document.querySelector("#osm-input-P").onchange = runIndiv;
document.querySelector("#osm-input-P").onwheel = runIndiv;
document.querySelector("#osm-input-Mbf").onchange = runIndiv;
document.querySelector("#osm-input-Mbf").onwheel = runIndiv;
document.querySelector("#osm-input-s").onchange = runIndiv;
document.querySelector("#osm-input-s").onwheel = runIndiv;
document.querySelector("#osm-input-mu").onchange = runIndiv;
document.querySelector("#osm-input-mu").onwheel = runIndiv;
document.querySelector("#osm-input-phi").onchange = runIndiv;
document.querySelector("#osm-input-phi").onwheel = runIndiv;
// document.querySelector("#osm-tiering").onclick = runIndiv;
document.querySelector("#osm-leveling").onclick = runIndiv;
document.querySelector("#osm-select-M").onchange = runIndiv;
document.querySelector("#osm-select-E").onchange = runIndiv;
document.querySelector("#osm-select-P").onchange = runIndiv;
document.querySelector("#osm-select-Mbf").onchange = runIndiv;


});

