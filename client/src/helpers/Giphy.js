import { GiphyFetch } from "@giphy/js-fetch-api";

const giphy = new GiphyFetch(process.env.REACT_APP_GIPHY_API_KEY);

async function getGif(success = false) {
  const { data: results } = await giphy.search(success ? "winner" : "loser");
  const gif =
    results[Math.floor(Math.random() * Math.floor(results.length - 1))];

  const { width: originalWidth, height: originalHeight } = gif.images.original;
  const ratio = originalWidth / originalHeight;

  return { ...gif, ratio };
}

export { getGif };
