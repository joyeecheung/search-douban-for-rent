'use strict';

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const co = require('co');
const sleep = require('co-sleep');
const storage = require('node-persist');
const OFFSET = 25;

function crawlPage(link, delay) {
  return co(function *() {
    yield sleep(delay);
    let page = yield fetch(link.href).then(res => res.text());

    let $ = cheerio.load(page, {
      decodeEntities: false
    });
    let content = $('#content');
    let topic = content.find('.topic-doc').html();
    let date = new Date(content.find('.color-green').text());

    return {
      link: link.href,
      id: link.id,
      title: link.title,
      content: topic,
      date: date
    }
  });
}

function crawlFrom(startUrl, offset, includes, excludes, exists) {
  return co(function *() {
    let index = yield fetch(startUrl + '?start=' + offset)
      .then(res => res.text());
    let $ = cheerio.load(index);
    let links = $('.olt .title a').map((idx, link) => ({
      title: $(link).attr('title'),
      href: $(link).attr('href'),
      id: $(link).attr('href').match(/\/topic\/(\d+)/)[1]
    }));

    let crawlLinks = links.toArray().filter(
      link => !exists(link.id)
    ).filter(
      link => !excludes.some(ex => link.title.includes(ex))
    ).filter(
      link => includes.some(inc => link.title.includes(inc))
    );

    let crawlQueue = crawlLinks.map(link => crawlPage(link, Math.random() * 1000));

    return yield Promise.all(crawlQueue);
  });
}

function crawl(groupId, page, includes, excludes) {
  return co(function *() {
    // TODO: handle invalid ID
    // check http://api.douban.com/v2/group/:groupid for 'msg'
    let startUrl = 'http://www.douban.com/group/' + groupId + '/discussion';
    yield storage.init({
      logging: true,
      dir: __dirname + '/data'
    });

    // TODO: emit progress
    for (var i = 0; i < page; ++i) {
      // console.log('Searching page...' + page);
      let results = yield crawlFrom(startUrl, i * OFFSET, includes, excludes, storage.getItem);
      yield Promise.all(results.map(function(result) {
        return storage.setItem(result.id, result);
      }));
    }

    return storage.persist();
  });
}

exports.crawl = crawl;
