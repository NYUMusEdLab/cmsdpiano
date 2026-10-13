//Web Audio, SoundManager (w/ Flash)
Modernizr.load({
  test: Modernizr.webaudio,
  // test : false,
  yep: "./js/WebAudioNote.js",
  nope: "./js/SMNote.js",
  complete: function () {
    if (INST && INST.AUDIO) {
      //initialize the sound
      INST.AUDIO.initialize();
    }
  }
});

var $loadingWrapper = $("#loadingWrapper");
var $loadingBar = $("#loadingBar");
var $transparency = $(".transparency");
var $popupVisible = true;

const video = document.getElementsByTagName("video")[0];

//var orientation = (screen.orientation || {}).type || screen.mozOrientation || screen.msOrientation;

if (screen.orientation) {
  screen.orientation.addEventListener("change", () => {
    if (!$popupVisible) {
      if (screen.orientation.type.indexOf("portrait") >= 0) {
        video.pause();
      } else {
        video.play();
      }
    }
  });
} else if (window.orientation && !$popupVisible) {
  switch (window.orientation) {
    case 0:
    case 180:
      video.pause();
      // Portrait (Upside-down)
      break;
    case -90:
    case 90:
      video.play();
      // Landscape  (Counterclockwise)
      break;
  }
}

/*=============================================================================
	INST
=============================================================================*/
var INST = (function () {
  var version = "2.0";
  var isTouchDevice;

  //tally up the loading
  var totalLoad = 0;
  for (var i in KEYMAP) {
    totalLoad++;
  }

  function init() {
    console.log("Virtual Chamber Music v" + version);
    makeKeys();
    bindKeyboard();
  }

  if (is_touch_device()) isTouchDevice = true;
  else isTouchDevice = false;

  //all the piano keys
  var keys = [];

  function makeKeys() {
    for (var id in KEYMAP) {
      var k = new INST.KEY(id, KEYMAP[id].color);
      keys.push(k);
    }
  }

  // Track physical inputs separately: G and Left can hold the same note.
  var pressedKeys = {};
  var inputMode = document.getElementById("inputMode");
  var pianoSurface = document.getElementById("container");
  var makeyMode = false;

  function keyCode(event) {
    var code = event.code;
    if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
    var codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39,
      ArrowDown: 40, Space: 32, Comma: 188, Period: 190, Slash: 191 };
    return codes[code] || event.which || event.keyCode;
  }

  function isControl(target) {
    return !!(target && target.closest && target.closest(
      'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="textbox"]' +
      (makeyMode ? '' : ', video, audio')
    ));
  }

  function releaseKey(code) {
    var key = pressedKeys[code];
    if (!key) return;
    delete pressedKeys[code];
    if (Object.keys(pressedKeys).some(function (held) { return pressedKeys[held] === key; })) return;
    key.dom.isDown = false;
    key.dom.endNote();
    // Keyup releases the input/highlight; let the piano sample ring out.
  }

  function releaseKeyboard() {
    Object.keys(pressedKeys).forEach(releaseKey);
    // Only explicit cleanup interrupts sounding notes, including released tails.
    keys.forEach(function (key) {
      if (key.sound.stopNote) key.sound.stopNote();
    });
  }

  function bindKeyboard() {
    document.addEventListener("keydown", function (event) {
      if (!INST.loaded || $popupVisible || isControl(event.target) ||
          event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      var code = keyCode(event);
      var key = keys.find(function (candidate) {
        var mapping = KEYMAP[candidate.id];
        var pianoFocused = pianoSurface.contains(document.activeElement);
        return (mapping.color || (makeyMode && pianoFocused)) &&
          (mapping.keyCode === code || (mapping.extraKeyCodes || []).indexOf(code) !== -1);
      });
      if (!key) return;
      // Prevent scroll on every handled keydown, including OS auto-repeat.
      event.preventDefault();
      // Native video controls handle trusted keys before document bubbling.
      event.stopPropagation();
      if (pressedKeys[code] || event.repeat) return;
      pressedKeys[code] = key;
      if (key.dom.isDown) return;
      key.dom.isDown = true;
      key.dom.startNote();
    }, true);
    document.addEventListener("keyup", function (event) {
      var code = keyCode(event);
      if (pressedKeys[code]) {
        if (!isControl(event.target)) {
          event.preventDefault();
          event.stopPropagation();
        }
        releaseKey(code);
      }
    }, true);
    window.addEventListener("blur", releaseKeyboard);
    window.addEventListener("pagehide", releaseKeyboard);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) releaseKeyboard();
    });
    document.addEventListener("focusin", function (event) {
      if (isControl(event.target) || (makeyMode && !pianoSurface.contains(event.target))) releaseKeyboard();
    });
    if (inputMode) inputMode.addEventListener("click", function () {
      releaseKeyboard();
      makeyMode = !makeyMode;
      inputMode.setAttribute("aria-pressed", String(makeyMode));
      inputMode.textContent = "Makey Makey: " + (makeyMode ? "ON" : "Off");
      pianoSurface.focus({ preventScroll: true });
    });
  }

  var loadCount = 0;

  //called when a load is resolved
  function loadResolved() {
    loadCount++;
    var loadingBarWidth = (loadCount / totalLoad / 2) * 100 + "%";
    $loadingBar.width(loadingBarWidth);
    if (loadCount === totalLoad * 2) {
      allLoaded();
    }
  }

  function allLoaded() {
    $loadingWrapper.css("cursor", "pointer");
    $loadingBar.css("background-color", "#2c3b98");
    $(".loadingText").html("Click here to play");
    INST.loaded = true;
    $loadingWrapper.on("click", hidePopUp);
    $transparency.on("click", hidePopUp);
    //this hack to position the CMS logo
    // const imageLeftPosition = document
    //   .querySelector("#Gb4 img")
    //   .getBoundingClientRect().left;
    // const CMSLogo = document.querySelector("#titlebar");
    // CMSLogo.style.left = imageLeftPosition + "px";
    // focusUnfocus();
  }

  function hidePopUp() {
    if (INST.loaded === true) {
      if (INST.AUDIO.context && INST.AUDIO.context.state === "suspended") {
        INST.AUDIO.context.resume();
      }
      if (makeyMode) pianoSurface.focus({ preventScroll: true });
      else if ($(document.activeElement).closest(".popup").length) document.activeElement.blur();
      $(".popup, .transparency").fadeTo(500, 0, function () {
        $(this).css("display", "none");
        video.play();
        $popupVisible = false;
      });
    }
  }

  function showPopUp() {
    $popupVisible = true;
    releaseKeyboard();
    $(".popup, .transparency").fadeTo(500, 1, function () {
      $(this).css("display", "block");
      video.pause();
      $popupVisible = true;
    });
  }

  $(".helpBtn").click(showPopUp);

  //listen for unfocus events
  // function focusUnfocus() {
  //   $(window).blur(showClickHere);
  //   $(window).focus(function() {
  //     hidePopUp();
  //   });
  // }

  //API
  return {
    initialize: init,
    loadResolved: loadResolved,
    keys: keys,
    isTouchDevice: isTouchDevice,
    loaded: false
  };
})();

