import React, {useEffect, useState} from 'react';
import ReactFlow, {Node, Edge, Background, Controls, MiniMap, MarkerType, isNode, isEdge} from 'react-flow-renderer';
import axios from '../utils/axiosConfig';
import {Typography} from '@mui/material';
import dagre from 'dagre';
import useSchema from '../hooks/useSchema';

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
    const {schema} = useSchema();
    const [linkTables, setLinkTables] = useState<any[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const fetchLinkTables = async () => {
        try {
            const response = await axios.get(`/link_tables/`);
            setLinkTables(response.data);
        } catch (error) {
            console.error('Error fetching link tables:', error);
        }
    };

    useEffect(() => {
        fetchLinkTables();
    }, []);

    useEffect(() => {
        if (schema) {
            buildGraph();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, linkTables]);

    const buildGraph = () => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // Create nodes for each table
        Object.keys(schema || {}).forEach(tableName => {
            nodes.push({
                id: tableName,
                data: {label: tableName},
                position: {x: 0, y: 0},
                type: 'default',
            });
        });

        // Create nodes for link tables
        linkTables.forEach(linkTable => {
            nodes.push({
                id: linkTable.name,
                data: {label: linkTable.name},
                position: {x: 0, y: 0},
                type: 'default',
                style: {border: '2px solid #ff6f00'},
            });

            // Edges from link table to connected tables
            edges.push({
                id: `e${linkTable.name}-${linkTable.from_table.name}`,
                source: linkTable.name,
                target: linkTable.from_table.name,
                label: 'Link',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                style: {stroke: '#ff6f00'},
            });

            edges.push({
                id: `e${linkTable.name}-${linkTable.to_table.name}`,
                source: linkTable.name,
                target: linkTable.to_table.name,
                label: 'Link',
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                },
                style: {stroke: '#ff6f00'},
            });
        });

        const combinedElements = [...nodes, ...edges];
        const layoutedElements = getLayoutedElements(combinedElements, 'LR');

        const layoutedNodes = layoutedElements.filter(el => el.type === 'default') as Node[];
        const layoutedEdges = layoutedElements.filter(el => isEdge(el)) as Edge[];

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    };

    if (!schema) return <Typography>Loading schema...</Typography>;

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Database Visualization
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
                    <MiniMap
                        nodeColor={node => {
                            if (linkTables.some(lt => lt.name === node.id)) {
                                return '#ff6f00';
                            }
                            return '#00bfff';
                        }}
                    />
                </ReactFlow>
            </div>
        </div>
    );
};

export default NodeView;
