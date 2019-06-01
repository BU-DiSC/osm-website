// Event handling
document.addEventListener("DOMContentLoaded",
function (event) {


function initLSM(self) {

}(window);

// Event attributes, trigger
var LSM_MP = 0;     // leveling:0, tiering:1
// document.querySelector("#lsm-input-L").onchange = updateLSM;
// document.querySelector("#lsm-input-L").onwheel = updateLSM;
document.querySelector("#lsm-input-T").onchange = updateLSM;
// document.querySelector("#lsm-input-T").onwheel = updateLSM;
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
    // Compute the levels of LSM-tree having
    // ratio, #entry, entry size, Mbuffer
    var L;
    var T = document.querySelector("#lsm-input-T").value;
    var E = document.querySelector("#lsm-input-E").value;
    var N = document.querySelector("#lsm-input-N").value;
    var M = document.querySelector("#lsm-input-M").value;
    var Mbytes = M * Math.pow(10, 6);   // convert to bytes
    var exp = ((N*E)/Mbytes) * ((T-1)/T);
    L = Math.ceil(getBaseLog(T, exp));
    // console.log("exp =" + exp);
    // console.log("T(ratio) = " + T);
    // console.log("E(entry size) = " + E);
    // console.log("N(#entries) = " + N);
    // console.log("M(buffer size) = " + M);
    console.log("Computed Level = " + L);
    return (L < 1) ? 1 : L;
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

    checkValid(this);

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

    function findCoefficient() {
        // if 1st level 
    }

    function getBtns(element, level, ratio) {
        // Calculate current amount of buttons
        // and set the width
        // Return a list of button objects
        var buttons = [];

        var getWidth = function(i) {
            var coef = 1;
            var least_width = 5;
            var m = element.clientWidth / Math.pow(ratio, level - 1);   // level0 actual width;
            if (m < least_width) {
                var exp = level - 1;
                coef = Math.pow(element.clientWidth/least_width, 1/exp) / ratio;
                m  = least_width;
            }
            return m * Math.pow(coef * ratio, i) + "px";
        };

        for (var i = 0; i < level; i++) {
            var btn = document.createElement("button");
            var width = getWidth(i);
            btn.setAttribute("type", "button");
            btn.setAttribute("class", "lsm-btn btn btn-secondary");
            btn.setAttribute("style", "width: " + width);
            buttons[i] = btn;
        }

        return buttons;
    }

    function getBtnGroups(element, level, ratio) {
        // Return a list of lsm-btn-group obejcts
        var btn_groups = [];
        var max_runs = 8;
        if (ratio < max_runs) {
            if (level != 1) max_runs = ratio;
            else max_runs = 1;
        }

        var getWidth = function(i) {
            // Return the width for each button in a btn-group regarding to tiering
            var coef = 1;
            var m = (element.clientWidth) / Math.pow(max_runs, level - 1);
            var margin = 4 + 4 + (max_runs-2) * 4 ;    //margin space per btn-group
            var least_width = (5*max_runs) + margin; 
            if (m < least_width) {
                var exp = level - 1;
                coef = Math.pow(element.clientWidth/least_width, 1/exp) / max_runs;
                m  = least_width;
            }
            return (m * Math.pow(coef*max_runs, i) - margin) / max_runs + "px";
        }

        var createDots = function(width) {
            var dots = document.createElement("span");
            dots.setAttribute("class", "abbr-dot text-center");
            dots.setAttribute("style", "width:" + width);
            dots.textContent = "..."
            return dots;
        }

        var createBtn = function(width) {
            var btn = document.createElement("button");
            btn.setAttribute("type", "button");
            btn.setAttribute("class", "lsm-btn btn btn-secondary");
            btn.setAttribute("style", "width:" + width);
            return btn;
        }

        for (var i = 0; i < level; i++) {
            var run_width = getWidth(i);
            var group_wrap = document.createElement("div");
            group_wrap.setAttribute("class", "lsm-btn-group");
            console.log("Level" + i + " width = " + run_width);
           
            for (var j = 0; j < max_runs; j++) {
                var child = null;
                if ((max_runs >= 8) && (j == max_runs - 2)) {
                    child = createDots(run_width);
                }
                else child = createBtn(run_width);
                group_wrap.appendChild(child);

                if (i == 0) break;
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

        for (var i = 0; i < L; i++) {
            var res_wrap = document.createElement("div");
            res_wrap.setAttribute("class", "row lsm-result");
            res_wrap.appendChild(btnList[i]);
            parent.appendChild(res_wrap);
        }
    }

    function checkValid(self) {
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

