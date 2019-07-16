// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {
// N: number of entries
// L: number of Levels
// E: size of an entry(bytes)
// T: size ratio
// M: actual buffer capacity(MB);
// Mbf: memory allocated to bloomFilters
// Mf: memory allocated to FencePointers
// MP: Merge policy;
// f: file size in terms of buffer
// F: file size in #entries
// P: actual page size in bytes;
// B: page size in #entries
// PB:  buffer capacity in terms of #entries
// ceilling(M/B): #pages flushed by buffer;
// ceillign(N/B): #pages containing all entries
// ceilling(M/F): #files flushed by buffer;
// ceilling(N/F): #files containing all entreis
// s: selectivity of a range lookup
// mu(μ): storage sequential over random access speed
// phi(Φ): storage write over read speed
// prefix: configurate target{cmp: comparative analysis, indiv: inidividual analysis}\
// K, Z: tunning parameters
// suffix: result targets subclasses {vlsm, rlsm, dlsm, osm}
// preMP: previous state of merge policy before switching analysis mode
class LSM {
    constructor(prefix = "", suffix = "") {
        this._DEFAULT = {
            T: 2,
            E: 1048576,
            N: 1,
            P: 1048576,
            M: 1048576, //1MB
            Mbf: 1024,
            Mf: 0,
            MP: 0,
            f: 1,
            s: 50,
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
            this.T = this.DEFAULT.T;
            this.E = this.DEFAULT.E;
            this.N = this.DEFAULT.N;
            this.M = this.DEFAULT.M;
            this.f = this.DEFAULT.f;
            this.P = this.DEFAULT.P;
            this.Mbf = this.DEFAULT.Mbf;
            this.s = this.DEFAULT.s;
            this.mu = this.DEFAULT.mu;
            this.phi = this.DEFAULT.phi;
        }
        this.PB = this.P * this.B;
        this.L = this._getL();     
    }

    get T() {
        return this._T;
    }
    get E() {
        return this._E;
    }
    get N() {
        return this._N;
    }
    get M() {
        return this._M;
    }
    get Mbf() {
        return this._Mbf;
    }
    get P() {
        return Math.floor(this._M/this._P);
    }
    get B() {
        return Math.floor(this._P/this._E);
    } 
    get PB() {
        return this._PB;
    }
    get MP() {
        return this._MP;
    }
    get L() {
        return this._L;
    }
    get f() {
        return this._f;
    }
    get F() {
        return Math.floor(correctDecimal(this._M*this._f / this._E));
    }
    get s() {
        return this._s;
    }
    get mu() {
        return this._mu;
    }
    get phi() {
        return this._phi;
    }
    get K(){
        if(this.MP || this.name === "DostoevskyLSM") return this.T - 1;
        else return 1;
    }
    get Z() {
        if (!this.MP || this.name === "DostoevskyLSM") return 1;
        else return this.T - 1;
    }
    get prefix() {
        return this._prefix;
    }
    get suffix() {
        return this._suffix;
    }
    get preMP() {
        return this._preMP;
    }
    get DEFAULT() {
        return this._DEFAULT;
    }
    get name() { 
        return this.__proto__.constructor.name;
    }
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
    set PB(entryNum) {
        this._PB = entryNum;
        return this._PB;
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
        this._s = this.N * parseFloat(selectivity/100);
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
        return this.N <= this.PB;
    }
    _getExtraEntries() {    //number of entries flushed to level 1 when buffer is not full
        return this.N % this.PB;
    }

    _getL(entryNum = this.N - this._getExtraEntries()) {
        // entryNum must > 0
        if (entryNum == 0) return 1;
        var L;
        var l1_cap = this.PB * (this.T - 1);
        var log = entryNum * (this.T - 1) / l1_cap + 1;
        L = Math.ceil(getBaseLog(this.T, log));
        return (L < 1) ? 1 : L;
    }
 
