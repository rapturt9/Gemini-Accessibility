window.addEventListener("load", (event) => {
  const htmlContent = document.documentElement.outerHTML;
  //console.log("iframe loaded");
  //console.log(htmlContent.slice(0, 100));
  window.parent.postMessage({ type: "html", htmlContent: htmlContent }, "*");
});

const tooltips = {};

function toggleTooltipState(num) {
  const tooltipValsArray = tooltips[num];
  const tooltip = tooltipValsArray[0][0];
  const variant = tooltip.style.background === "rgb(92, 92, 92)";
  for (let i = 0; i < tooltipValsArray.length; i++) {
    const tooltipVals = tooltipValsArray[i];
    const suggestion = tooltipVals[2];
    console.log(suggestion);
    const element = document.evaluate(
      tooltipVals[1],
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    console.log(element);
    if (variant) {
      tooltip.style.background = "#F37B38";
      element.outerHTML = suggestion.New;
    } else {
      tooltip.style.background = "#5C5C5C";
      element.outerHTML = suggestion.Current;
    }
  }
  console.log("sending message");
  window.parent.postMessage(
    {
      type: "tooltipToggled",
      tooltipNum: num,
      variant,
    },
    "*"
  );
}

function positionTooltip(element, tooltip, existingCount) {
  const rect = element.getBoundingClientRect();
  let numOffset = Math.floor(existingCount / 2);
  let placement = "left";
  if (existingCount % 2 === 1) {
    placement = "right";
    numOffset *= -1;
  }

  // Calculate the position based on the element's position and size
  let left =
    rect.left + (placement === "left" ? -tooltip.offsetWidth : rect.width);
  let top = rect.top + window.scrollY;

  // Apply the position with an offset
  tooltip.style.left = `${left - 35 * numOffset}px`;
  tooltip.style.top = `${top}px`;
}

function createTooltipForTextElement(
  element,
  suggestion,
  existingCount,
  suggestions
) {
  const tooltip = document.createElement("div");
  //tooltip.className = "tooltip";
  tooltip.textContent = suggestion.num;
  tooltip.style.position = "absolute";
  tooltip.style.background = "#5C5C5C";
  tooltip.style.color = "white";
  tooltip.style.fontWeight = "bold";
  tooltip.style.borderRadius = "4px";
  tooltip.style.fontSize = "18px";
  tooltip.style.height = "28px";
  tooltip.style.width = "30px";
  tooltip.style.textAlign = "center";
  tooltip.style.cursor = "pointer";
  tooltip.style.zIndex = "2147483647";
  let arr = [];
  for (let suggestion of suggestions) {
    arr.push([tooltip, suggestion.xpath, suggestion]);
  }
  tooltips[suggestion.num] = arr;

  document.body.appendChild(tooltip);

  tooltip.addEventListener("click", () => {
    toggleTooltipState(suggestion.num);
  });

  positionTooltip(element, tooltip, existingCount);
}

const xpathTooltipsCreated = {};

function normalizeHTMLString(html) {
  return html.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}

function getLongestCommonSubstring(a, b) {
  a = normalizeHTMLString(a);
  b = normalizeHTMLString(b);

  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  let length = 0,
    end = 0;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > length) {
          length = dp[i][j];
          end = i;
        }
      }
    }
  }
  return a.substring(end - length, end).length / Math.max(a.length, b.length);
}

function constructXPath(element) {
  const paths = [];
  while (element.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = element;

    while (sibling) {
      if (
        sibling.nodeType === Node.ELEMENT_NODE &&
        sibling.nodeName === element.nodeName
      ) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = element.nodeName.toLowerCase();
    const pathIndex = index > 1 ? `[${index}]` : "";
    paths.unshift(`${tagName}${pathIndex}`);
    element = element.parentNode;
  }

  return paths.length ? `/${paths.join("/")}` : null;
}

function getXPath(target) {
  console.log("get xpath");
  const targetElementString = target.Current;
  let bestMatchElement = null;
  let bestMatchLength = 0;
  console.log(target.xpath);
  if (target.xpath) {
    bestMatchElement = document.evaluate(
      target.xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    console.log(bestMatchElement);
    if (bestMatchElement) {
      return bestMatchElement;
    } else {
      console.log("no element found");
    }
  }

  console.log(targetElementString);

  function traverseDOM(element) {
    let children = element.children;
    for (let child of children) {
      const commonSubstring = getLongestCommonSubstring(
        child.outerHTML,
        targetElementString
      );
      if (commonSubstring > bestMatchLength) {
        bestMatchLength = commonSubstring;
        bestMatchElement = child;
        if (commonSubstring === 1) return true;
      }

      if (traverseDOM(child)) return true;
    }
  }
  //console.log(document.body);
  //traverseDOM(document.body);

  return bestMatchElement;
}

function attachTooltip(suggestions) {
  /*const element = document.evaluate(
      suggestion.xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    console.log(suggestion);*/
  const suggestion = suggestions[0];
  console.log(suggestion);
  const element = getXPath(suggestion);
  console.log(element);
  if (element) {
    let existingCount = xpathTooltipsCreated[suggestion.xpath] || 0;
    console.log(existingCount);
    console.log("create element");
    createTooltipForTextElement(
      element,
      suggestion,
      existingCount,
      suggestions
    );

    xpathTooltipsCreated[suggestion.xpath] = existingCount + 1;
  } else {
    console.log("no element found");
  }
}

window.addEventListener("message", (event) => {
  try {
    const eventJson = JSON.parse(event.data);

    //to delete
    if (eventJson["getHTML"]) {
      const htmlContent = document.documentElement.outerHTML;
      console.log("sending html");
      window.parent.postMessage(
        { type: "html", htmlContent: htmlContent },
        "*"
      );
    }
    if (eventJson["ABHeroSuggestion"]) {
      const suggestion = eventJson["ABHeroSuggestion"];
      console.log(suggestion);
      attachTooltip(suggestion);
    }
    if (eventJson["ABHeroChange"]) {
      const num = eventJson["ABHeroChange"]["num"];

      toggleTooltipState(num);
    }

    if (eventJson["SitewizSuggestion"]) {
      const suggestion = eventJson["SitewizSuggestion"];
      console.log(suggestion);
      attachTooltip(suggestion);
    }
    if (eventJson["SitewizChange"]) {
      const num = eventJson["SitewizChange"]["num"];
      console.log(eventJson);
      toggleTooltipState(num);
    }
  } catch (err) {
    return;
  }
});
