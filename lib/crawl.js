'use strict';

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const co = require('co');
const sleep = require('co-sleep');
const storage = require('./storage');
const eventbus = require('./event-bus');
const hashTask = require('./hash');
const crypto = require('crypto');

const OFFSET = 25;

function crawlTopic(link, delay, hash) {
  return co(function *() {
    eventbus.emit('crawl-topic:sleep:' + hash, link, delay);
    yield sleep(delay);
    eventbus.emit('crawl-topic:start:' + hash, link);
    let page = yield fetch(link.href).then(res => res.text());

    let $ = cheerio.load(page, {
      decodeEntities: false
    });
    let content = $('#content');
    let topic = content.find('.topic-doc').html();
    let date = new Date(content.find('.color-green').text());
    let result = {
      link: link.href,
      id: link.id,
      title: link.title,
      content: topic,
      date: date
    };

    eventbus.emit('crawl-topic:done:' + hash, link, result);
    return result;
  });
}

function crawlPage(startUrl, offset, includes, excludes, exists, hash) {
  return co(function *() {
    let url = startUrl + '?start=' + offset;
    let index = yield fetch(url).then(res => res.text());

    let $ = cheerio.load(index);
    let links = $('.olt .title a').map((idx, link) => ({
      title: $(link).attr('title'),
      href: $(link).attr('href'),
      id: $(link).attr('href').match(/\/topic\/(\d+)/)[1]
    }));

    let crawlLinks = links.toArray().filter(
      link => !excludes.some(ex => link.title.includes(ex))
    ).filter(
      link => includes.some(inc => link.title.includes(inc))
    );

    let cachedLinks = crawlLinks.filter(link => exists(link.id));
    let newLinks = crawlLinks.filter(link => !exists(link.id));

    let crawlQueue = newLinks.map(
      link => crawlTopic(link, Math.random() * 1000, hash)
    ).concat(cachedLinks.map(
      link => {
        let result = storage.getItem(link.id);
        eventbus.emit('crawl-topic:done:' + hash, link, result);
        return result;
      }
    ));

    return yield Promise.all(crawlQueue);
  });
}

function crawl(groupId, page, includes, excludes) {
  return co(function *() {
    // TODO: handle invalid ID
    // check http://api.douban.com/v2/group/:groupid for 'msg'
    let startUrl = 'http://www.douban.com/group/' + groupId + '/discussion';
    let hash = hashTask(groupId, includes, excludes);

    if (!storage.getItem(hash)) {
      storage.setItem(hash, {});
    }

    // TODO: emit progress
    for (var i = 0; i < page; ++i) {
      eventbus.emit('crawl-page:start:' + hash, i + 1);
      let results = yield crawlPage(startUrl, i * OFFSET, includes, excludes, storage.getItem, hash);
      let items = storage.getItem(hash);
      results.forEach(result => {
        items[result.id] = true;
      })
      yield storage.setItem(hash, items);
      yield Promise.all(results.map(function(result) {
        return storage.setItem(result.id, result);
      }));
      eventbus.emit('crawl-page:done:' + hash, i + 1, Object.keys(storage.getItem(hash)));
    }

    return storage.getItem(hash);
  });
}

exports.crawl = crawl;