    /* Having known the ith level,
     * Return #entires a run could contain at that level 
     * Computing based on the buffer capacity in terms of #entries
     */
    _getRunCapacity(ith) {
        if (this.MP && ith) return this._getLevelSpace(ith) / this.T;   // level 0 = no tier
        else return this._getLevelCapacity(ith);
    }

    /* Only used when computing the rate for leveling */
    _getLevelSpace(ith) {    //assumed maximal space of PB*T
        return this.PB * Math.pow(this.T, ith);
    }

    _getLevelCapacity(ith) {     //actual maximal capacity that can be reached PB*(T-1)
        var l1_cap = this.PB * (this.T - 1);
        return l1_cap * Math.pow(this.T, ith - 1);
    }
    _sumLevelCapacity(levels) {
        var sum = 0;
        for (let i = 1; i <= levels; i++) {
            sum += this._getLevelCapacity(i);
        }
        return sum;
    }
    
    /* Based on the buffer capacity of #ENTRY,
     * compute the number of entries per run for jth run in ith level; 
     */
    _getEntryNum(ith, jth, run_cap) {
        var cur_cap = this._sumLevelCapacity(ith) + this._getExtraEntries();
        var li_cap = this._getLevelCapacity(ith);
        var isLastLevel = ith === this.L;
        if (ith === 1) {
            if (this.MP) {
                if (isLastLevel) {
                    for (var j = 0; j < this.T - 1; j++) {
                        if ((j + 1) * run_cap >= this.N) break;
                    }
                    if (jth > j) return 0;
                    else if (jth < j) return run_cap;      
                    else return this.N - jth * run_cap;
                } else {
                    if (jth === this.T - 1) return this._getExtraEntries();
                    else return run_cap;
                }    
            } else {
                if (isLastLevel) return this.N;
                return li_cap + this._getExtraEntries();
            }
        }
        if (isLastLevel) {
            var offset = this.N - cur_cap + li_cap;
            if(this.MP) {
                for (var j = 0; j < this.T - 1; j++) {
                    if ((j + 1) * run_cap >= offset) break;
                }
                if (jth > j) return 0;
                else if (jth < j) return run_cap;
                else return offset - jth * run_cap;
            } else {     // not reaching the last level
                return offset;
            }
        } else {
            if (this.MP) {
                if (jth === this.T - 1) return 0;
                else return run_cap;
            } else {
                return li_cap;
            }
        }     
    }

