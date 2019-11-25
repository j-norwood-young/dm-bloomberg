require("dotenv").config();
const axios = require("axios");
const qs = require("qs");

const headers = {
	"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:71.0) Gecko/20100101 Firefox/71.0",
	"Origin": "https://mercury.bloomberg.com",
	"Content-Type": "application/json;charset=utf-8",
	"Accept": "application/json, text/plain, */*",
	"Accept-Language": "en-US,en;q=0.5",
	"Referer": "https://mercury.bloomberg.com/login",
	"DNT": 1,
}

axios.interceptors.request.use((request) => {
	if (request.data && request.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
		request.data = qs.stringify(request.data);
	}
	return request;
});

(async () => {
	console.time("Bloomberg");
	try {
		// Log In
		try {
			console.log(`Signing in at ${process.env.LOGIN_URL}`);
			const result = await axios.post(`${process.env.LOGIN_URL}`, {
				email: process.env.USERNAME,
				password: process.env.PASSWORD
			}, {
				headers,
			});
			var accessToken = result.data.token;
		} catch (error) {
			throw(error.message);
		}

		// Fetch list of existing articles
		const url = `${process.env.API_ENDPOINT}/article?fields=provider_uid&filter[provider]=${process.env.PROVIDER}&limit=100&sort[date_created]=-1`;
		console.log("Fetching articles", url);
		var storedArticleData = (await axios.get(url, {
			auth: {
				username: process.env.API_USERNAME,
				password: process.env.API_PASSWORD
			}
		})).data;
		console.log("Fetched articles", storedArticleData.count);
		var storedArticles = storedArticleData.data;

		// Search articles from Bloomberg
		try {
			var articles = (await axios.post(process.env.SEARCH_URL, {
				"query": "",
				"filters": {
					"global": { "publishedDate": new Date().toISOString() },
					"media": {
						"text": true,
						"photo": false,
						"video": false
					},
					"dateRange": {
						"before": null,
						"after": null
					},
					"photo": {
						"landscape": false,
						"portrait": false,
						"creative": false,
						"editorial": false
					},
					"video": {
						"shortForm": true,
						"longForm": true,
						"english": true,
						"spanish": false,
						"japanese": false
					},
					"languages": [],
					"feeds": [],
					"contexts": {
						"topics": [],
						"companies": [],
						"people": [],
						"brands": [],
						"series": []
					}
				},
				"limit": 30
			}, 
			{
				headers: Object.assign(headers, {
					"Referer": "https://mercury.bloomberg.com/search",
					"Cookie": `login=${accessToken}`
				})
			})).data.results;
			// console.log({ articles });
		} catch (error) {
			// console.log(error);
			throw (error.message);
		}

	} catch(err) {
		console.error(err);
		process.exit(1);
	}
	for (let article of articles) {
		let exists = storedArticles.find(
			storedArticle =>
				storedArticle.provider_uid === article.id
		);
		let fullArticle = (await axios.get(`${process.env.ARTICLE_URL}${article.id}`,
			{
				headers: Object.assign(headers, {
					"Referer": "https://mercury.bloomberg.com/search",
					"Cookie": `login=${accessToken}`
				})
			})).data.story;
		// console.log(`Saving ${fullArticle}`);
		let data = {
			headline: fullArticle.headline.seo,
			blurb: fullArticle.summary.seo,
			provider_uid: article.id,
			body: fullArticle.body.html,
			byline: fullArticle.byline,
			provider: process.env.PROVIDER,
			date: fullArticle.publishedAt,
			keywords: fullArticle.brand,
		}
		try {
			if (exists) {
				console.log(`Updating existing article ${data.headline}`);
				await axios.put(`${process.env.API_ENDPOINT}/article/${exists._id}`, data, {
					auth: {
						username: process.env.API_USERNAME,
						password: process.env.API_PASSWORD
					}
				});
			} else {
				console.log(`Posting new article ${data.headline}`);
				await axios.post( `${process.env.API_ENDPOINT}/article`, data, {
					auth: {
						username: process.env.API_USERNAME,
						password: process.env.API_PASSWORD
					}
				});
			}
		} catch(err) {
			console.error("Failed to save article", article.headline, article.uuid);
			console.error(err);
		}
	}
	console.timeEnd("Bloomberg");
})();
