// @ts-nocheck
/**
 * Property Network Graph
 * ----------------------
 * Interactive D3.js force-directed graph showing spatial relationships
 * between properties using GNN network analysis.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Info,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface PropertyNode {
  id: number;
  name: string;
  price: number;
  type: 'residential' | 'commercial' | 'land';
  neighborhood: string;
  centrality: number; // 0-1
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface PropertyLink {
  source: number | PropertyNode;
  target: number | PropertyNode;
  strength: number; // 0-1
  type: 'spatial' | 'market' | 'feature';
}

interface PropertyNetworkGraphProps {
  nodes: PropertyNode[];
  links: PropertyLink[];
  width?: number;
  height?: number;
  highlightedNodeId?: number;
  onNodeClick?: (node: PropertyNode) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNodeColor(node: PropertyNode): string {
  if (node.centrality > 0.8) return '#10b981'; // green-500
  if (node.centrality > 0.6) return '#3b82f6'; // blue-500
  if (node.centrality > 0.4) return '#f59e0b'; // amber-500
  return '#6b7280'; // gray-500
}

function getNodeSize(node: PropertyNode): number {
  return 5 + node.centrality * 15; // 5-20px radius
}

function getLinkColor(link: PropertyLink): string {
  switch (link.type) {
    case 'spatial':
      return '#3b82f6'; // blue
    case 'market':
      return '#10b981'; // green
    case 'feature':
      return '#f59e0b'; // amber
    default:
      return '#6b7280'; // gray
  }
}

function formatCurrency(value: number): string {
  return `₦${(value / 1000000).toFixed(1)}M`;
}

// ============================================================================
// Component
// ============================================================================

export default function PropertyNetworkGraph({
  nodes,
  links,
  width = 800,
  height = 600,
  highlightedNodeId,
  onNodeClick,
}: PropertyNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [linkDistance, setLinkDistance] = useState([100]);
  const [chargeStrength, setChargeStrength] = useState([30]);
  const [selectedNode, setSelectedNode] = useState<PropertyNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation<PropertyNode>(nodes)
      .force('link', d3.forceLink<PropertyNode, PropertyLink>(links)
        .id(d => d.id)
        .distance(linkDistance[0])
        .strength(link => link.strength)
      )
      .force('charge', d3.forceManyBody().strength(-chargeStrength[0]))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeSize(d) + 5));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => getLinkColor(d))
      .attr('stroke-opacity', d => 0.2 + d.strength * 0.6)
      .attr('stroke-width', d => 1 + d.strength * 3);

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => getNodeSize(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => d.id === highlightedNodeId ? '#fbbf24' : '#fff')
      .attr('stroke-width', d => d.id === highlightedNodeId ? 3 : 1.5)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, PropertyNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add node labels
    const labels = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', 10)
      .attr('dx', d => getNodeSize(d) + 5)
      .attr('dy', 3)
      .attr('fill', '#374151')
      .style('pointer-events', 'none');

    // Node click handler
    node.on('click', (event, d) => {
      setSelectedNode(d);
      if (onNodeClick) {
        onNodeClick(d);
      }
    });

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute hidden bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm z-50')
      .style('pointer-events', 'none');

    node.on('mouseenter', (event, d) => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
        .html(`
          <div class="font-semibold">${d.name}</div>
          <div class="text-gray-600">${d.neighborhood}</div>
          <div class="mt-1">
            <div><strong>Price:</strong> ${formatCurrency(d.price)}</div>
            <div><strong>Centrality:</strong> ${(d.centrality * 100).toFixed(0)}%</div>
            <div><strong>Type:</strong> ${d.type}</div>
          </div>
        `)
        .classed('hidden', false);
    });

    node.on('mouseleave', () => {
      tooltip.classed('hidden', true);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as PropertyNode).x || 0)
        .attr('y1', d => (d.source as PropertyNode).y || 0)
        .attr('x2', d => (d.target as PropertyNode).x || 0)
        .attr('y2', d => (d.target as PropertyNode).y || 0);

      node
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);

      labels
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0);
    });

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [nodes, links, width, height, linkDistance, chargeStrength, highlightedNodeId, onNodeClick]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Property Network Graph
            </CardTitle>
            <CardDescription>
              Interactive visualization of spatial relationships and network centrality
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-xs">Link Distance: {linkDistance[0]}px</Label>
            <Slider
              value={linkDistance}
              onValueChange={setLinkDistance}
              min={50}
              max={200}
              step={10}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Repulsion Strength: {chargeStrength[0]}</Label>
            <Slider
              value={chargeStrength}
              onValueChange={setChargeStrength}
              min={10}
              max={100}
              step={5}
            />
          </div>
        </div>

        {/* Graph */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="w-full"
            style={{ minHeight: '600px' }}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-semibold mb-2">Node Colors (Centrality)</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>High (80-100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Medium-High (60-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Medium (40-60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span>Low (&lt;40%)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Link Types</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500" />
                <span>Spatial Proximity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-green-500" />
                <span>Market Similarity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-amber-500" />
                <span>Feature Match</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle className="text-base">Selected Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-semibold">{selectedNode.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-semibold">{formatCurrency(selectedNode.price)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Neighborhood</p>
                  <p className="font-semibold">{selectedNode.neighborhood}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Network Centrality</p>
                  <p className="font-semibold">{(selectedNode.centrality * 100).toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-900">
            <strong>Tip:</strong> Drag nodes to rearrange the graph. Scroll to zoom. Click nodes for details.
            Node size and color indicate network centrality (importance in the property network).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
