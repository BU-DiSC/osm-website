$(function () { // Same as document.addEventListener("DOMContentLoaded"...
  // enable tooltip
  // $('[data-toggle="tooltip"]').tooltip()
  // enable tooltip for dynamic content
  $('body').tooltip({
    selector: '[data-toggle="tooltip"]',
    html: true,
  });

  $('span[data-toggle="tooltip"]').on('shown.bs.tooltip', function () {
    MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

  });

  $("#cmp-leveling").click(function (event) {
    $("#cmp-tiering").removeClass("btn-active");
    $("#cmp-vlsm-tiering").removeClass("btn-active");
    $("#cmp-rlsm-tiering").removeClass("btn-active");
    if (!$("#cmp-leveling").hasClass("btn-active")) {
      $("#cmp-leveling").addClass("btn-active");
    }
    if (!$("#cmp-vlsm-leveling").hasClass("btn-active")) {
      $("#cmp-vlsm-leveling").addClass("btn-active");
    }
    if (!$("#cmp-rlsm-leveling").hasClass("btn-active")) {
      $("#cmp-rlsm-leveling").addClass("btn-active");
    }
  });
  $("#cmp-tiering").click(function (event) {
    $("#cmp-leveling").removeClass("btn-active");
    $("#cmp-vlsm-leveling").removeClass("btn-active");
    $("#cmp-rlsm-leveling").removeClass("btn-active");
    if (!$("#cmp-tiering").hasClass("btn-active")) {
      $("#cmp-tiering").addClass("btn-active");
    }
    if (!$("#cmp-vlsm-tiering").hasClass("btn-active")) {
      $("#cmp-vlsm-tiering").addClass("btn-active");
    }
    if (!$("#cmp-rlsm-tiering").hasClass("btn-active")) {
      $("#cmp-rlsm-tiering").addClass("btn-active");
    }
  });
  $("#cmp-vlsm-leveling").click(function (event) {
    $("#cmp-vlsm-tiering").removeClass("btn-active");
    $("#cmp-tiering").removeClass("btn-active");
    if (!$("#cmp-vlsm-leveling").hasClass("btn-active")) {
      $("#cmp-vlsm-leveling").addClass("btn-active");
    }
  });
  $("#cmp-vlsm-tiering").click(function (event) {
    $("#cmp-vlsm-leveling").removeClass("btn-active");
    $("#cmp-leveling").removeClass("btn-active");
    if (!$("#cmp-vlsm-tiering").hasClass("btn-active")) {
      $("#cmp-vlsm-tiering").addClass("btn-active");
    }
  });
  $("#cmp-rlsm-leveling").click(function (event) {
    $("#cmp-rlsm-tiering").removeClass("btn-active");
    $("#cmp-tiering").removeClass("btn-active");
    if (!$("#cmp-rlsm-leveling").hasClass("btn-active")) {
      $("#cmp-rlsm-leveling").addClass("btn-active");
    }
  });
  $("#cmp-rlsm-tiering").click(function (event) {
    $("#cmp-rlsm-leveling").removeClass("btn-active");
    $("#cmp-leveling").removeClass("btn-active");
    if (!$("#cmp-rlsm-tiering").hasClass("btn-active")) {
      $("#cmp-rlsm-tiering").addClass("btn-active");
    }
  });

  // Same as document.querySelector("#navbarToggle").addEventListener("blur",...
  $("#navbarToggle").blur(function (event) {
    var screenWidth = window.innerWidth;
    if (screenWidth < 991) {
      $("#collapsable-nav").collapse('hide');
    }
  });

  // In Firefox and Safari, the click event doesn't retain the focus
  // on the clicked button. Therefore, the blur event will not fire on
  // user clicking somewhere else in the page and the blur event handler
  // which is set up above will not be called.
  $("#navbarToggle").click(function (event) {
    $(event.target).focus();
  });
});
