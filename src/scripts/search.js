angular
  .module('Search',['ngMaterial', 'ngMessages'])
  .controller('SearchCtrl', function($scope) {
    $scope.search = {
      groupId: '',
      page: undefined,
      includes: ['西城广场', '文二西路', '文三西路'],
      excludes: ['翠苑']
    };

    $scope.submit = function(search) {
      // TODO: call service, switch router
      console.log(search);
    }
  });
