'use strict';

const crawl = require('../lib/crawl').crawl;
const views = require('./scripts/views');
const eventbus = require('../lib/event-bus');
const hashTask = require('../lib/hash');
const storage = require('../lib/storage');
const clipboard = require('electron').clipboard;

angular
  .module('Search',['ngMaterial', 'ngMessages', 'ui.router'])
  .factory('StorageService', [function() {
    return {
      init: function(hash) {
        this.hash = hash;
      },
      getAllKeys: function() {
        if (!this.hash) {
          throw Error("The event bus must be initialized with a hash");
        }
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
  .controller('DialogCtrl', ['$scope', '$rootScope', '$mdDialog', 'BusService',
    function($scope, $rootScope, $mdDialog, BusService) {
      $scope.finished = false;
      $scope.page = 1;
      $scope.link = undefined;
      $scope.page = undefined;

      $rootScope.$on('crawl-topic:start', function(e, link) {
        $scope.link = link;
        $scope.$digest();
      });

      $rootScope.$on('crawl-page:start', function(e, page) {
        $scope.page = page;
        $scope.$digest();
      });

      $rootScope.$on('crawl-page:done', function(e, page, results) {
        $scope.results = results;
        $scope.$digest();
      });
      $rootScope.$on('crawl-all:done', function(e, hash) {
        $scope.finished = true;
        $scope.$digest();
      });

      $scope.seeAll = function() {
        $mdDialog.hide('see-all');
      }
    }])
  .controller('SearchCtrl',
    ['$scope', '$rootScope', '$state', '$mdDialog', 'CrawlService', 'StorageService', 'BusService',
    function($scope, $rootScope, $state, $mdDialog, CrawlService, StorageService, BusService) {
    $scope.search = {
      groupId: 'HZhome',
      page: 20,
      includes: ['西城广场', '文二西路', '文三西路'],
      excludes: ['翠苑']
    };

    $scope.submit = function($event, search) {
      $scope.finished = false;
      // switch router
      let hash = hashTask(search.groupId, search.includes, search.excludes);
      StorageService.init(hash);
      BusService.init(hash);

      BusService.on('crawl-topic:start', function(link) {
        console.log('start crawling ' + link.id);
        $rootScope.$broadcast('crawl-topic:start', link);
      });

      BusService.on('crawl-page:start', function(page) {
        console.log('start crawling ' + page);
        $rootScope.$broadcast('crawl-page:start', page);
      });

      BusService.on('crawl-page:done', function(page, results) {
        console.log('done crawling ' + results);
        $rootScope.$broadcast('crawl-page:done', page, results);
      });

      BusService.on('crawl-all:done', function(hash) {
        console.log('done crawling ' + hash);
        $rootScope.$broadcast('crawl-all:done', hash);
      });

      $mdDialog.show({
        controller: 'DialogCtrl',
        template: views.get('progress.html'),
        parent: angular.element(document.body),
        targetEvent: $event,
        clickOutsideToClose: false
      }).then(function(action) {
        if (action === 'see-all') {
          $state.go('result-all');
        }
      });

      CrawlService.crawl(search).then((results) => {
        $scope.finished = true;
        console.log(results);
        console.log(StorageService.getAll());
      });
    };
  }])
  .controller('ResultAllCtrl', ['$scope', '$state', '$mdToast',  'StorageService', 'BusService',
    function($scope, $state, $mdToast, StorageService, BusService) {
    try {
      $scope.results = StorageService.getAll();
    } catch (e) {
      $state.go('index');
    }
    $scope.navigate = function(result) {

    }

    $scope.back = function() {
      $state.go('index');
    }

    $scope.getToastPosition = function() {
      return 'bottom right';
    };

    $scope.clickResult = function(e, result) {
      e.preventDefault();
      clipboard.writeText(result.link);
      $mdToast.show(
        $mdToast.simple()
          .textContent('已复制链接' + result.link)
          .position($scope.getToastPosition())
          .hideDelay(3000)
      );
    }
  }])
  .filter("sanitize", ['$sce', function($sce) {
    return function(htmlCode){
      return $sce.trustAsHtml(htmlCode);
    }
  }])
  .config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise("/index");
    $stateProvider
      .state('index', {
        url: "/index",
        template: views.get('search.html'),
        controller: 'SearchCtrl'
      })
      // .state('result-page', {
      //   url: "/result-page",
      //   templateUrl: views.resultPage,
      //   controller: 'ResultPageCtrl'
      // })
      .state('result-all', {
        url: "/result-all",
        template: views.get('result-all.html'),
        controller: 'ResultAllCtrl'
      });
    }]);
