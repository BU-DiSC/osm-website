// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {
// Treebush initialization
(function initALL(self) {
    var vlsm = new VanillaLSM();
    var rlsm = new RocksDBLSM();
    self.rlsm = rlsm;
    self.vlsm = vlsm;
    vlsm.update();
    rlsm.update();
})(window);


// Event attributes, trigger
document.querySelector("#vlsm-input-T").onchange = runVanillaLSM
document.querySelector("#vlsm-input-T").onwheel = runVanillaLSM;
document.querySelector("#vlsm-input-E").onchange = runVanillaLSM;
document.querySelector("#vlsm-input-E").onwheel = runVanillaLSM;
document.querySelector("#vlsm-input-N").onchange = runVanillaLSM;
document.querySelector("#vlsm-input-N").onwheel = runVanillaLSM;
document.querySelector("#vlsm-input-M").onchange = runVanillaLSM;
document.querySelector("#vlsm-input-M").onwheel = runVanillaLSM;
document.querySelector("#v-tiering").onclick = runVanillaLSM;
document.querySelector("#v-leveling").onclick = runVanillaLSM;
document.querySelector("#rlsm-input-T").onchange = runRocksDBLSM
document.querySelector("#rlsm-input-T").onwheel = runRocksDBLSM;
document.querySelector("#rlsm-input-E").onchange = runRocksDBLSM;
document.querySelector("#rlsm-input-E").onwheel = runRocksDBLSM;
document.querySelector("#rlsm-input-N").onchange = runRocksDBLSM;
document.querySelector("#rlsm-input-N").onwheel = runRocksDBLSM;
document.querySelector("#rlsm-input-M").onchange = runRocksDBLSM;
document.querySelector("#rlsm-input-M").onwheel = runRocksDBLSM;
document.querySelector("#r-tiering").onclick = runRocksDBLSM;
document.querySelector("#r-leveling").onclick = runRocksDBLSM;
// N : number of entries
// L : number of Levels
// E : size of an entry(bytes)
// T : size ratio
// M : buffer capacity(MB);
function VanillaLSM() {
    var _T = document.querySelector("#vlsm-input-T").value;
    var _E = document.querySelector("#vlsm-input-E").value;
    var _N = document.querySelector("#vlsm-input-N").value;
    var _M = document.querySelector("#vlsm-input-M").value;
    var _MP = 0;    // leveling:0, tiering:1
    var _DEFAULT = {
        T: 2,
        E: 16,
        N: 4294967296,
        M: 256,
        MP: 0
    };

    this.getT = function() {return _T;}
    this.getE = function() {return _E;}
    this.getN = function() {return _N;}
    this.getM = function() {return _M;}
    this.getMP = function() {return _MP;}
    this.getDEFAULT = function() {return _DEFAULT;}

    this.updateT = function(ratio) {
        _T = ratio;
        return _T;
    }

    this.updateE = function(entrySize) {
        _E = entrySize;
        return _E;
    }

    this.updateN = function(entryNum) {
        _N = entryNum;
        return _N;
    }

    this.updateM = function(bufferSize) {
        _M = bufferSize;
        return _M;
    }

    this.updateMP = function(mergePolicy) {
        _MP = mergePolicy;
        return _MP;
    }
    
    /* Compute the levels of LSM-tree having ratio, #entry, entry size, Mbuffer
       Return 0 when all in buffer.*/
    function _getL() {
        var L;
        var Mbytes = _M * Math.pow(10, 6);   // convert to bytes
        var exp = ((_N * _E) / Mbytes) * ((_T - 1) / _T);
        L = Math.ceil(getBaseLog(_T, exp));
        console.log("Computed Level = " + L);
        return (L < 1) ? 0 : L;
    }

    /* Having known the numer of levels,
     * compute the number of entries per run in the ith level*/
    function _getEntryNum(ith) {
        var nr = 0; // number of entries each run
        var Mbytes = _M * Math.pow(10, 6);   // convert to bytes
        var nl = Math.floor(Mbytes * Math.pow(_T, ith) / _E);  // number of entries per level
        if (_MP) nr = Math.floor(nl / _T);
        else nr = nl;
        return nr;
    }

    /* Compute the number of entries in ith level;
     * Return a string to be displayed when triggering ToolTip 
     */
    function _getTipText(ith) {
        var n = _getEntryNum(ith);
        var text = "";
        if (ith === 0) {
            text = "In buffer, it contains " + n + " entries";
        } else {
            text = "Level: " + ith + ", this run contains " + n + " entries";
        }
        return text;
    }

    this.update = function() {
        var L = _getL();
        var btnList = [];
        var parent = document.querySelector("#vlsm-res");
        if (_MP) btnList = getBtnGroups(parent, L, _T);
        else btnList = getBtns(parent, L, _T);
        clear(parent);

        for (var i = 0; i <= L; i++) {
            var res_wrap = document.createElement("div");
            res_wrap.setAttribute("class", "row lsm-result");
            res_wrap.appendChild(btnList[i]);
            parent.appendChild(res_wrap);
        }

        function getBtns(elem, level, ratio) {
            /* Calculate current amount and set the width of runs
             * Return a list of button objects
             */
            var runs = [];
            var context = "At level: ";

            var getWidth = function(i) {
                // for leveling, margin = 0;
                var coef = 1;  
                var base_width = 5;
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
                var context = _getTipText(i);
                setToolTip(button, "left", context);
                runs[i] = button;
            }
            return runs;
        }

        function getBtnGroups(elem, level, ratio) {
            // Return a list of lsm-btn-group obejcts
            var btn_groups = [];
            var max_runs = 8;
            if (ratio < max_runs) {
                if (level !== 0) max_runs = ratio;
                else max_runs = 1;
            }

            var getWidth = function(i) {
                // Return the width for each button in a btn-group regarding to tiering
                if (level === 0) return elem.clientWidth + "px";
                var base_width = 5;
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
                    if ((max_runs >= 8) && (j == max_runs - 2)) {
                        child = createDots(run_width);
                        var context = "This level contains " + ratio + " runs in total";
                    }
                    else {
                        child = createBtn(run_width);
                        var context = _getTipText(i);
                    }
                    setToolTip(child, "left", context);
                    group_wrap.appendChild(child);

                    if (i === 0) break;  // only one run in buffer level 
                }
                btn_groups[i] = group_wrap;
            }
            return btn_groups;

        }
    }

}

