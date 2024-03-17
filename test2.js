const completion = `Thought: The main landmark identifies the main content of the document, which is the calendar interface. I will add a <main> element around the calendar interface.
Correct: [['<html lang="en-US" dir="ltr">', '<html lang="en-US" dir="ltr">'], ['<div class="gEc4r"><img src="//ssl.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_74x24dp.png" class="TrZEUc" alt="Google" width="74" height="24"></div>,<div jsname="paFcre"><div class="aMfydd" jsname="tJHJj"><h1 class="Tn0LBd" jsname="r4nke">Sign in</h1><p class="a2CQh" jsname="VdSJob">to continue to Google Calendar</p></div></div>,<div class="Flfooc"><main>,<p class="vOZun"><span jsslot=""><div class="D4rY0b"><p class="vOZun">Not your computer? Use a private browsing window to sign in. <a href="https://support.google.com/accounts?p=signin_privatebrowsing&amp;hl=en-US" jsname="JFyozc" target="_blank">Learn more about using Guest mode</a></p></div></span><div class="tmMcIf" jsname="QkNstf"', '<div class="gEc4r"><img src="//ssl.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_74x24dp.png" class="TrZEUc" alt="Google" width="74" height="24"></div>,<div jsname="paFcre"><div class="aMfydd" jsname="tJHJj"><h1 class="Tn0LBd" jsname="r4nke">Sign in</h1><p class="a2CQh" jsname="VdSJob">to continue to Google Calendar</p></div></div>,<div class="Flfooc"><main>,<p class="vOZun"><span jsslot=""><div class="D4rY0b"><p class="vOZun">Not your computer? Use a private browsing window to sign in. <a href="https://support.google.com/accounts?p=signin_privatebrowsing&amp;hl=en-US" jsname="JFyozc" target="_blank">Learn more about using Guest mode</a></p></div></span><div class="tmMcIf" jsname="QkNstf']]

Thought: All page content is contained by landmarks. I will add a <main> element around the calendar interface, which will contain all page content.
Correct: [['<main><div class="D4rY0b"><p class="vOZun">Not your computer? Use a private browsing window to sign in. <a href="https://support.google.com/accounts?p=signin_privatebrowsing&amp;hl=en-US" jsname="JFyozc" target="_blank">Learn more about using Guest mode</a></p></div></span>,<div class="tmMcIf" jsname="QkNstf">', '<main><div class="D4rY0b"><p class="vOZun">Not your computer? Use a private browsing window to sign in. <a href="https://support.google.com/accounts?p=signin_privatebrowsing&amp;hl=en-US" jsname="JFyozc" target="_blank">Learn more about using Guest mode</a></p></div></span><div class="tmMcIf" jsname="QkNstf']]

Thought: The select element has an accessible name. I will add an aria-label to the select element.
Correct: [['<select name="hl" class="N158t" data-language-selector-select="" jsname="rfCUpd">', '<select name="hl" class="N158t" data-language-selector-select="" aria-label="Language selector" jsname="rfCUpd">']]`;

const parseDisplayedFixes = (displayedFixes) => {
  const fixes = [];
  const sections = displayedFixes.split("Thought:").slice(1); // Split by 'Thought:', ignore the first empty slice

  sections.forEach((section) => {
    const [thought, correctPart] = section
      .split("Correct:")
      .map((part) => part.trim());
    const correctMatches = correctPart.match(/\[\[.*?\]\]/g); // Match nested arrays

    const correct = correctMatches
      ? correctMatches.map((match) => {
          // Remove the wrapping brackets and split by ','
          return match
            .slice(2, -2)
            .split("','")
            .map((str) => str.trim());
        })
      : [];

    fixes.push({
      action: thought,
      correct: correct,
    });
  });

  return fixes;
};

console.log(JSON.stringify(parseDisplayedFixes(completion)));