    /* Compute the number of entries in ith level;
     * Return a string to be displayed when triggering ToolTip  
     */
    _getTipText(ith, run_cap, entry_num, file_num) {
        var text = "";
        if (this.MP) {
            text =  "Level " + ith + ": This run contains " + entry_num + " entries in " + file_num + " files, [capacity: " + run_cap + " entries (" + Math.ceil(run_cap/this.F) + " files)]";
        } else {
             text = "Level " + ith + ": " + entry_num + " entries in " + file_num + " files, [capacity: " + run_cap + " entries (" + Math.ceil(run_cap/this.F) + " files)]";
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
        var level_space = 0;
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
            level_space = this._getLevelSpace(i);
            context = this._getTipText(i, level_space, 0, 0);   // jth run = 0;
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
        var run_cap = 0;
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
            run_cap = this._getRunCapacity(i);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    context = this._getTipText(i, run_cap, 0, 0);
                    setRunGradient(child, 0);
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
        this.PB = this.P * this.B;
        this.L = this._getL();

        if (prefix === "cmp") {
            var percentage = document.querySelector(`#${prefix}-input-s`).value + "%";
            document.querySelector("#metric-lQ-title").textContent = "Long range lookup ("+ percentage + ")";
            var str = `Long range lookup cost: the average worst-case I/O cost performed by range lookups with ${percentage} unique keys of the entire key space and mostly target the largest level.`;
            document.querySelector("#metric-lQ-title").setAttribute("data-original-title", str);
        } else {
            document.querySelector("#metric-lQ-title").textContent = "Long range lookup";
        }
        
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

    showCost() {
        document.querySelector(`#${this.suffix}-W-cost`).textContent = roundTo(this._getUpdateCost(), 4) + " I/O";
        document.querySelector(`#${this.suffix}-R-cost`).textContent = roundTo(this._getZeroPointLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-V-cost`).textContent = roundTo(this._getExistPointLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-sQ-cost`).textContent = roundTo(this._getShortRangeLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-lQ-cost`).textContent = roundTo(this._getLongRangeLookUpCost(), 4) +" I/O";
        document.querySelector(`#${this.suffix}-sAMP-cost`).textContent = roundTo(this._getSpaceAmpCost(), 4);
    }

    show() {
        this.showBush();
        this.showCost();
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
    
    _getEntryNum(offset, run_cap, jth) {
        if(this.MP) {
            for (var j = 0; j < this.T - 1; j++) {
                if ((j + 1) * run_cap >= offset) break;
            }
            if (jth > j) return 0;
            else if (jth < j) return run_cap;
            else return offset - jth * run_cap;
        } else {     // not reaching the last level
            return offset;
        }
    }
    /* Detect whether current level should be filled up
     * lth > 1
     * Return True, fill with current level capacity
     * Return False, fill with x times previous level capacity
     */
    _isFull(n, lth) {
        return n >= super._getLevelCapacity(lth);
    }
    _getOffsetFactor(n, lth) {  //lth > 1
        var offset = n - super._sumLevelCapacity(lth - 1);
        var prev_capacity = super._sumLevelCapacity(lth - 1) + this.PB;
        for (var i = 1; i <= this.T - 1; i++) {
            if (offset <= i * prev_capacity) {
                break;
            }
        }
        return i;
    }

    _renderLeveler(elem, n) {
        n = (n < 0) ? 0 : n;
        var l = this._getL(n);
        var level_cap = super._getLevelCapacity(l);
        var level_space = super._getLevelSpace(l);
        var context = "";
        var rate = 0;
        var entry_num = 0;
        if (l == 1) {
            // set n on l1
            entry_num = this._getEntryNum(n + super._getExtraEntries(), level_cap);
            rate = entry_num / level_space;
            var file_num = Math.ceil(correctDecimal(entry_num / this.F));
            context = super._getTipText(l, level_space, entry_num, file_num);
            setToolTip(elem[l], "left", context);
            setRunGradient(elem[l], rate);
            return;
        }

        if (this._isFull(n, l)) {
            entry_num = level_cap;
            rate = entry_num / level_space;
            var file_num = Math.ceil(correctDecimal(entry_num / this.F));
            context = super._getTipText(l, level_space, entry_num, file_num);
            n = n - entry_num;
        } else {
            entry_num = this._getOffsetFactor(n, l) * (super._sumLevelCapacity(l - 1) + this.PB);
            rate = entry_num / level_space;
            var file_num = Math.ceil(correctDecimal(entry_num / this.F));
            context = super._getTipText(l, level_space, entry_num, file_num);
            n = n - entry_num;
        }
        setToolTip(elem[l], "left", context);
        setRunGradient(elem[l], rate);
        return this._renderLeveler(elem, n);
    }

    _renderTier(elem, n, max_runs) {
        n = (n < 0) ? 0 : n;
        var l = this._getL(n);
        var level_cap = super._getLevelCapacity(l);
        var run_cap = super._getRunCapacity(l);
        var context = "";
        var rate = 0;
        var entry_num = 0;
        if (l == 1) {
            // set n on l 1
            for (var j = 0; j < max_runs; j++) {
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                } else {
                    entry_num = this._getEntryNum(n + super._getExtraEntries(), run_cap, j);
                    rate = entry_num / run_cap;
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
                    context = super._getTipText(l, run_cap, entry_num, file_num);
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
                }
            }  
            return;
        }

        if (this._isFull(n, l)) {
            entry_num = run_cap;
            rate = entry_num / run_cap;
            var file_num = Math.ceil(correctDecimal(entry_num / this.F));
            context = super._getTipText(l, run_cap, entry_num, file_num);
            for (var j = 0; j < max_runs; j++) {
                if (((max_runs >= 5) && (j === max_runs - 2)) || j === this.T - 1)  {
                } else {
                    setToolTip(elem[l].childNodes[j], "left", context);
                    setRunGradient(elem[l].childNodes[j], rate);
                }
            }  
            n = n - level_cap;
        } else {
            var offset = this._getOffsetFactor(n, l) * (super._sumLevelCapacity(l - 1) + this.PB);
            for (var j = 0; j < max_runs; j++) {
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                } else {
                    entry_num = this._getEntryNum(offset, run_cap, j);
                    rate = entry_num / run_cap;
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
                    context = super._getTipText(l, run_cap, entry_num, file_num);
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
        var level_cap = 0;
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
            level_cap = super._getLevelCapacity(i);
            context = super._getTipText(i, level_cap, 0, 0);   // jth run = 0;
            setToolTip(button, "left", context);
            setRunGradient(button, 0);
            runs[i] = button;
        }
        this._renderLeveler(runs, this.N - super._getExtraEntries());
        return runs;
    }
    _getBtnGroups(elem, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_cap = 0;
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
            run_cap = super._getRunCapacity(i);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                }
                else {
                    child = createBtn(run_width);
                    context = super._getTipText(i, run_cap, 0, 0);
                    setRunGradient(child, 0);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);
            }
            btn_groups[i] = group_wrap;
        }
        this._renderTier(btn_groups, this.N - super._getExtraEntries(), max_runs);
        return btn_groups;
    }

}

class RocksDBLSM extends LSM {
    constructor(tarConf, tarRes) {
        super(tarConf, tarRes);
        // if (this.PB % this.F !== 0) {
        //     this.PB = Math.floor(this.PB/this.F) * this.F;
        //     this.L = this._getL(); 
        // }
        this.threshold = 100;
    }
    get threshold() {
        return this._threshold;
    }
    set threshold(x) {
        this._threshold = x;
        return this._threshold;
    }
    _getL(fileNum = this._getFileNum()) {
        // fileNum must > 0
        if (fileNum == 0) return 1;
        var L = 0;
        var i = 0;
        while (i < fileNum) {
            L += 1;
            i += this._getLevelCapacityByFile(L);
        }
        return (L < 1) ? 1 : L;
    }
    _getFileNum() {
        return Math.ceil(this.N / this.F);
    }
    _getLevelCapacity(ith) {     
    //actual maximal capacity that can be reached PB*T - F
        if (this.N % this.F && ith === 1) {
            return this.PB * this.T - this.F + this._getExtraEntries();
        }
        return this.PB * Math.pow(this.T, ith) - this.F ;
    }
    _sumLevelCapacity(levels) {
        var sum = 0;
        for (let i = 1; i <= levels; i++) {
            sum += this._getLevelCapacity(i);
        }
        return sum;
    }
    _getLevelCapacityByFile(ith) {     
        return Math.ceil(this._getLevelCapacity(ith) / this.F);
    }
    _getExtraEntries() {    //number of entries flushed to level 1 when buffer is not full
        var r = this.N  % this.PB;
        return r % this.F;
    }
    _getExtraFiles() {
        return (this.N % this.F) ? 1:0;
    }
    _getEntryNum(ith, jth, run_cap) {
        var cur_cap = this._sumLevelCapacity(ith);
        var li_cap = this._getLevelCapacity(ith);
        var isLastLevel = ith === this.L;
        var offset = this.N - cur_cap + li_cap; //offset == this.N when ith == 1;
        if (this.MP) {
            if (isLastLevel) {
                for (var j = 0; j < this.T - 1; j++) {
                    if ((j + 1) * run_cap >= offset) break;
                }
                if (jth > j) return 0;
                else if (jth < j) return run_cap;
                else return offset - jth * run_cap;
            } else {
                if (jth === this.T - 1) {
                        if (ith === 1 && (this.N % this.F)) return run_cap - this.F + this._getExtraEntries();
                        else return run_cap - this.F;
                    } else {
                        return run_cap
                    }
            }
        } else {
            if (isLastLevel){
                return offset;
            } else {
                return li_cap;
            }
        }   
    }

