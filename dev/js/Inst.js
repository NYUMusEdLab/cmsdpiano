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

/*=============================================================================
	INST
=============================================================================*/
var INST = (function() {
  var version = "2.0";

  //tally up the loading
  var totalLoad = 0;
  for (var i in KEYMAP) {
    totalLoad++;
  }

  function init() {
    console.log("Virtual Chamber Music v" + version);
    makeKeys();
  }

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
    if (loadCount === totalLoad * 2) {
      allLoaded();
    }
  }

  function allLoaded() {
    $("#loadingText").html("Click here to play");
    var $loading = $("#loading");
    $loading.css("cursor", "pointer");
    $loading.one("click", hideClickHere);
    INST.loaded = true;
    // focusUnfocus();
  }

  function hideClickHere() {
    $("#loading").fadeTo(500, 0, function() {
      $(this).css("z-index", -1);
    });
  }

  function showClickHere() {
    var $loading = $("#loading");
    $loading.css("z-index", 1000);
    $loading.fadeTo(500, 0.95);
  }

  //listen for unfocus events
  function focusUnfocus() {
    $(window).blur(showClickHere);
    $(window).focus(function() {
      hideClickHere();
    });
  }

  //API
  return {
    initialize: init,
    loadResolved: loadResolved,
    keys: keys,
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

$(".closeBtn").click(e => {
  $(".popup").css("display", "none");
  $(".transparency").css("display", "none");
});

$(".helpBtn").click(e => {
  $(".popup").css("display", "block");
  $(".transparency").css("display", "block");
});

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
  var other = that;
  //console.log(this.$keyboardMobile);
  if (key.color) {
    var keyboardKey = document.createElement("div");
    keyboardKey.classList.add(key.id);
    keyboardKey.classList.add("mobile-key");
    keyboardKey.style.backgroundColor = key.color;
    keyboardKey.addEventListener("touchstart", function(e) {
      e.preventDefault();
      that.isDown = true;
      that.startNote();
      keyboardKey.style.opacity = 1;
    });
    //sliding
    var currentClicked;
    keyboardKey.addEventListener("touchmove", function(e) {
      e.preventDefault();
      var selectedEl = document.elementFromPoint(
        e.touches[0].clientX,
        e.touches[0].clientY
      );
      var nextElementId =
        selectedEl &&
        $(selectedEl)
          .attr("class")
          .split(" ")[0];
      if (
        !$(selectedEl).hasClass(that.key.id) &&
        $(selectedEl).hasClass("mobile-key") &&
        currentClicked !== nextElementId
      ) {
        currentClicked = nextElementId;
        var newHighlighted = INST.keys.find(({ id }) => id === nextElementId);

        newHighlighted.isDown = true;
        img.src =
          "./media/fullvideoimagesnew/" + KEYMAP[nextElementId].image + ".png";
        console.log("KEYMAP[nextElementId].image", KEYMAP[nextElementId].image);
        img.onload = $.proxy(this.imageLoaded, this);
        newHighlighted.$img = $(img);
        newHighlighted.startNote();
        //selectedEl.style.opacity = 1;
        other = newHighlighted;
      }
    });
    keyboardKey.addEventListener("touchend", function(e) {
      e.preventDefault();
      that.isDown = false;
      that.endNote();
      keyboardKey.style.opacity = 0.6;
      //console.log("that", that);
    });
    this.$mobileKey = $(keyboardKey);
    this.$keyboardMobile.append(keyboardKey);
  }

  $(document).keydown(function(e) {
    var whichKey = KEYMAP[key.id].keyCode;
    var instructionsVisibility = $(".transparency").css("display");
    console.log(instructionsVisibility);
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
  this.$img.width(this.$img.height() * 1.78);

  $(window).resize(function() {
    that.$img.width(that.$img.height() * 1.78);
  });

  // this.$img.on("touchstart", $.proxy(this.startNote, this));
  INST.loadResolved();
};

//called when the sound is started
INST.DOM.prototype.startNote = function() {
  this.$img.css("opacity", 1);
  this.$mobileKey.css("opacity", 1);
  this.key.startNote();
};

//called when the sound is done playing
INST.DOM.prototype.endNote = function() {
  this.$img.css("opacity", 0);
  this.$mobileKey.css("opacity", 0.6);
};
