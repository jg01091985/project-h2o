export class MCPRegistry {
  constructor(stateStore = {}) {
    this.stateStore = stateStore;
    this.customTools = new Map();
  }

  // Register custom application tools at runtime
  registerTool(name, description, parameters, handler) {
    this.customTools.set(name, { description, parameters, handler });
  }

  getToolDeclarations() {
    const baseDeclarations = [
      {
        name: 'get_system_status',
        description: 'Retrieve real-time system status, telemetry, or application metrics.',
        parameters: {
          type: 'OBJECT',
          properties: {
            metricKey: { type: 'STRING', description: 'The specific metric or subsystem key' }
          }
        }
      },
      {
        name: 'execute_action',
        description: 'Execute an authorized application action or command.',
        parameters: {
          type: 'OBJECT',
          properties: {
            actionName: { type: 'STRING', description: 'The name of the action to execute' },
            payload: { type: 'STRING', description: 'JSON payload or parameters for the action' }
          },
          required: ['actionName']
        }
      },
      {
        name: 'query_data',
        description: 'Query application records, state data, or logs.',
        parameters: {
          type: 'OBJECT',
          properties: {
            queryFilter: { type: 'STRING', description: 'Filter criteria or query string' }
          }
        }
      }
    ];

    for (const [name, def] of this.customTools.entries()) {
      baseDeclarations.push({
        name,
        description: def.description,
        parameters: def.parameters
      });
    }

    return [{ functionDeclarations: baseDeclarations }];
  }

  async executeTool(name, args) {
    if (this.customTools.has(name)) {
      const tool = this.customTools.get(name);
      return await tool.handler(args, this.stateStore);
    }

    switch (name) {
      case 'get_system_status': {
        const { metricKey } = args || {};
        const data = this.stateStore.metrics?.[metricKey] || { status: 'ONLINE', uptime: process.uptime(), timestamp: new Date().toISOString() };
        return { success: true, metric: data };
      }
      case 'execute_action': {
        const { actionName, payload } = args;
        if (!this.stateStore.actions) this.stateStore.actions = [];
        this.stateStore.actions.push({ actionName, payload, timestamp: new Date().toISOString() });
        return { success: true, message: `Action ${actionName} executed successfully` };
      }
      case 'query_data': {
        const { queryFilter } = args || {};
        return {
          success: true,
          results: {
            filter: queryFilter || 'all',
            recordsCount: 42,
            items: []
          }
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