function RocksDBLSM() {
    var _T = document.querySelector("#rlsm-input-T").value;
    var _E = document.querySelector("#rlsm-input-E").value;
    var _N = document.querySelector("#rlsm-input-N").value;
    var _M = document.querySelector("#rlsm-input-M").value;
    var _MP = 0;    // leveling:0, tiering:1
    var _DEFAULT = {
        T: 2,
        E: 16,
        N: 4294967296,
        M: 256,
        MP: 0
    };

    this.getT = function() {return _T;}
    this.getE = function() {return _E;}
    this.getN = function() {return _N;}
    this.getM = function() {return _M;}
    this.getMP = function() {return _MP;}
    this.getDEFAULT = function() {return _DEFAULT;}

    this.updateT = function(ratio) {
        _T = ratio;
        return _T;
    }

    this.updateE = function(entrySize) {
        _E = entrySize;
        return _E;
    }

    this.updateN = function(entryNum) {
        _N = entryNum;
        return _N;
    }

    this.updateM = function(bufferSize) {
        _M = bufferSize;
        return _M;
    }

    this.updateMP = function(mergePolicy) {
        _MP = mergePolicy;
        return _MP;
    }
    
    /* Compute the levels of LSM-tree having ratio, #entry, entry size, Mbuffer
       Return 0 when all in buffer.*/
    function _getL() {
        var L;
        var Mbytes = _M * Math.pow(10, 6);   // convert to bytes
        var exp = ((_N * _E) / Mbytes) * ((_T - 1) / _T);
        L = Math.ceil(getBaseLog(_T, exp));
        console.log("Computed Level = " + L);
        return (L < 1) ? 0 : L;
    }

    /* Having known the numer of levels,
     * compute the number of entries per run in the ith level*/
    function _getEntryNum(ith) {
        var nr = 0; // number of entries each run
        var Mbytes = _M * Math.pow(10, 6);   // convert to bytes
        var nl = Math.floor(Mbytes * Math.pow(_T, ith) / _E);  // number of entries per level
        if (_MP) nr = Math.floor(nl / _T);
        else nr = nl;
        return nr;
    }

    /* Compute the number of entries in ith level;
     * Return a string to be displayed when triggering ToolTip 
     */
    function _getTipText(ith) {
        var n = _getEntryNum(ith);
        var text = "";
        if (ith === 0) {
            text = "In buffer, it contains " + n + " entries";
        } else {
            text = "Level: " + ith + ", this run contains " + n + " entries";
        }
        return text;
    }

    this.update = function() {
        var L = _getL();
        var btnList = [];
        var parent = document.querySelector("#rlsm-res");
        if (_MP) btnList = getBtnGroups(parent, L, _T);
        else btnList = getBtns(parent, L, _T);
        clear(parent);

        for (var i = 0; i <= L; i++) {
            var res_wrap = document.createElement("div");
            res_wrap.setAttribute("class", "row lsm-result");
            res_wrap.appendChild(btnList[i]);
            parent.appendChild(res_wrap);
        }

        function getBtns(elem, level, ratio) {
            /* Calculate current amount and set the width of runs
             * Return a list of button objects
             */
            var runs = [];
            var context = "At level: ";

            var getWidth = function(i) {
                // for leveling, margin = 0;
                var coef = 1;  
                var base_width = 5;
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
                var context = _getTipText(i);
                setToolTip(button, "left", context);
                runs[i] = button;
            }
            return runs;
        }

        function getBtnGroups(elem, level, ratio) {
            // Return a list of lsm-btn-group obejcts
            var btn_groups = [];
            var max_runs = 8;
            if (ratio < max_runs) {
                if (level !== 0) max_runs = ratio;
                else max_runs = 1;
            }

            var getWidth = function(i) {
                // Return the width for each button in a btn-group regarding to tiering
                if (level === 0) return elem.clientWidth + "px";
                var base_width = 5;
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
                    if ((max_runs >= 8) && (j == max_runs - 2)) {
                        child = createDots(run_width);
                        var context = "This level contains " + ratio + " runs in total";
                    }
                    else {
                        child = createBtn(run_width);
                        var context = _getTipText(i);
                    }
                    setToolTip(child, "left", context);
                    group_wrap.appendChild(child);

                    if (i === 0) break;  // only one run in buffer level 
                }
                btn_groups[i] = group_wrap;
            }
            return btn_groups;

        }
    }

}
 