    _getBtns(elem, level, ratio) {
        var runs = [];
        var run_width = 0;
        var button = null;
        var level_cap = 0;
        var level_space = 0;
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
            level_cap = this._getLevelCapacity(i);
            level_space = super._getLevelSpace(i);
            entry_num = this._getEntryNum(i, 0, level_cap);
            rate = entry_num / level_space;
            var file_num = Math.ceil(correctDecimal(entry_num / this.F));
            context = super._getTipText(i, level_space, entry_num, file_num);
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
        var run_cap = 0;
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
            run_cap = super._getRunCapacity(i);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    context = "This level contains " + ratio + " runs in total";
                } else {
                    child = createBtn(run_width);
                    entry_num = this._getEntryNum(i, j, run_cap);
                    rate = entry_num / run_cap;
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
                    console.log(entry_num);
                    console.log(file_num);
                    context = super._getTipText(i, run_cap, entry_num, file_num);
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
        this.PB = this.P * this.B;
        this.L = this._getL();
        this._updateCostEquation();
    }

    _updateCostEquation() {
        var W = "";
        var R = "";
        var V = "";
        var sQ = "";
        var lQ = "";
        var sAMP = "";
        if (this.MP) {
            W = "$$O\\left({L \\over B} \\right)$$";
            R = "$${O\\left(e^{-{M/N}}\\cdot T^{T/(T-1)}\\right)}$$";
            V = "$${O\\left(1+e^{-{M/N}}\\cdot T^{1/(T-1)} \\cdot (T-1)\\right)}$$";
            sQ = "$$O\\left(L \\cdot T \\right)$$";
            lQ = "$$O\\left({{T \\cdot s} \\over B} \\right)$$";
            sAMP = "$$O\\left(T \\right)$$";

        } else {
            W = "$$O\\left({ L \\cdot T \\over B} \\right)$$";
            R = "$${O\\left(e^{-{M/N}}\\cdot {T^{T/(T-1)}\\over T-1}\\right)}$$";
            V = "$${O\\left(1+e^{-{M/N}}\\cdot {T^{1/(T-1)}\\over T-1}\\right)}$$";   //$${O\left(1 + e^{-{M/N}} \right)}$$
            sQ = "$$O\\left(L \\right)$$";
            lQ = "$$O\\left({s \\over B} \\right)$$";
            sAMP = "$$O\\left({1 \\over T} \\right)$$";
        }
        // document.querySelector("#rlsm-W-cost").setAttribute("title", W);
        // document.querySelector("#rlsm-R-cost").setAttribute("title", R);
        // document.querySelector("#rlsm-V-cost").setAttribute("title", V);
        // document.querySelector("#rlsm-sQ-cost").setAttribute("title", sQ);
        // document.querySelector("#rlsm-lQ-cost").setAttribute("title", lQ);
        // document.querySelector("#rlsm-sAMP-cost").setAttribute("title", sAMP);
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
        var nEntry_L = this.PB * Math.pow(this.T, ith);
        if (ith === 0 || ith === level ) return nEntry_L;
        else return nEntry_L / this.T;
    }

