'use strict';

const crawl = require('../lib/crawl').crawl;
// const views = require('./views');
const eventbus = require('../lib/event-bus');
const hashTask = require('../lib/hash');
const storage = require('../lib/storage');

angular
  .module('Search',['ngMaterial', 'ngMessages'])
  .factory('StorageService', [function() {
    return {
      init: function(hash) {
        this.hash = hash;
      },
      getAllKeys: function() {
        return Object.keys(storage.getItem(this.hash));
      },
      getAll: function() {
        let keys = this.getAllKeys();
        return keys.map(key => this.getItem(key));
      },
      getItem: storage.getItem,
      storage: storage
    };
  }])
  .factory('CrawlService', [function() {
    return {
      crawl: function(search) {
        return crawl(search.groupId, search.page, search.includes, search.excludes);
      }
    };
  }])
  .factory('BusService', [function() {
    return {
      emit: function(event) {
        if (!this.hash) {
          throw Error("The event bus must be initialized with a hash");
        }
        eventbus.emit.apply(eventbus, event + ':' + this.hash, arguments.slice(1))
      },
      on: function(event, fn) {
        if (!this.hash) {
          throw Error("The event bus must be initialized with a hash");
        }
        this.handlers[event] = this.handlers[event] || [];
        this.handlers[event].push(fn);
        eventbus.on(event + ':' + this.hash, fn);
      },
      init: function(hash) {
        this.handlers = this.handlers || {};
        Object.keys(this.handlers).forEach(event => {
          this.handlers[event].forEach(handler => {
            eventbus.removeListener(event + ':' + this.hash, handler);
          });
        });
        this.hash = hash;
        this.handlers = {};
      }
    }
  }])
  .controller('SearchCtrl',
    ['$scope', 'CrawlService', 'StorageService', 'BusService',
    function($scope, CrawlService, StorageService, BusService) {
    $scope.search = {
      groupId: 'HZhome',
      page: 20,
      includes: ['西城广场', '文二西路', '文三西路'],
      excludes: ['翠苑']
    };

    $scope.submit = function(search) {
      // console.log(search);
      $scope.finished = false;
      // TODO: call service, switch router
      let hash = hashTask(search.groupId, search.includes, search.excludes);
      StorageService.init(hash);
      BusService.init(hash);
      BusService.on('crawl-topic:done', function(link, result) {
        console.log('done crawling ' + result.id);
      });

      BusService.on('crawl-page:done', function(page, results) {
        console.log('done crawling ' + results);
      });

      CrawlService.crawl(search).then((results) => {
        $scope.finished = true;
        console.log(results);
        console.log(StorageService.getAll());
      });
      // setInterval(() => {
      //   console.log('1 second')
      // }, 1000);
    };
  }])
  // .controller('ProgressCtrl', ['$scope', 'BusService', function($scope, BusService) {
  //   $scope.topic = {};
  //   $scope.page = {};
  //   $scope.total = 0;

  //   BusService.on('init-progress', function() {
  //     $scope.topic = {};
  //     $scope.page = {};
  //     $scope.total = 0;
  //   });

  //   BusService.on('crawl-topic:sleep', function(link, delay) {
  //     $scope.topic[link] = $scope.topic[link] || {};
  //     $scope.topic[link].status = 'delay';
  //     $scope.topic[link].delay = delay;
  //   });
  //   BusService.on('crawl-topic:start', function(link) {
  //     $scope.topic[link] = $scope.topic[link] || {};
  //     $scope.topic[link].status = 'start';
  //   });
  //   BusService.on('crawl-topic:done', function(link) {
  //     $scope.topic[link] = $scope.topic[link] || {};
  //     $scope.topic[link].status = 'done';
  //   });
  //   BusService.on('crawl-page:start', function(page) {
  //     $scope.page[page] = $scope.page[page] || {};
  //     $scope.page[page].status = 'start';
  //   });
  //   BusService.on('crawl-page:done', function(page, length) {
  //     $scope.page[page] = $scope.page[page] || {};
  //     $scope.page[page].status = 'done';
  //     $scope.total = length;
  //   });
  // }])
  .controller('ResultAllCtrl', ['$scope', 'StorageService', 'BusService',
    function($scope, StorageService, BusService) {
    let keys = StorageService.getAll();
    keys.forEach(key => {
      $scope.result[key] = StorageService.getItem(key);
    });

    // BusService.on('crawl-topic:done', function(link) {
    //   let id = link.match(/\/topic\/(\d+)/)[1];
    //   $scope.results[id] = $scope.results[id] || StorageService.getItem(id);
    // });

    // BusService.on('crawl-page:done', function(page, length) {
    //   let keys = StorageService.getAll();
    //   keys.forEach(key => {
    //     $scope.result[key] = $scope.result[key] || StorageService.getItem(key);
    //   });
    // });
  }]);
  // .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
  //   $urlRouterProvider.otherwise("/index");
  //   $stateProvider
  //     .state('index', {
  //       url: "/index",
  //       template: views.index,
  //       controler: 'SearchCtrl'
  //     })
  //     .state('result-page', {
  //       url: "/result-page",
  //       templateUrl: views.resultPage,
  //       controller: 'ResultPageCtrl'
  //     })
  //     .state('result-all', {
  //       url: "/result-all",
  //       templateUrl: views.resultAll,
  //       controller: 'ResultAllCtrl'
  //     });
  //   }]);
