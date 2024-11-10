import React, {useEffect, useState} from 'react';
import ReactFlow, {Node, Edge, Background, Controls, MiniMap, MarkerType, isNode, isEdge} from 'react-flow-renderer';
import axios from '../utils/axiosConfig';
import {RelationshipRead} from '../types';
import useSchema from '../hooks/useSchema';
import {Typography} from '@mui/material';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (elements: (Node | Edge)[], direction = 'LR') => {
    dagreGraph.setGraph({rankdir: direction});

    elements.forEach(el => {
        if (isNode(el)) {
            dagreGraph.setNode(el.id, {width: nodeWidth, height: nodeHeight});
        } else if (isEdge(el)) {
            dagreGraph.setEdge(el.source, el.target);
        }
    });

    dagre.layout(dagreGraph);

    return elements.map(el => {
        if (isNode(el)) {
            const nodeWithPosition = dagreGraph.node(el.id);
            el.position = {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            };
        }
        return el;
    });
};

const NodeView: React.FC = () => {
    const {schema, loading} = useSchema();
    const [relationships, setRelationships] = useState<RelationshipRead[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const fetchRelationships = async () => {
        try {
            const response = await axios.get(`${process.env.API_BASE_URL}/relationships/`);
            setRelationships(response.data);
        } catch (error) {
            console.error('Error fetching relationships:', error);
        }
    };

    useEffect(() => {
        fetchRelationships();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema]);

    useEffect(() => {
        if (!loading) {
            buildGraph();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [relationships, schema, loading]);

    const buildGraph = () => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // Create nodes for each table
        Object.keys(schema).forEach(tableName => {
            nodes.push({
                id: tableName,
                data: {label: tableName},
                position: {x: 0, y: 0}, // Will be set by layout
                type: 'default',
            });
        });

        // Create edges for each relationship
        relationships.forEach(rel => {
            edges.push({
                id: `e${rel.from_table}-${rel.to_table}-${rel.id}`,
                source: rel.from_table,
                target: rel.to_table,
                animated: true,
                label: rel.name,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
            });
        });

        const combinedElements = [...nodes, ...edges];
        const layoutedElements = getLayoutedElements(combinedElements, 'LR');

        const layoutedNodes = layoutedElements.filter(el => el.type === 'default') as Node[];
        const layoutedEdges = layoutedElements.filter(el => isEdge(el)) as Edge[];

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    };

    if (loading) return <Typography>Loading schema...</Typography>;

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Database Relationships Visualization
            </Typography>
            <div style={{height: '800px', border: '1px solid #ddd', marginTop: '1rem'}}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodesDraggable={true}
                    nodesConnectable={false}
                    elementsSelectable={true}>
                    <Background color="#aaa" gap={16} />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>
        </div>
    );
};

export default NodeView;
