function is_touch_device() {
  var prefixes = " -webkit- -moz- -o- -ms- ".split(" ");

  var mq = function (query) {
    return window.matchMedia(query).matches;
  };

  if (
    "ontouchstart" in window ||
    (window.DocumentTouch && document instanceof DocumentTouch)
  ) {
    return true;
  }

  // include the 'heartz' as a way to have a non matching MQ to help terminate the join
  // https://git.io/vznFH
  var query = ["(", prefixes.join("touch-enabled),("), "heartz", ")"].join("");
  return mq(query);
}

function getClickedEl(e) {
  var lastElDom = document.elementFromPoint(
    e.changedTouches[0].clientX,
    e.changedTouches[0].clientY
  );
  if ($(lastElDom).hasClass('mobile-key')) {
    var lastElId =
      lastElDom &&
      $(lastElDom)
        .attr("class")
        .split(" ")[0];
    var lastEl = INST.keys.find(({ id }) => id === lastElId);
    return lastEl;
  }

}
