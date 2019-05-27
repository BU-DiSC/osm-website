// Event handling
document.addEventListener("DOMContentLoaded",
    function (event) {
        // Event attributes, trigger
        document.querySelector("#lsm-input-level").onchange = drawBtn;
        document.querySelector("#lsm-input-level").onwheel = drawBtn;
        
        function clear(element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }

        function getBtns(element, level, ratio) {
            // Calculate current amount of buttons
            // and set the width
            // Return a list of button objects
            var buttons = [];
            var m = element.clientWidth / Math.pow(ratio, level - 1);
            console.log("Level0 length: " + m);

            var getWidth = function(i) {
                return (m * Math.pow(ratio, i)) + "px";
            };

            for (var i = 0; i < level; i++) {
                var btn = document.createElement("button");
                var width = getWidth(i);
                btn.setAttribute("type", "button");
                btn.setAttribute("class", "lsm-btn btn btn-secondary btn-outline-primary");
                btn.setAttribute("style", "width:" + width);
                buttons[i] = btn;
            }

            return buttons;
        }

        function drawBtn() {
            var default_levels = 4;
            var default_ratios = 1.2;
            var input_levels = document.querySelector("#lsm-input-level").value;
            var input_ratio = document.querySelector("#lsm-input-ratio").value;
            var levels = (input_levels > 0) ? input_levels : default_levels;
            var ratio = (input_ratio > 1) ? input_ratio : default_ratios;
            var parent = document.querySelector("#lsm-btn-group");
            var btnList = getBtns(parent, levels, ratio);
            clear(parent);

            for (var i = 0; i < levels; i++) {
                parent.appendChild(btnList[i]);
            }
        }
    }

);

