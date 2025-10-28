# Scrapping settings

Right now there is no correct strategy to scrape the ps store and backloggd websites.
The current state is to assume that we have an infinite scroll and we have to scroll to the bottom of the page to load all the games.
This is not correct, it exist pagination in the ps store website and we have to use the pagination to load all the games.
The same happens with the backloggd website, it exist pagination and we have to use the pagination to load all the games.

Also the ps store website contains this specific text where we can obtain the total number of games we have to extract: "Mostrando 24 de 195 resultados."

So having this into account we have to fix the scrapping strategy.
