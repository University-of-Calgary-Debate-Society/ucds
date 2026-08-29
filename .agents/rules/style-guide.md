---
trigger: always_on
---

GENERAL:
Make sure the website feels dynamic and interactive. buttons should have hover animations, same with cards and interactable elements. The UI should be relatively modern and simple without too much clutter. Try to be concise.

COLORS:
The main colors for the pages should be #1C244C (matching colors with the logo), #0075A2 for a lighter blue, #53afd0 for an even lighter blue, white should be #F6F6F6. Dark blue should be #15162C. The website should be relatively monochromatic unless otherwise stated.

DARK AND LIGHT MODE:
Both modes should be available on every page of the website. Make sure that this is enforced unless otherwise stated. The website should follow the user's system or browser selection of dark or light mode unless they specifically toggle.

FONTS:
User different fonts for titles and body text, but make sure that the same fonts are used across the website unless explicitly stated.

ANIMATIONS AND TRANSITIONS:
Make sure that animations and transitions are seemless and smooth. This goes for loading screens, all pages, all sections, popups, toolbars etc. 

STYLE ORGANIZATION AND SYMMETRY:
To keep the website optimal and fast group styling together in the folder @css/[section name]/[page name]. Generally used styles for the whole website should be stored in @css. Do not create many different styles if unnecessary. Always check if there is are pre-existing css styles for new functions and pages.

PAGE ORGANIZATION:
Keep the repository organized by separating scripts, css and pages. the pages, other than home should fall under one of the 8 subcategories; void, executive, member, connect, events, communications, about, resources. all pages in executive should only be accessible if the user has the field isExecutive be true in the firestore.

HTTPS ERROR PAGES:
Error pages should always have the ability to return to the homepage as a button.