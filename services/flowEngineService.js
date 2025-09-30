exports.buildNodeMap = (flow) => {
  const nodeMap = {};
  for (const n of flow.nodes || []) {
    nodeMap[String(n.id)] = n;
  }
  return nodeMap;
};

exports.getNode = (nodeMap, nodeId) => {
  return nodeMap[String(nodeId)] || null;
};

exports.outgoingEdges = (edges, nodeId) => {
  return edges.filter((e) => String(e.source) === String(nodeId));
};

exports.findEdgeByHandle = (edges, nodeId, handleValue) => {
  const outs = exports.outgoingEdges(edges, nodeId);
  const normalized = String(handleValue).toLowerCase();

  let edge = outs.find(
    (o) => o.sourceHandle && String(o.sourceHandle).toLowerCase() === normalized
  );
  if (edge) return edge;

  if (outs.length === 1 && !outs[0].sourceHandle) return outs[0];
  return null;
};

exports.findBranchOptionNode = (nodeMap, branchNode, optionIndexOrLabel) => {
  const options = (branchNode.data && branchNode.data.options) || [];
  const idx = Number(optionIndexOrLabel);

  if (!isNaN(idx) && options[idx] !== undefined) {
    for (const node of Object.values(nodeMap)) {
      if (node.type === "branchOption" && node.data?.label === options[idx]) {
        return node.id;
      }
    }
    const guessed = `${branchNode.id}-opt-${idx}`;
    if (exports.getNode(nodeMap, guessed)) return guessed;
  } else {
    const label = String(optionIndexOrLabel);
    for (const node of Object.values(nodeMap)) {
      if (node.type === "branchOption" && node.data?.label === label) {
        return node.id;
      }
    }
  }
  return null;
};

exports.runFrom = async (flow, session, nodeId, userInputIfAny = null) => {
  const nodeMap = exports.buildNodeMap(flow);
  const edges = flow.edges || [];
  const outputs = [];
  let current = exports.getNode(nodeMap, nodeId);

  while (current && !session.isFinished) {
    const type = current.type;

    if (type === "message") {
      outputs.push({
        nodeId: current.id,
        type: "message",
        content: current.data?.message || "",
      });
      const outs = exports.outgoingEdges(edges, current.id);
      if (!outs.length) {
        session.currentNodeId = null;
        session.isFinished = true;
        break;
      }
      current = exports.getNode(nodeMap, outs[0].target);
      continue;
    }

    if (type === "redirect") {
      outputs.push({
        nodeId: current.id,
        type: "redirect",
        content: current.data?.redirectUrl || "",
      });
      session.currentNodeId = null;
      session.isFinished = true;
      break;
    }

    if (type === "question") {
      if (userInputIfAny === null) {
        return {
          outputs,
          pausedFor: {
            type: "question",
            nodeId: current.id,
            message: current.data?.message,
            variable: current.data?.variable,
          },
        };
      }
      const varName = current.data?.variable;
      if (varName) session.variables[varName] = userInputIfAny;

      outputs.push({
        nodeId: current.id,
        type: "question",
        content: {
          prompt: current.data?.message,
          answer: userInputIfAny,
          variable: varName,
        },
      });

      const outs = exports.outgoingEdges(edges, current.id);
      if (!outs.length) {
        session.currentNodeId = null;
        session.isFinished = true;
        break;
      }
      current = exports.getNode(nodeMap, outs[0].target);
      userInputIfAny = null;
      continue;
    }

    if (type === "confirmation") {
      if (userInputIfAny === null) {
        return {
          outputs,
          pausedFor: {
            type: "confirmation",
            nodeId: current.id,
            message: current.data?.message,
          },
        };
      }

      const normalized = String(userInputIfAny).toLowerCase();
      outputs.push({
        nodeId: current.id,
        type: "confirmation",
        content: {
          prompt: current.data?.message,
          answer: normalized,
        },
      });

      const edge = exports.findEdgeByHandle(edges, current.id, normalized);
      if (!edge) {
        session.isFinished = true;
        break;
      }
      current = exports.getNode(nodeMap, edge.target);
      userInputIfAny = null;
      continue;
    }

    if (type === "branch") {
      return {
        outputs,
        pausedFor: {
          type: "branch",
          nodeId: current.id,
          message: current.data?.message,
          options: current.data?.options || [],
        },
      };
    }

    if (type === "branchOption") {
      const outs = exports.outgoingEdges(edges, current.id);
      if (!outs.length) {
        session.isFinished = true;
        break;
      }
      current = exports.getNode(nodeMap, outs[0].target);
      continue;
    }

    outputs.push({
      nodeId: current.id,
      type: "unknown",
      content: current.data || {},
    });
    session.currentNodeId = null;
    session.isFinished = true;
    break;
  }

  return {
    outputs,
    pausedFor: null,
    nextNodeId: current ? current.id : null,
  };
};

exports.findStartNode = (flow) => {
  const nodeMap = exports.buildNodeMap(flow);
  if (exports.getNode(nodeMap, "1")) return exports.getNode(nodeMap, "1");
  return (flow.nodes || [])[0] || null;
};
