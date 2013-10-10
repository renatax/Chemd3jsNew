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
        link: function (scope, element) {
            // Initialize our graph state
            scope.width = element.width();
            // FIXME: This should inherit out the height from the element somehow
            scope.height = element.height();

            scope.scale = 1;
            scope.a = [0,0];

            // FIXME: Does nothing
            var color = d3.scale.category20();

            var force = d3.layout.force()
                .charge(-130)
                .linkDistance(30)
                .size([scope.width, scope.height]);

            var svg = d3.select('div#chart').append('svg');


            svg.append('svg:defs')
                .append('svg:marker')
                .attr('id', 'arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 18)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5');

            // Create the background and foreground
            var bg = svg.append('rect').style('fill', '#333');

            var setDim = function () {
                scope.width = element.width();
                scope.height = element.height();
                svg.attr('width', scope.width).attr('height', scope.height);
                bg.attr('width', scope.width).attr('height', scope.height);
            };
            setDim();
            $( window ).resize(setDim);

            var fg = svg.append('g').attr('transform', 'scale (' + scope.scale + ')');

            // Update the foreground's position
            var updateTransform = function () {
                fg.attr('transform',
                    'translate(' + scope.a + ') scale(' + scope.scale + ')'
                );
            };
            
            // Rescale the graph foreground based when the user scrolls
            // FIXME: uses funny scrolling.  Use good scrolling ~ling
            scope.mousewheel = function (event) {
                var scale_ = scope.scale + event.deltaY;
                if (scale_ >= 0.1) {
                    scope.a = [ event.originalEvent.offsetX - scale_ * scope.width / 2,
                                event.originalEvent.offsetY - scale_ * scope.height / 2];
//                    scope.a = [ scope.a[0] * scale_ + event.originalEvent.offsetX - scale_ * event.originalEvent.offsetX / 2,
//                                scope.a[1] * scale_ + event.originalEvent.offsetY - scale_ * event.originalEvent.offsetY / 2];
                    scope.scale = scale_;
                    console.log(scope.a,scope.scale);
                    updateTransform();
                }
                event.preventDefault();
            };

            // Translate the graph's foreground when the user clicks the background
            var drag = d3.behavior.drag()
                .on("drag", function(d,i) {
                    scope.a[0] +=  d3.event.dx;
                    scope.a[1] +=  d3.event.dy;
                    updateTransform();
                });
            bg.call(drag);

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

                // FIXME: link start and end points are ugly ~Ling
                var link = fg.selectAll('.link')
                    .data(scope.graph.links).enter()
                    .append('line')
                    .attr('class', 'link')
                    .attr('marker-end', function () {
                        return 'url(#arrow)';
                    })
                    .style('stroke-width', function (d) {
                        return Math.sqrt(d.value);
                    });

                // Format the chemical nodes
                var chemNode = fg.selectAll('.node')
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
                var rxNode = fg.selectAll('.node')
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
