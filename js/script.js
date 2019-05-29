// Event handling
document.addEventListener("DOMContentLoaded",
    function (event) {
        // Event attributes, trigger
        var STATUS = 0;     // leveling:0, tiering:1
        // document.querySelector("#lsm-input-L").onchange = updateLSM;
        // document.querySelector("#lsm-input-L").onwheel = updateLSM;
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
            return Math.log(y) / Math.log(x);
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
            var exponent = ((N*E)/Mbytes) * ((T-1)/T);
            L = Math.ceil(getBaseLog(T, exponent));
            // console.log("exponent =" + exponent);
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

        function updateLSM() {
            var DEFAULT = {
                L: 4,
                T: 2,
                E: 16,
                N: 314159265,
                M: 200
            };

            checkValid(this);

            var levels = getL();
            var ratio = document.querySelector("#lsm-input-T").value;

            if (this.id === "leveling") {
                console.log("update leveling demo");
                STATUS = 0;
            } else if (this.id === "tiering") {
                console.log("update tiering demo");
                STATUS = 1;
            } else {
                console.log("simply update");
            }

            if (STATUS) {
                drawTiering();
            } else {
                drawLSM();
            }


            function getBtns(element, level, ratio) {
                // Calculate current amount of buttons
                // and set the width
                // Return a list of button objects
                var buttons = [];
                var m = element.clientWidth / Math.pow(ratio, level - 1);

                var getWidth = function(i) {
                    return (m * Math.pow(ratio, i)) + "px";
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
                var m = (element.clientWidth - 1) / Math.pow(ratio, level - 1);
                console.log("Total space:" + element.clientWidth);

                var getWidth = function(i) {
                    // Return the width for each button in a btn-group regarding to tiering
                    var width = ((m * Math.pow(ratio, i)) / ratio);  // minus 1 to avoid stacking
                    return width + "px";
                }

                for (var i = 0; i < level; i++) {
                    var group_wrap = document.createElement("div");
                    var btn_width = getWidth(i);
                    console.log("Level" + i + " width = " + btn_width);
                    group_wrap.setAttribute("class", "lsm-btn-group");
                    for (var j = 0; j < ratio; j++) {
                        var btn = document.createElement("button");
                        btn.setAttribute("type", "button");
                        btn.setAttribute("class", "lsm-btn btn btn-secondary");
                        btn.setAttribute("style", "width:" + btn_width);
                        group_wrap.appendChild(btn);
                    }
                    btn_groups[i] = group_wrap;
                }
                return btn_groups;

            }

            function drawLSM() {
                var parent = document.querySelector("#lsm-res");
                var btnList = getBtns(parent, levels, ratio);
                clear(parent);

                for (var i = 0; i < levels; i++) {
                    var res_wrap = document.createElement("div");
                    res_wrap.setAttribute("class", "row lsm-result");
                    res_wrap.appendChild(btnList[i]);
                    parent.appendChild(res_wrap);
                }
            }
 

            function drawTiering() {
                var parent = document.querySelector("#lsm-res");
                var btnList = getBtnGroups(parent, levels, ratio);
                clear(parent);
                console.log(btnList);
                for (var i = 0; i < levels; i++) {
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
                            alert("Invalid: The minimal ratio of LSM-Tree is 2");
                        }
                        break;
                    case "lsm-input-N":
                        if (input_N < 1) {
                            document.querySelector("#lsm-input-N").value = 1;
                            alert("Invalid: The minimal number of entries of LSM-Tree is 1");
                        }
                        break;
                    case "lsm-input-E":
                            if (input_E < 1) {
                            document.querySelector("#lsm-input-E").value = 1;
                            alert("Invalid: The minimal entry size of LSM-Tree is 1 bytes");
                        }
                        break;
                    case "lsm-input-M":
                            if (input_M < 0) {
                            document.querySelector("#lsm-input-M").value = DEFAULT.M;
                            alert("Invalid: The buffer size of LSM-Tree must > 0");
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
    }
);

