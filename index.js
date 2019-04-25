require("dotenv").config();
const axios = require("axios");
const qs = require("qs");

axios.interceptors.request.use((request) => {
	if (request.data && request.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
		request.data = qs.stringify(request.data);
	}
	return request;
  });

(async () => {
	try {
		const token_url = `https://api.bloomberg.com/syndication/token`;
		const credentials = {
			client: {
				id: process.env.KEY,
				secret: process.env.SECRET
			},
			auth: {
				tokenHost:`https://api.bloomberg.com`,
				tokenPath: `/syndication/token`
			}
		};
		const oauth2 = require('simple-oauth2').create(credentials);
		// Get the access token object.
		const tokenConfig = {
			username: process.env.USERNAME,
			password: process.env.PASSWORD,
		};
		// Save the access token
		try {
			const result = await oauth2.clientCredentials.getToken(tokenConfig);
			var accessToken = oauth2.accessToken.create(result);
		} catch (error) {
			console.log('Access Token Error', error.message);
		}
		
	} catch(err) {
		console.error(err);
		process.exit(1);
	}
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
	axios.defaults.headers.common = {'Authorization': `Bearer ${accessToken.token.access_token}`}
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
				storedArticle.provider_uid === article.id
		);
		if (exists) continue;
		let fullArticle = (await axios.get(`${process.env.ARTICLE_URL}${article.id}`)).data.asset;
		console.log(`Saving ${article.headline}`);
		let data = {
			headline: fullArticle.fields.headline.value,
			blurb: fullArticle.fields.description.value,
			provider_uid: article.id,
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