function runVanillaLSM() {
    var input_T = document.querySelector("#vlsm-input-T").value;
    var input_E = document.querySelector("#vlsm-input-E").value;
    var input_N = document.querySelector("#vlsm-input-N").value;
    var input_M = document.querySelector("#vlsm-input-M").value;

    validate(this);

    vlsm.updateT(document.querySelector("#vlsm-input-T").value);
    vlsm.updateE(document.querySelector("#vlsm-input-E").value);
    vlsm.updateN(document.querySelector("#vlsm-input-N").value);
    vlsm.updateM(document.querySelector("#vlsm-input-M").value);

    if (this.id === "v-leveling") {
        console.log("update leveling demo");
        vlsm.updateMP(0);
    } else if (this.id === "v-tiering") {
        console.log("update tiering demo");
        vlsm.updateMP(1);
    } else {
        console.log("simply update");
    }

    vlsm.update();


    function validate(self) {
        // T >= 2, N, E > 1, M > 0
        if (!self.classList.contains("vlsm-input")) {
            alert("Invalid: Unknown Vanilla LSM-Tree configuration input");
            return;
        }
        switch (self.id) {
            case "vlsm-input-T":
                if (input_T <= 1) {
                    document.querySelector("#vlsm-input-T").value = vlsm.getDEFAULT().T;
                    // alert("Invalid: The minimal ratio of LSM-Tree is 2");
                }
                break;
            case "vlsm-input-N":
                if (input_N < 1) {
                    document.querySelector("#vlsm-input-N").value = 1;
                    // alert("Invalid: The minimal number of entries of LSM-Tree is 1");
                }
                break;
            case "vlsm-input-E":
                    if (input_E < 1) {
                    document.querySelector("#vlsm-input-E").value = 1;
                    // alert("Invalid: The minimal entry size of LSM-Tree is 1 bytes");
                }
                break;
            case "vlsm-input-M":
                    if (input_M <= 0) {
                    document.querySelector("#vlsm-input-M").value = vlsm.getDEFAULT().M;
                    // alert("Invalid: The buffer size of LSM-Tree must > 0");
                }
                break;
            case "v-tiering":
            case "v-leveling":
                break;
            default:
                console.log(self.id);
                alert("Invalid: Unknown Vanilla LSM-Tree configuration input");
        }
        return;
    }
}

