# Backloggd PS5 Pro Maintainer

This script is designed to maintain the PS5 Pro console enhanced games list on the Backloggd website.

It has to be a script to run in typescript.
Since there is no API for the Backloggd website, we have to use the website's HTML and CSS to extract the data. Also it has the same problem on the ps5 store website.

The script has to retrieve the data from both sites and compare the data.

After that the maintainer has to update the data in the Backloggd website.

This is the ps store ps5 pro enhanced games list: https://store.playstation.com/es-es/category/1d443305-2dcf-4543-8f7e-8c6ec409ecbf/1

This is the public list on backloggd: https://backloggd.com/u/Termeni/list/ps5-pro-enhanced-games/

We also want to identify if a game has been added to the list by error but actually it is not in the ps5 pro enhanced group. Also we just want to log and notify the changes by now we will just log the changes with a console log when running the script, we will deal with how to notify update the backloggd list in the future.
