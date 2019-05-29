// Event handling
document.addEventListener("DOMContentLoaded",
    function (event) {
        // Event attributes, trigger
        var STATUS = 0;     // leveling:0, tiering:1
        document.querySelector("#lsm-input-level").onchange = updateLSM;
        document.querySelector("#lsm-input-level").onwheel = updateLSM;
        document.querySelector("#lsm-input-ratio").onchange = updateLSM;
        document.querySelector("#lsm-input-ratio").onwheel = updateLSM;
        document.querySelector("#tiering").onclick = updateLSM;
        document.querySelector("#leveling").onclick = updateLSM;



        function clear(element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }

        function updateLSM() {
            var default_values = {
                LEVEL: 4,
                RATIO: 2
            };
            checkValid(this);
            var levels = document.querySelector("#lsm-input-level").value; 
            var ratio = document.querySelector("#lsm-input-ratio").value;

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
                if (!self.classList.contains("lsm-input")) {
                    alert("Invalid: Unknown LSM-Tree configuration input");
                    return false;
                }

                var input_levels = document.querySelector("#lsm-input-level").value;
                var input_ratio = document.querySelector("#lsm-input-ratio").value;

                if (self.id === "lsm-input-level") {
                    if (input_levels > 0) {
                        return true;
                    } else {
                        document.querySelector("#lsm-input-level").value = 1;
                        alert("Invalid: The minimal level of LSM-Tree is 1");
                        return false;
                    }
                }

                if (self.id === "lsm-input-ratio") {
                    if (input_ratio > 1) {
                        return true;
                    } else {
                        document.querySelector("#lsm-input-ratio").value = 2;
                        alert("Invalid: The minimal ratio of LSM-Tree is 2");
                        return false;
                    }
                }
            }
        }
    }
);

