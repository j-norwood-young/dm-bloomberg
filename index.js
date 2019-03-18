require("dotenv").config();
const axios = require("axios");

(async () => {
	const url = `${process.env.API_ENDPOINT}?fields=provider_uid&filter[provider]=${process.env.PROVIDER}`;
	console.log("Fetching articles", url);
	var storedArticleData = (await axios.get( url, {
		auth: {
			username: process.env.API_USERNAME,
			password: process.env.API_PASSWORD
		}
	})).data;
	console.log("Fetched articles", storedArticleData.count);
	var storedArticles = storedArticleData.data;

	// Set up Axios
	axios.defaults.headers.common = {'Authorization': `Bearer ${process.env.TOKEN}`}
	// Load the site
	console.log("Loading Articles", process.env.URL);
	try {
		var articles = (await axios.get(process.env.URL)).data.assets;
	} catch(err) {
		console.error("Could not find articles");
		throw(err);
	}
	
	for (let article of articles) {
		let exists = storedArticles.find(
			storedArticle =>
				storedArticle.provider_uid === article.uuid
		);
		if (exists) continue;
		let fullArticle = (await axios.get(`${process.env.ARTICLE_URL}${article.id}`)).data.asset;
		console.log(`Saving ${article.headline}`);
		let data = {
			headline: fullArticle.fields.headline.value,
			blurb: fullArticle.fields.description.value,
			provider_uid: article.uuid,
			body: fullArticle.fields.text.value,
			byline: fullArticle.fields.author.value,
			provider: "Bloomberg",
			date: fullArticle.published,
			keywords: article.terminal_slug,
		}
		try {
			await axios.post( process.env.API_ENDPOINT, data, {
				auth: {
					username: process.env.API_USERNAME,
					password: process.env.API_PASSWORD
				}
			});
		} catch(err) {
			console.error("Failed to save article", article.headline, article.uuid);
			console.error(err);
		}
	}
	console.log("Done")
})();
