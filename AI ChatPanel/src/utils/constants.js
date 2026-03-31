export const AGENT_TOKEN = 'agent_token'
export const AGENT_THINKING = 'agent_thinking'
export const AGENT_TOOL_CALL = 'agent_tool_call'
export const AGENT_TOOL_RESULT = 'agent_tool_result'
export const AGENT_TURN_DONE = 'agent_turn_done'
export const AGENT_DONE = 'agent_done'
export const AGENT_ERROR = 'agent_error'
export const AGENT_INJECT_ACK = 'agent_inject_ack'
export const APPROVAL_UPDATE = 'approval_update'

export const ToolCallStatus = Object.freeze({
  RUNNING: 'running',
  COMPLETE: 'complete',
  ERROR: 'error',
  AWAITING_APPROVAL: 'awaiting_approval',
})
