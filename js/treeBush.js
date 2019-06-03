// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {


function initLSM(self) {

}(window);

// Event attributes, trigger
var LSM_MP = 0;     // leveling:0, tiering:1

document.querySelector("#lsm-input-T").onchange = updateLSM;
document.querySelector("#lsm-input-T").onwheel = updateLSM;
document.querySelector("#lsm-input-E").onchange = updateLSM;
document.querySelector("#lsm-input-E").onwheel = updateLSM;
document.querySelector("#lsm-input-N").onchange = updateLSM;
document.querySelector("#lsm-input-N").onwheel = updateLSM;
document.querySelector("#lsm-input-M").onchange = updateLSM;
document.querySelector("#lsm-input-M").onwheel = updateLSM;
document.querySelector("#tiering").onclick = updateLSM;
document.querySelector("#leveling").onclick = updateLSM;

// N : number of entries
// L : number of Levels
// E : size of an entry(bytes)
// T : size ratio
// M : buffer capacity(MB);


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

function getL() {
    /* Compute the levels of LSM-tree having
     * ratio, #entry, entry size, Mbuffer
     * Return 0 when all in buffer.
     */
    var L;
    var T = document.querySelector("#lsm-input-T").value;
    var E = document.querySelector("#lsm-input-E").value;
    var N = document.querySelector("#lsm-input-N").value;
    var M = document.querySelector("#lsm-input-M").value;
    var Mbytes = M * Math.pow(10, 6);   // convert to bytes
    var exp = ((N*E)/Mbytes) * ((T-1)/T);
    L = Math.ceil(getBaseLog(T, exp));
    console.log("Computed Level = " + L);
    return (L < 1) ? 0 : L;
}

function getEntryNum(ith) {
    /* Having known the numer of levels,
     * compute the number of entries per run in the ith level
     */
    var nr = 0; // number of entries each run
    var T = document.querySelector("#lsm-input-T").value;
    var E = document.querySelector("#lsm-input-E").value;
    var M = document.querySelector("#lsm-input-M").value;
    var Mbytes = M * Math.pow(10, 6);   // convert to bytes
    var nl = Math.floor(Mbytes * Math.pow(T, ith) / E);  // number of entries per level
    if (LSM_MP) nr = Math.floor(nl / T);
    else nr = nl;
    return nr;
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

function getTipText(ith) {
    /* Compute the number of entries in ith level;
     * Return a string to be displayed when triggering ToolTip 
     */
    var n = getEntryNum(ith);
    var text = "";
    if (ith === 0) {
        text = "In buffer, it contains " + n + " entries";
    } else {
        text = "Level: " + ith + ", this run contains " + n + " entries";
    }
    return text;
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

function updateLSM() {
    var DEFAULT = {
        L: 4,
        T: 2,
        E: 16,
        N: 4294967296,
        M: 256
    };

    validate(this);

    var L = getL();
    var T = document.querySelector("#lsm-input-T").value;

    if (this.id === "leveling") {
        console.log("update leveling demo");
        LSM_MP = 0;
    } else if (this.id === "tiering") {
        console.log("update tiering demo");
        LSM_MP = 1;
    } else {
        console.log("simply update");
    }

    drawLSM();

    function getBtns(element, level, ratio) {
        /* Calculate current amount and set the width of runs
         * Return a list of button objects
         */
        var runs = [];
        var context = "At level: ";

        var getWidth = function(i) {
            // for leveling, margin = 0;
            var coef = 1;  
            var base_width = 5;
            var clientWidth = element.clientWidth - 1;  // -1 to avoid stacking
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
            var context = getTipText(i);
            setToolTip(button, "left", context);
            runs[i] = button;
        }
        return runs;
    }

    function getBtnGroups(element, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = 8;
        if (ratio < max_runs) {
            if (level !== 0) max_runs = ratio;
            else max_runs = 1;
        }

        var getWidth = function(i) {
            // Return the width for each button in a btn-group regarding to tiering
            if (level === 0) return element.clientWidth + "px";
            var base_width = 5;
            var margin = (max_runs - 2) * 4 + 4;
            var l1_width = max_runs * base_width + margin;   // invariant: level1 width
            var coef = 1;
            var clientWidth = element.clientWidth - 1;  // -1 to avoid stacking 
            var m = clientWidth / Math.pow(max_runs, level - 1);    // level1 acutal width

            if (m < l1_width) {
                coef = Math.pow(clientWidth / l1_width, 1 / (level - 1)) / max_runs;
                m  = l1_width;
            }
            if (i > 1) return (m * Math.pow(coef * max_runs, i - 1) - margin) / max_runs + "px";
            else return (m - margin) / max_runs + "px";
        }

        var createDots = function(width) {
            var dots = document.createElement("span");
            dots.setAttribute("class", "abbr-dot text-center");
            dots.setAttribute("style", "width:" + width);
            dots.textContent = "..."
            return dots;
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
                    var context = getTipText(i);
                }
                setToolTip(child, "left", context);
                group_wrap.appendChild(child);

                if (i === 0) break;  // only one run in buffer level 
            }
            btn_groups[i] = group_wrap;
        }
        return btn_groups;

    }

    function drawLSM() {
        var btnList;
        var parent = document.querySelector("#lsm-res");
        if (LSM_MP) btnList = getBtnGroups(parent, L, T);
        else btnList = getBtns(parent, L, T);

        clear(parent);

        for (var i = 0; i <= L; i++) {
            var res_wrap = document.createElement("div");
            res_wrap.setAttribute("class", "row lsm-result");
            res_wrap.appendChild(btnList[i]);
            parent.appendChild(res_wrap);
        }
    }

    function validate(self) {
        // T >= 2, N, E > 1, M > 0
        if (!self.classList.contains("lsm-input")) {
            alert("Invalid: Unknown LSM-Tree configuration input");
            return;
        }
     
        var input_T = document.querySelector("#lsm-input-T").value;
        var input_E = document.querySelector("#lsm-input-E").value;
        var input_N = document.querySelector("#lsm-input-N").value;
        var input_M = document.querySelector("#lsm-input-M").value;

        switch (self.id) {
            case "lsm-input-T":
                if (input_T <= 1) {
                    document.querySelector("#lsm-input-T").value = DEFAULT.T;
                    // alert("Invalid: The minimal ratio of LSM-Tree is 2");
                }
                break;
            case "lsm-input-N":
                if (input_N < 1) {
                    document.querySelector("#lsm-input-N").value = 1;
                    // alert("Invalid: The minimal number of entries of LSM-Tree is 1");
                }
                break;
            case "lsm-input-E":
                    if (input_E < 1) {
                    document.querySelector("#lsm-input-E").value = 1;
                    // alert("Invalid: The minimal entry size of LSM-Tree is 1 bytes");
                }
                break;
            case "lsm-input-M":
                    if (input_M <= 0) {
                    document.querySelector("#lsm-input-M").value = DEFAULT.M;
                    // alert("Invalid: The buffer size of LSM-Tree must > 0");
                }
                break;
            case "tiering":
            case "leveling":
                break;
            default:
                console.log(self.id);
                alert("Invalid: Unknown LSM-Tree configuration input");
        }
        return;
    }
}







});