function runRocksDBLSM() {
    var input_T = document.querySelector("#rlsm-input-T").value;
    var input_E = document.querySelector("#rlsm-input-E").value;
    var input_N = document.querySelector("#rlsm-input-N").value;
    var input_M = document.querySelector("#rlsm-input-M").value;

    validate(this);

    rlsm.updateT(document.querySelector("#rlsm-input-T").value);
    rlsm.updateE(document.querySelector("#rlsm-input-E").value);
    rlsm.updateN(document.querySelector("#rlsm-input-N").value);
    rlsm.updateM(document.querySelector("#rlsm-input-M").value);

    if (this.id === "r-leveling") {
        console.log("update leveling demo");
        rlsm.updateMP(0);
    } else if (this.id === "r-tiering") {
        console.log("update tiering demo");
        rlsm.updateMP(1);
    } else {
        console.log("simply update");
    }

    rlsm.update();


    function validate(self) {
        // T >= 2, N, E > 1, M > 0
        if (!self.classList.contains("rlsm-input")) {
            alert("Invalid: Unknown RocksDB LSM-Tree configuration input");
            return;
        }
        switch (self.id) {
            case "rlsm-input-T":
                if (input_T <= 1) {
                    document.querySelector("#rlsm-input-T").value = vlsm.getDEFAULT().T;
                    // alert("Invalid: The minimal ratio of LSM-Tree is 2");
                }
                break;
            case "rlsm-input-N":
                if (input_N < 1) {
                    document.querySelector("#rlsm-input-N").value = 1;
                    // alert("Invalid: The minimal number of entries of LSM-Tree is 1");
                }
                break;
            case "rlsm-input-E":
                    if (input_E < 1) {
                    document.querySelector("#rlsm-input-E").value = 1;
                    // alert("Invalid: The minimal entry size of LSM-Tree is 1 bytes");
                }
                break;
            case "rlsm-input-M":
                    if (input_M <= 0) {
                    document.querySelector("#rlsm-input-M").value = vlsm.getDEFAULT().M;
                    // alert("Invalid: The buffer size of LSM-Tree must > 0");
                }
                break;
            case "r-tiering":
            case "r-leveling":
                break;
            default:
                console.log(self.id);
                alert("Invalid: Unknown RocksDB LSM-Tree configuration input");
        }
        return;
    }
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

function setStep(element, default_value) {
    // Having every input gone through this
    // If step == 0, compute and reset input based on direction && prev_value, 
    // then compute and set nextStep based on direction && prev_value and set the 
    var step = element.getAttribute("step");
    var direction = 0;  
    var input_value = element.value;
    var prev_value = parseInt(element.getAttribute("data-old"));
    if (isNaN(prev_value)) {
        alert("Invalid: Input is not an number, setting to default");
        return step;
    }
    if (input_value > prev_value) {
        direction = 1;
    } else if (input_value < prev_value) {
        direction = -1;
    } else {
        direction = 0;
    }

    var nextStep = function() {
        // Compute nextStep by means of input;
        // Special case: direction == 0. Compute nextStep by next direction, set nextStep = 0.
        if (direction === 1) {
            return nextPowerOfTwo()
        } 

    }
    
    element.setAttribute("step", "" + next());

    return step;
}

});

