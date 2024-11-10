import React, {useEffect, useState} from 'react';
import ReactFlow, {Elements, Background, Controls, MiniMap} from 'react-flow-renderer';
import axios from 'axios';
import {TableSchema, RelationshipRead} from '../types';
import useSchema from '../hooks/useSchema';
import {Typography} from '@mui/material';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (elements: Elements, direction = 'LR') => {
    dagreGraph.setGraph({rankdir: direction});

    elements.forEach(el => {
        if (el.type === 'default') {
            dagreGraph.setNode(el.id, {width: nodeWidth, height: nodeHeight});
        } else {
            dagreGraph.setEdge(el.source, el.target);
        }
    });

    dagre.layout(dagreGraph);

    return elements.map(el => {
        if (el.type === 'default') {
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
    const [elements, setElements] = useState<Elements>([]);

    const fetchRelationships = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/relationships/`);
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
        const nodes: Elements = [];
        const edges: Elements = [];

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
                arrowHeadType: 'arrowclosed',
            });
        });

        const layoutedElements = getLayoutedElements([...nodes, ...edges], 'LR');
        setElements(layoutedElements);
    };

    if (loading) return <Typography>Loading schema...</Typography>;

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Database Relationships Visualization
            </Typography>
            <div style={{height: '800px', border: '1px solid #ddd', marginTop: '1rem'}}>
                <ReactFlow elements={elements} nodesDraggable={true} nodesConnectable={false} elementsSelectable={true}>
                    <Background color="#aaa" gap={16} />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            </div>
        </div>
    );
};

export default NodeView;
