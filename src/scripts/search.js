'use strict';

const startCrawl = require('../lib/crawl').crawl;

angular
  .module('Search',['ngMaterial', 'ngMessages'])
  .factory('crawl', [function() {
    return function(search) {
      return startCrawl(search.groupId, search.page, search.includes, search.excludes);
    }
  }])
  .controller('SearchCtrl', ['$scope', 'crawl', function($scope, crawl) {
    $scope.search = {
      groupId: '',
      page: undefined,
      includes: ['西城广场', '文二西路', '文三西路'],
      excludes: ['翠苑']
    };

    $scope.submit = function(search) {
      console.log(search);
      // TODO: call service, switch router
      crawl(search);
    }
  }]);