/*=============================================================================
	INST KEY

	trigger a sound when clicked
=============================================================================*/
INST.KEY = function (id, color) {
  this.id = id;
  this.color = color;
  //setup the dom
  this.dom = new INST.DOM(this);
  //setup the sound
  this.sound = new INST.PLAYER(this);
};

//called when a key is clicked
INST.KEY.prototype.startNote = function () {
  this.sound.startNote();
};

//called when the sound is done playing
INST.KEY.prototype.endNote = function () {
  // this.dom.endNote();
};

/*
	dom interaction
*/

INST.DOM = function (key) {
  this.key = key;
  //get the dom el
  this.$el = $("#" + key.id);
  //load the image and put it in the element
  var img = new Image();
  img.src = "./media/fullvideoimagesnew/" + KEYMAP[key.id].image + ".png";
  img.onload = $.proxy(this.imageLoaded, this);
  this.$img = $(img);
  //boolean value if the key is currently down to prevent multiple keyclicks while down
  this.isDown = false;
  //listen for keypresses
  this.$keyboardMobile = $(".keyboard-mobile");
  var that = this;

  if (key.color) {
    var currentClickedId;
    var keyboardKey = document.createElement("div");
    keyboardKey.classList.add(key.id);
    keyboardKey.classList.add("mobile-key");
    keyboardKey.style.backgroundColor = key.color;
    //first or single click
    keyboardKey.addEventListener("touchstart", function (e) {
      currentClickedId = that.key.id;
      e.preventDefault();
      that.isDown = true;
      that.startNote();
      keyboardKey.style.opacity = 1;
    });
    //sliding
    keyboardKey.addEventListener("touchmove", function (e) {
      e.preventDefault();
      var selectedEl = document.elementFromPoint(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY
      );
      var nextElementId =
        selectedEl &&
        $(selectedEl)
          .attr("class")
          .split(" ")[0];
      var newHighlighted = getClickedEl(e);
      var currentClickedEl = INST.keys.find(
        ({ id }) => id === currentClickedId
      );
      if (
        !$(selectedEl).hasClass(that.key.id) &&
        $(selectedEl).hasClass("mobile-key") &&
        currentClickedId !== nextElementId
      ) {
        //deactivate previous key
        if (currentClickedEl) {
          currentClickedEl.isDown = false;
          currentClickedEl.dom.endNote();
        }

        //
        currentClickedId = nextElementId;

        newHighlighted.isDown = true;
        var imageEl = $("#" + newHighlighted.id + " img");
        newHighlighted.$img = $(imageEl);
        newHighlighted.dom.startNote();
      }
    });
    keyboardKey.addEventListener("touchend", function (e) {
      e.preventDefault();
      var touchUpEl = getClickedEl(e); //in helpers.js
      touchUpEl.dom.isDown = false;
      touchUpEl.dom.endNote();
      keyboardKey.style.opacity = 0.6;
    });
    this.$mobileKey = $(keyboardKey);
    this.$keyboardMobile.append(keyboardKey);
  }

};

INST.DOM.prototype.imageLoaded = function () {
  this.$el.append(this.$img);
  this.$img.css("opacity", 0);
  var that = this;

  this.$img.on("mousedown touchstart", function (e) {
    e.preventDefault();
    that.startNote();
    return false;
  });
  this.$img.on("mouseup touchend", function (e) {
    e.preventDefault();
    that.endNote();
    return false;
  });
  if (!INST.isTouchDevice) this.$img.width(this.$img.height() * 1.78);

  $(window).resize(function () {
    // var mql = window.matchMedia("(orientation: portrait)");
    // console.log("mql", mql);
    if (!INST.isTouchDevice) that.$img.width(that.$img.height() * 1.78);
  });

  // this.$img.on("touchstart", $.proxy(this.startNote, this));
  INST.loadResolved();
};

//called when the sound is started
INST.DOM.prototype.startNote = function () {
  this.$img.css("opacity", 1);
  if (this.$mobileKey) {
    this.$mobileKey.css("opacity", 1);
    this.$mobileKey.css("border-top", "8px solid black");
  }
  this.key.startNote();
};

//called when the sound is done playing
INST.DOM.prototype.endNote = function () {
  this.$img.css("opacity", 0);
  if (this.$mobileKey) {
    this.$mobileKey.css("opacity", 0.6);
    this.$mobileKey.css("border", "none");
  }
};
