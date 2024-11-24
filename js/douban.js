const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request');

const BASE_URL = 'https://movie.douban.com/top250';

async function fetchMoviesFromPage(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }, // 模拟浏览器
        });
        const $ = cheerio.load(response.data);
        const movies = [];

        $('.item').each((index, element) => {
            const e = cheerio.load(element);
            try {
                const movie = {};
                movie.name = e('.title').text() || '未知电影';
                movie.score = parseFloat(e('.rating_num').text()) || 0;
                movie.quote = e('.inq').text() || '无引言';
                movie.ranking = parseInt(e('.pic em').text()) || 0;
                movie.coverUrl = e('.pic img').attr('src') || '';
                movies.push(movie);
            } catch (err) {
                console.error('解析条目时出错:', err.message);
                console.error('错误条目 HTML:', e.html());
            }
        });

        return movies;
    } catch (error) {
        console.error(`请求失败: ${url}, 错误: ${error.message}`);
        return [];
    }
}

async function fetchAllMovies() {
    const movies = [];
    for (let start = 0; start < 250; start += 25) {
        const url = `${BASE_URL}?start=${start}`;
        console.log(`正在抓取: ${url}`);
        const moviesFromPage = await fetchMoviesFromPage(url);
        movies.push(...moviesFromPage);
        await sleep(2000); // 等待 2 秒，防止被封
    }
    return movies;
}

function saveToJSON(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`数据已保存到文件: ${filename}`);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async function main() {
    console.log('开始爬取豆瓣电影 Top250...');
    const movies = await fetchAllMovies();
    saveToJSON('douban_movies.json', movies);
    console.log('爬取完成！');
})();
