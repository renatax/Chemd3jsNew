'use strict';

var App = angular.module('chematicaD3jsApp');

App.controller('MainCtrl', function ($scope, $http) {


    // Get the graph model ($scope.graph)
    // FIXME: this should be in a service
    $http.get('example_retro.json').success(function (data) {
        // Process the data into something we can draw:
        var idx = 0;
        var result = {
            'nodes': [],
            'links': []
        };

        data.idx = idx;
        var currentNodes = [data];

        while (currentNodes.length) {
            var newNodes = [];
            currentNodes.forEach(function (node) {
                result.nodes[node.idx] = {
                    'name': node.smiles,
                    'nodeType': 'chemical',
                    'idx': node.idx
                };
                (node.syntheses || []).forEach(function (child) {
                    var reactionIdx = (idx += 1);
                    result.nodes[reactionIdx] = {
                        'name': child.rxid,
                        'nodeType': 'reaction',
                        'idx': reactionIdx
                    };
                    result.links.push({'source': reactionIdx, 'target': node.idx, 'value': 1 });
                    child.synthons.forEach(function (synthon) {
                        synthon.idx = (idx += 1);
                        result.links.push({'source': idx, 'target': reactionIdx, 'value': 1 });
                        newNodes.push(synthon);
                    });
                });
            });
            currentNodes = newNodes;
        }
        $scope.graph = result;
    });
});

App.directive('d3Graph', function () {
    return {
        restrict: 'E',
        replace: true,
        scope: {
            // FIXME: d3Graph should get the graph from a service, not from the controller scope
            graph: '='
        },
        // FIXME: This does not make a uniquely selectable element :(
        template: '<div id="chart"></div>',
        link: function (scope, element, attrs) {
            // Initialize our graph state
            scope.width = scope.$eval(attrs.width);
            scope.height = scope.$eval(attrs.height);
            scope.scale = 1;
            scope.a = {x: 0, y: 0};
            scope.b = {x: 0, y: 0};

            // FIXME: Does nothing
            var color = d3.scale.category20();

            var force = d3.layout.force()
                .charge(-130)
                .linkDistance(30)
                .size([scope.width, scope.height]);

            var svg = d3.select('div#chart')
                .append('svg')
                .attr('width', scope.width)
                .attr('height', scope.height)

            svg.append('svg:defs')
                .append('svg:marker')
                .attr('id', 'arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 15)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5');

            var bg = svg.append('rect')
                .attr('width', scope.width)
                .attr('height', scope.height)
                .style('fill', '#333');

            var g = svg.append('g');

            var updateTransform = function () {
                g.attr('transform',
                    'translate(' + scope.a + ') scale(' + scope.scale + ') translate(' + scope.b + ') '
                );
            };

            // Rescale the graph based on the scale set by the view
            // Rescales based on the center of the graph
            scope.mousewheel = function (event) {
                var scale_ = scope.scale + event.deltaY;
                if (scale_ >= 0.1) {
                    scope.a = [ event.originalEvent.offsetX, event.originalEvent.offsetY];
                    scope.b = [ -scope.width / 2, -scope.height / 2 ];
                    scope.scale = scale_;
                }
                updateTransform();
                event.preventDefault();
            };


            //scope.$watch('scale', updateTransform);

            scope.$watch('graph', function () {
                if (!scope.graph || !scope.graph.nodes || !scope.graph.links) {
                    return;
                }

                force.nodes(scope.graph.nodes)
                    .links(scope.graph.links)
                    .start();

                var chemicalNodes = scope.graph.nodes.filter(function (d) {
                    return d.nodeType === 'chemical';
                });
                var reactionNodes = scope.graph.nodes.filter(function (d) {
                    return d.nodeType === 'reaction';
                });

                // Format the chemical nodes
                var chemNode = g.selectAll('.node')
                    .data(chemicalNodes, function (d) {
                        return d.idx;
                    })
                    .enter()
                    .append('circle')
                    .attr('r', 5)
                    .attr('class', 'node')
                    .style('fill', function (d) {
                        return color(d.group);
                    })
                    .call(force.drag);

                chemNode.append('title')
                    .text(function (d) {
                        return d.name;
                    });

                // Format the reaction nodes
                var rxNode = g.selectAll('.node')
                    .data(reactionNodes, function (d) {
                        return d.idx;
                    })
                    .enter()
                    .append('rect')
                    .attr('class', 'node')
                    .attr('width', 10)
                    .attr('height', 10)
                    .style('fill', function (d) {
                        return color(d.group);
                    })
                    .call(force.drag);

                rxNode.append('title')
                    .text(function (d) {
                        return d.name;
                    });

                // FIXME: link start and end points are ugly ~Ling
                var link = g.selectAll('.link')
                    .data(scope.graph.links).enter()
                    .append('line')
                    .attr('class', 'link')
                    .attr('marker-end', function () {
                        return 'url(#arrow)';
                    })
                    .style('stroke-width', function (d) {
                        return Math.sqrt(d.value);
                    });

                var updateForceGraph = function () {
                    link.attr('x1', function (d) {
                        return d.source.x;
                    })
                        .attr('y1', function (d) {
                            return d.source.y;
                        })
                        .attr('x2', function (d) {
                            return d.target.x;
                        })
                        .attr('y2', function (d) {
                            return d.target.y;
                        });


                    chemNode.attr('cx', function (d) {
                        return d.x;
                    })
                        .attr('cy', function (d) {
                            return d.y;
                        });

                    rxNode.attr('x', function (d) {
                        return d.x - 5;
                    })
                        .attr('y', function (d) {
                            return d.y - 5;
                        });
                };

                force.on('tick', updateForceGraph);
            });
        }
    };
});

App.directive('slider', function () {
    return {
        restrict: 'E',
        replace: true,
        template: '<div id="slider"></div>',
        link: function ($scope) {
            d3.select('#slider').call(
                d3.slider(d3.slider().axis(true).step(1)).on("slide", function (evt, value) {
                    $scope.$apply(function () {
                        $scope.scale = 0.7 + (value + 20) / 50;
                    });
                })
            );
        }
    };
});