    _getBtnGroups(elem, level, ratio) {
        var btn_groups = [];
        var max_runs = (ratio < 5) ? ratio : 5;
        var run_width = 0;
        var group_wrap = null;
        var run_cap = 0;
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
            run_cap = this._getRunCapacity(i, level);
            group_wrap.setAttribute("class", "lsm-btn-group");
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 5) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                    var context = "This level contains " + ratio + " runs in total";
                } else {
                    child = createBtn(run_width);
                    entry_num = super._getEntryNum(i, j, run_cap);
                    rate = correctDecimal(entry_num / run_cap);
                    var file_num = Math.ceil(correctDecimal(entry_num / this.F));
                    context = super._getTipText(i, run_cap, entry_num, file_num);
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
        this.PB = this.P * this.B;
        this.L = this._getL();
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
    window.vlsm.show();
    window.rlsm.show();
    window.dlsm.show();
    window.osm.show();
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
                obj.show();
            }
        } else {    // ... update(indiv)
            for (var key in window.obj) {
                var obj = window.obj[key];
                var tmpMP = obj.MP;
                obj.MP = obj.preMP;
                obj.preMP = tmpMP;
                obj.update(key);
                obj.show();
            }
        }
    }
}

function runCmp() {
    var target = "cmp";
    var input_T = getInputValbyId("#cmp-input-T");
    var input_E = convertToBytes("#cmp-select-E", getInputValbyId("#cmp-input-E"));
    var input_N = getInputValbyId("#cmp-input-N");
    var input_M = convertToBytes("#cmp-select-M", getInputValbyId("#cmp-input-M"));
    var input_f = getInputValbyId("#cmp-input-f");
    var input_F = input_M * input_f;
    var input_P = convertToBytes("#cmp-select-P", getInputValbyId("#cmp-input-P"));
    var input_Mbf = convertToBytes("#cmp-select-Mbf", getInputValbyId("#cmp-input-Mbf"));
    var input_s = getInputValbyId("#cmp-input-s");
    var input_mu = getInputValbyId("#cmp-input-mu");
    var input_phi = getInputValbyId("#cmp-input-phi");


    var input = {T: input_T, E: input_E, N: input_N, M: input_M, f: input_f, F: input_F, P: input_P, Mbf: input_Mbf, s: input_s, mu: input_mu, phi: input_phi};
    validate(this, target, input);


    switch (this.id) {
        case "cmp-vlsm-leveling": 
            vlsm.update(target, 0);
            vlsm.show();
            break;
        case "cmp-vlsm-tiering":
            vlsm.update(target, 1);
            vlsm.show();
            break;
        case "cmp-rlsm-leveling": 
            rlsm.update(target, 0);
            rlsm.show();
            break;
        case "cmp-rlsm-tiering": 
            rlsm.update(target, 1);
            rlsm.show();
            break;
        // case "cmp-dlsm-lazyLevel":   // currently untriggered by event, unchanged merge policy
        //     dlsm.update(target, 1);
        //     dlsm.showBush();
        //     break;
        case "cmp-osm-leveling": 
            osm.update(target, 0);
            osm.show();
            break;
        case "cmp-leveling":
            console.log("update all to leveling");
            vlsm.update(target, 0);
            rlsm.update(target, 0);
            // dlsm.update(target, 1);     // currently untriggered by event, unchanged merge policy
            osm.update(target, 0);
            vlsm.show();
            rlsm.show();
            dlsm.show();
            osm.show();
            break;
        case "cmp-tiering":
            console.log("update all to tiering");
            vlsm.update(target, 1);
            rlsm.update(target, 1);
            // dlsm.update(target, 1);     // currently untriggered by event, unchanged merge policy
            // osm.update(target, 1);
            vlsm.show();
            rlsm.show();
            dlsm.show();
            // osm.showBush();
            break;
        default:
            console.log("simply update all");
            vlsm.update(target);
            rlsm.update(target);
            dlsm.update(target);
            osm.update(target);
            vlsm.show();
            rlsm.show();
            dlsm.show();
            osm.show();
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
    var input_T = getInputValbyId(`#${target}-input-T`);
    var input_E = convertToBytes(`#${target}-select-E`, getInputValbyId(`#${target}-input-E`));
    var input_N = getInputValbyId(`#${target}-input-N`);
    var input_M = convertToBytes(`#${target}-select-M`, getInputValbyId(`#${target}-input-M`));
    var input_f = getInputValbyId(`#${target}-input-f`); 
    var input_F = input_M * input_f;
    var input_P = convertToBytes(`#${target}-select-P`, getInputValbyId(`#${target}-input-P`));
    var input_Mbf = convertToBytes(`#${target}-select-Mbf`, getInputValbyId(`#${target}-input-Mbf`));
    var input_s = getInputValbyId(`#${target}-input-s`);
    var input_mu = getInputValbyId(`#${target}-input-mu`);
    var input_phi = getInputValbyId(`#${target}-input-phi`);
    var input = {T: input_T, E: input_E, N: input_N, M: input_M, f: input_f, F: input_F, P: input_P, Mbf: input_Mbf, s: input_s, mu: input_mu, phi: input_phi};
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
    obj.show();
}

/* Validate and correct the input */
function validate(self, target, input) {
    // T >= 2, N, E > 1, M > 1
    if (!self.classList.contains(`${target}-input`)) {
        alert(`Invalid: Unknown ${target} configuration input`);
        return;
    }
    switch (self.id) {
        case `${target}-input-T`:
            if (input.T < 2) {
                alert("Invalid input: the minimal ratio of LSM-Tree is 2");
                restoreState(`#${target}-input-T`);
            } else {
                setState(`#${target}-input-T`);
            }
            break;
        case `${target}-input-N`:
            if (input.N < 1) {
                alert("Invalid input: the minimal #entries is 1");
                restoreState(`#${target}-input-N`);
            } else {
                setState(`#${target}-input-N`);
            }
            break;
        case `${target}-input-E`:
        case `${target}-select-E`:
            if (input.E < 1 || input.E > input.M || input.E > input.P || input.E > input.F) {
                //restore to legally previous state
                if (input.E < 1) {
                    alert("Invalid input: the minimal size of an entry is 1 byte");
                    restoreState(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
                if (input.E > input.P) {
                    alert("Invalid input: the maximal size of an entry should be <= page size");
                    restoreState(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
                if (input.E > input.F) {
                    alert("Invalid input: the maximal size of an entry should be <= file size");
                    restoreState(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
                if (input.E > input.M) {
                    alert("Invalid input: the maximal size of an entry should be <= buffer size");
                    restoreState(`#${target}-input-E`, `#${target}-select-E`);
                    break;
                }
            } else {    // save new state
                setState(`#${target}-input-E`, `#${target}-select-E`);
            }
            break;
        case `${target}-input-M`:
        case `${target}-select-M`:
            if (input.M < 1 || input.M < input.E || input.M < input.P || input.F < 1 || input.F < input.P) {
                
                if (input.F < input.P) {
                    alert("Invalid input: in terms of buffer, the corresponding file size shoud not be < page size");
                    restoreState(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.F < 1) {
                    alert("Invalid input: in terms of buffer, the corresponding file size shoud not be < 1 byte");
                    restoreState(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.M < input.P) {
                    alert("Invalid input: the minimal size of buffer should be >= page size");
                    restoreState(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.M < input.E) {
                    alert("Invalid input: the minimal size of buffer should be >= entry size");
                    restoreState(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
                if (input.M < 1) {
                    alert("Invalid input: the minimal size of buffer is 1 byte");
                    restoreState(`#${target}-input-M`, `#${target}-select-M`);
                    break;
                }
            } else {
                setState(`#${target}-input-M`, `#${target}-select-M`);
            }
            break;
        case `${target}-input-P`:  //1byte <= P <= E & M & F
        case `${target}-select-P`:
            if (input.P < 1 || input.P < input.E || input.P > input.M || input.P > input.F) {
                if (input.P < input.E) {
                    alert("Invalid input: the minimal size of a page should be >= entry size");
                    restoreState(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
                if (input.P < 1) {
                    alert("Invalid input: the minimal size of a page should be >= 1 byte");
                    restoreState(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
                if (input.P > input.F) {
                    alert("Invalid input: the maximal size of a page should be <= file size");
                    restoreState(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
                if (input.P > input.M) {
                    alert("Invalid input: the maximal size of a page should be <= buffer size");
                    restoreState(`#${target}-input-P`, `#${target}-select-P`);
                    break;
                }
            } else {    
                setState(`#${target}-input-P`, `#${target}-select-P`);
            }
            break;
        case `${target}-input-Mbf`:  //0byte <= Mbf <= M
        case `${target}-select-Mbf`:
            if (input.Mbf < 0) {
                alert("Invalid input: the minimal memory allocated for bloom filters should be >= 0 byte");
                restoreState(`#${target}-input-Mbf`, `#${target}-select-Mbf`);
            } else {
                setState(`#${target}-input-Mbf`, `#${target}-select-Mbf`);
            }
            break;
        case "cmp-input-f":  //global setting: 1byte <= F <= M
            if (input.F < 1 || input.F < input.P || input.F < input.E || input.F > input.M) {
                if (input.F < input.P) {
                    alert("Invalid input: the minimal size of a file should be >= page size");
                    restoreState("#cmp-input-f");
                    break;
                }
                if (input.F < input.E) {
                    alert("Invalid input: the minimal size of a file should be >= entry size");
                    restoreState("#cmp-input-f");
                    break;
                }
                if (input.F < 1) {
                    alert("Invalid input: the minimal size of a file should be >= 1 byte");
                    restoreState("#cmp-input-f");
                    break;
                }
                if (input.F > input.M) {
                    alert("Invalid input: in global setting, the maximal size of a file should be <= buffer size");
                    restoreState("#cmp-input-f");
                    break;
                }
            } else {
                setState("#cmp-input-f");
            }
            break;

        // case `${target}-input-f`:  //TODO: individual setting in terms of leveling and tiering
        //     if (input.F <= min || input.F > max) document.querySelector(`#${target}-input-f`).value = 1;
        //     break;
        case `${target}-input-s`:  //0 <= s <= 100
            if (input.s < 0 || input.s > 100) {
                if (input.s < 0) {
                    alert("Invalid input: the selectivity of a range query should be >= 0");
                    restoreState(`#${target}-input-s`);
                    break;
                }
                if (input.s > 100) {
                    alert("Invalid input: the selectivity of a range query should be <= 100");
                    restoreState(`#${target}-input-s`);
                    break;
                }
            } else {
                setState(`#${target}-input-s`);
            }
            break;
        case `${target}-input-mu`:  //TODO
        case `${target}-input-phi`:  //TODO
        case `${target}-select-Mf`:  //TODO
        case `${target}-input-Mf`:  //TODO
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

function restoreState(inputTarget, unitTarget) {
    var inputElem = document.querySelector(inputTarget);
    inputElem.value = inputElem.dataset.preval;
    if (unitTarget !== undefined) {
        var unitElem = document.querySelector(unitTarget);
        unitElem.selectedIndex = unitElem.dataset.preunit;
    }  
}
function setState(inputTarget, unitTarget) {
    var inputElem = document.querySelector(inputTarget);
    inputElem.dataset.preval = inputElem.value;
    if (unitTarget !== undefined) {
        var unitElem = document.querySelector(unitTarget);
        unitElem.dataset.preunit = unitElem.selectedIndex;
    }  
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

function getInputValbyId(id) {
    return parseFloat(document.querySelector(id).value);
}
function setInputValbyId(id, val) {
    return document.querySelector(id).value = val;
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

