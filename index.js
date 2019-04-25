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
		const auth = Buffer.from(`${process.env.KEY}:${process.env.SECRET}`).toString('base64')
		var token_result = (await axios({
			url: token_url, 
			method: "post",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Referer": "https://content-service.bloomberg.com/auth/login",
				"Origin": "https://content-service.bloomberg.com",
				"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36",
				"Authorization": `Basic ${auth}`
			},
			withCredentials: true,
			data: {
				username: process.env.USERNAME,
				password: process.env.PASSWORD,
				remember: false,
				grant_type: "password",
			}
		})).data;
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
	axios.defaults.headers.common = {'Authorization': `Bearer ${token_result.access_token}`}
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
