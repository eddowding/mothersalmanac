'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as d3 from 'd3'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  slug: string
  viewCount?: number
  category?: string
  confidenceScore?: number
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  strength: number
}

interface KnowledgeGraphProps {
  currentSlug?: string
  maxNodes?: number
  className?: string
}

/**
 * KnowledgeGraph Component
 * Interactive D3.js force-directed graph visualization
 *
 * Features:
 * - Force-directed layout with physics simulation
 * - Node size based on view count
 * - Color coding by topic category
 * - Click to navigate to page
 * - Zoom and pan controls
 * - Hover highlighting
 * - Current page highlighting
 */
export function KnowledgeGraph({
  currentSlug,
  maxNodes = 50,
  className
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/wiki/graph?maxNodes=${maxNodes}`)
        if (!response.ok) throw new Error('Failed to fetch graph data')
        const data = await response.json()
        setGraphData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGraphData()
  }, [maxNodes])

  // Render D3 graph
  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight || 600

    // Clear previous graph
    svg.selectAll('*').remove()

    // Set up SVG
    svg.attr('width', width).attr('height', height)

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create main group for zooming
    const g = svg.append('g')

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(d => 100 / (d.strength + 0.1)) // Stronger links = shorter distance
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))

    // Create links
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(graphData.links)
      .join('line')
      .attr('class', 'graph-link')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', d => 0.3 + (d.strength * 0.4))
      .attr('stroke-width', d => 1 + (d.strength * 3))

    // Create nodes
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(graphData.nodes)
      .join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => {
        const baseSize = 8
        const viewBonus = d.viewCount ? Math.min(d.viewCount / 100, 12) : 0
        return baseSize + viewBonus
      })
      .attr('fill', d => getCategoryColor(d.category))
      .attr('stroke', d => d.slug === currentSlug ? '#f59e0b' : '#fff')
      .attr('stroke-width', d => d.slug === currentSlug ? 3 : 2)
      .attr('opacity', d => d.confidenceScore ? 0.6 + (d.confidenceScore * 0.4) : 0.8)

    // Add labels to nodes
    node.append('text')
      .text(d => d.title)
      .attr('x', 12)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#334155')
      .attr('opacity', 0.8)
      .style('pointer-events', 'none')

    // Add tooltips and interactions
    node.on('mouseenter', function(event, d) {
      // Highlight node
      const baseSize = 8
      const viewBonus = d.viewCount ? Math.min(d.viewCount / 100, 12) : 0
      const newRadius = (baseSize + viewBonus) * 1.3

      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', newRadius)
        .attr('stroke-width', 4)

      // Highlight label
      d3.select(this).select('text')
        .transition()
        .duration(200)
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .attr('opacity', 1)

      // Highlight connected links
      link
        .attr('stroke-opacity', l =>
          (l.source as any).id === d.id || (l.target as any).id === d.id
            ? 0.8
            : 0.1
        )
    })
    .on('mouseleave', function(event, d) {
      // Reset node
      const baseSize = 8
      const viewBonus = d.viewCount ? Math.min(d.viewCount / 100, 12) : 0
      const normalRadius = baseSize + viewBonus
      const strokeWidth = d.slug === currentSlug ? 3 : 2

      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('r', normalRadius)
        .attr('stroke-width', strokeWidth)

      // Reset label
      d3.select(this).select('text')
        .transition()
        .duration(200)
        .attr('font-size', '11px')
        .attr('font-weight', 'normal')
        .attr('opacity', 0.8)

      // Reset links
      link
        .attr('stroke-opacity', l => 0.3 + (l.strength * 0.4))
    })
    .on('click', (event, d) => {
      router.push(`/wiki/${d.slug}`)
    })

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y)

      node.attr('transform', d => `translate(${(d as any).x},${(d as any).y})`)
    })

    // Store zoom controls reference
    ;(svgRef.current as any).__zoom__ = zoom
    ;(svgRef.current as any).__svg__ = svg

  }, [graphData, currentSlug, router])

  const handleZoomIn = () => {
    const svg = (svgRef.current as any).__svg__
    const zoom = (svgRef.current as any).__zoom__
    if (svg && zoom) {
      svg.transition().duration(300).call(zoom.scaleBy, 1.3)
    }
  }

  const handleZoomOut = () => {
    const svg = (svgRef.current as any).__svg__
    const zoom = (svgRef.current as any).__zoom__
    if (svg && zoom) {
      svg.transition().duration(300).call(zoom.scaleBy, 0.7)
    }
  }

  const handleReset = () => {
    const svg = (svgRef.current as any).__svg__
    const zoom = (svgRef.current as any).__zoom__
    if (svg && zoom) {
      svg.transition().duration(500).call(
        zoom.transform,
        d3.zoomIdentity
      )
    }
  }

  if (isLoading) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading knowledge graph...</p>
        </div>
      </Card>
    )
  }

  if (error || !graphData) {
    return (
      <Card className={cn('p-8', className)}>
        <div className="text-center text-sm text-muted-foreground">
          {error || 'Failed to load graph'}
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomIn}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleZoomOut}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleReset}
          aria-label="Reset view"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Badge variant="secondary">
          {graphData.nodes.length} pages
        </Badge>
        <Badge variant="secondary">
          {graphData.links.length} connections
        </Badge>
      </div>

      {/* Graph container */}
      <div ref={containerRef} className="w-full h-[600px]">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-900 rounded-md p-3 shadow-md border border-border">
        <p className="text-xs font-medium mb-2 text-muted-foreground">Categories</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <div key={category} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-900 rounded-md p-2 shadow-md border border-border text-xs text-muted-foreground">
        Drag to pan • Scroll to zoom • Click node to navigate
      </div>
    </Card>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  'age-range': '#10b981', // green
  'symptom': '#ef4444',   // red
  'technique': '#3b82f6', // blue
  'product': '#8b5cf6',   // purple
  'concept': '#64748b',   // gray
  'default': '#94a3b8'    // slate
}

function getCategoryColor(category?: string): string {
  if (!category) return CATEGORY_COLORS.default
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default
}
