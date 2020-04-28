//Web Audio, SoundManager (w/ Flash)
Modernizr.load({
  test: Modernizr.webaudio,
  // test : false,
  yep: "./js/WebAudioNote.js",
  nope: "./js/SMNote.js",
  complete: function() {
    if (INST && INST.AUDIO) {
      //initialize the sound
      INST.AUDIO.initialize();
    }
  }
});

var $loadingWrapper = $("#loadingWrapper");
var $loadingBar = $("#loadingBar");
const video = document.getElementsByTagName("video")[0];

screen.orientation.addEventListener("change", () => {
  if (screen.orientation.type.indexOf("portrait") >= 0) {
    video.pause();
  } else {
    video.play();
  }
});

//console.log(ScreenOrientation);

/*=============================================================================
	INST
=============================================================================*/
var INST = (function() {
  var version = "2.0";
  var isTouchDevice;

  //tally up the loading
  var totalLoad = 0;
  for (var i in KEYMAP) {
    totalLoad++;
  }

  function init() {
    console.log("Virtual Chamber Music v" + version);
    //$(document).one("click", handleRotation);
    makeKeys();
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

  var loadCount = 0;

  //called when a load is resolved
  function loadResolved() {
    loadCount++;
    var loadingBarWidth = (loadCount / totalLoad / 2) * 100 + "%";
    console.log(loadingBarWidth, "width");
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
      $(".popup, .transparency").fadeTo(500, 0, function() {
        $(this).css("display", "none");
        video.play();
      });
    }
  }

  function showPopUp() {
    $(".popup, .transparency").fadeTo(500, 1, function() {
      $(this).css("display", "block");
      video.pause();
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
INST.KEY = function(id, color) {
  this.id = id;
  this.color = color;
  //setup the dom
  this.dom = new INST.DOM(this);
  //setup the sound
  this.sound = new INST.PLAYER(this);
};

//called when a key is clicked
INST.KEY.prototype.startNote = function() {
  this.sound.startNote();
};

//called when the sound is done playing
INST.KEY.prototype.endNote = function() {
  // this.dom.endNote();
};

/*
	dom interaction
*/

INST.DOM = function(key) {
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
  //if it's an A then bind it to the mouseclick
  /*	if (key.id === "A"){
		$(document).mousedown(function(e){
			e.preventDefault();
			if (INST.loaded){
				that.startNote();
			}
		});
		$(document).mouseup(function(e){
			e.preventDefault();
			if (INST.loaded){
				that.endNote();
			}
		});
  }*/
  if (key.color) {
    var currentClickedId;
    var keyboardKey = document.createElement("div");
    keyboardKey.classList.add(key.id);
    keyboardKey.classList.add("mobile-key");
    keyboardKey.style.backgroundColor = key.color;
    //first or single click
    keyboardKey.addEventListener("touchstart", function(e) {
      currentClickedId = that.key.id;
      e.preventDefault();
      that.isDown = true;
      that.startNote();
      keyboardKey.style.opacity = 1;
    });
    //sliding
    keyboardKey.addEventListener("touchmove", function(e) {
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
    keyboardKey.addEventListener("touchend", function(e) {
      e.preventDefault();
      var touchUpEl = getClickedEl(e); //in helpers.js
      touchUpEl.dom.isDown = false;
      touchUpEl.dom.endNote();
      keyboardKey.style.opacity = 0.6;
    });
    this.$mobileKey = $(keyboardKey);
    this.$keyboardMobile.append(keyboardKey);
  }

  $(document).keydown(function(e) {
    var whichKey = KEYMAP[key.id].keyCode;
    var instructionsVisibility = $(".transparency").css("display");
    if (
      e.which === whichKey &&
      INST.loaded &&
      !that.isDown &&
      instructionsVisibility !== "block"
    ) {
      e.preventDefault();
      that.isDown = true;
      that.startNote();
    }
  });
  $(document).keyup(function(e) {
    var whichKey = KEYMAP[key.id].keyCode;
    if (e.which === whichKey && INST.loaded) {
      that.isDown = false;
      that.endNote();
    }
  });
};

INST.DOM.prototype.imageLoaded = function() {
  this.$el.append(this.$img);
  this.$img.css("opacity", 0);
  var that = this;

  this.$img.on("mousedown touchstart", function(e) {
    e.preventDefault();
    that.startNote();
    return false;
  });
  this.$img.on("mouseup touchend", function(e) {
    e.preventDefault();
    that.endNote();
    return false;
  });
  if (!INST.isTouchDevice) this.$img.width(this.$img.height() * 1.78);

  $(window).resize(function() {
    // var mql = window.matchMedia("(orientation: portrait)");
    // console.log("mql", mql);
    if (!INST.isTouchDevice) that.$img.width(that.$img.height() * 1.78);
  });

  // this.$img.on("touchstart", $.proxy(this.startNote, this));
  INST.loadResolved();
};

//called when the sound is started
INST.DOM.prototype.startNote = function() {
  this.$img.css("opacity", 1);
  this.$mobileKey.css("opacity", 1);
  this.$mobileKey.css("border-top", "8px solid black");
  this.key.startNote();
};

//called when the sound is done playing
INST.DOM.prototype.endNote = function() {
  this.$img.css("opacity", 0);
  this.$mobileKey.css("opacity", 0.6);
  this.$mobileKey.css("border", "none");
};
