const axios = require('axios'); // HTTP 请求库
const cheerio = require('cheerio'); // HTML 解析库
const fs = require('fs'); // 文件操作
const request = require('request'); // 用于下载图片

// 基础 URL
const BASE_URL = 'https://movie.douban.com/top250';

// 爬取单个页面的数据
async function fetchMoviesFromPage(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }, // 模拟浏览器
        });
        const $ = cheerio.load(response.data); // 加载 HTML 内容
        const movies = [];

        // 遍历 .item 元素
        $('.item').each((index, element) => {
            const movie = {};
            movie.name = $(element).find('.title').first().text(); // 电影名
            movie.score = parseFloat($(element).find('.rating_num').text()); // 评分
            movie.ratings = parseInt($(element).find('.star span').last().text().replace('人评价', '')); // 评价人数
            movie.quote = $(element).find('.inq').text() || '无引言'; // 引言
            movie.ranking = parseInt($(element).find('.pic em').text()); // 排名
            movie.coverUrl = $(element).find('.pic img').attr('src'); // 封面图片链接
            movies.push(movie);
        });

        return movies;
    } catch (error) {
        console.error(`请求失败: ${url}, 错误: ${error.message}`);
        return [];
    }
}

// 爬取多页数据
async function fetchAllMovies() {
    const movies = [];
    for (let start = 0; start < 250; start += 25) {
        const url = `${BASE_URL}?start=${start}`;
        console.log(`正在抓取: ${url}`);
        const moviesFromPage = await fetchMoviesFromPage(url);
        movies.push(...moviesFromPage); // 合并数组
        await sleep(2000); // 请求间隔，防止被封
    }
    return movies;
}

// 保存数据到 JSON 文件
function saveToJSON(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`数据已保存到文件: ${filename}`);
}

// 下载电影封面图片
function downloadCovers(movies) {
    const downloadDir = './covers';
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir); // 如果目录不存在，则创建

    movies.forEach((movie, index) => {
        const sanitizedTitle = movie.name.replace(/[<>:"/\\|?*]+/g, '_'); // 处理特殊字符
        const filePath = `${downloadDir}/${sanitizedTitle}.jpg`;
        request(movie.coverUrl).pipe(fs.createWriteStream(filePath));
        console.log(`下载封面: ${movie.coverUrl} -> ${filePath}`);
    });
}

// 延时函数
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 主函数
(async function main() {
    console.log('开始爬取豆瓣电影 Top250...');
    const movies = await fetchAllMovies(); // 获取所有电影数据
    saveToJSON('douban_movies.json', movies); // 保存到 JSON 文件
    downloadCovers(movies); // 下载封面图片
    console.log('爬取完成！');
})();
