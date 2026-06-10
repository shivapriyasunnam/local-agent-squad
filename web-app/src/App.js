import { useState, useRef, useEffect } from 'react';
import './App.css';

const MODELS = [
  {
    id: 'llama3.1',
    name: 'llama3.1',
    description: 'Llama 3.1 is a new state-of-the-art model from Meta available in 8B, 70B and 405B parameter sizes.',
    tags: ['tools'],
    sizes: ['8b', '70b', '405b'],
    pulls: '115.7M',
    updated: '1 year ago',
  },
  {
    id: 'deepseek-r1',
    name: 'deepseek-r1',
    description: 'DeepSeek-R1 is a family of open reasoning models with performance approaching that of leading models, such as O3 and Gemini 2.5 Pro.',
    tags: ['tools', 'thinking'],
    sizes: ['1.5b', '7b', '8b', '14b', '32b', '70b', '671b'],
    pulls: '87.2M',
    updated: '11 months ago',
  },
  {
    id: 'nomic-embed-text',
    name: 'nomic-embed-text',
    description: 'A high-performing open embedding model with a large token context window.',
    tags: ['embedding'],
    sizes: [],
    pulls: '73.7M',
    updated: '2 years ago',
  },
  {
    id: 'llama3.2',
    name: 'llama3.2',
    description: "Meta's Llama 3.2 goes small with 1B and 3B models.",
    tags: ['tools'],
    sizes: ['1b', '3b'],
    pulls: '72.1M',
    updated: '1 year ago',
  },
  {
    id: 'gemma3',
    name: 'gemma3',
    description: 'The current, most capable model that runs on a single GPU.',
    tags: ['vision', 'cloud'],
    sizes: ['270m', '1b', '4b', '12b', '27b'],
    pulls: '37.6M',
    updated: '6 months ago',
  },
  {
    id: 'llama2',
    name: 'llama2',
    description: 'Llama 2 is a collection of foundation language models ranging from 7B to 70B parameters, released by Meta.',
    tags: ['tools'],
    sizes: ['7b', '13b', '70b'],
    pulls: '93.4M',
    updated: '2 years ago',
  },
  {
    id: 'qwen2.5',
    name: 'qwen2.5',
    description: "Qwen2.5 models are pretrained on Alibaba's latest large-scale dataset, encompassing up to 18 trillion tokens. The model supports up to 128K tokens and has multilingual support.",
    tags: ['tools'],
    sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'],
    pulls: '32.2M',
    updated: '1 year ago',
  },
];

function ModelOption({ model }) {
  return (
    <div className="model-option">
      <div className="model-header">
        <span className="model-name">{model.name}</span>
        <div className="model-tags">
          {model.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
      <p className="model-description">{model.description}</p>
      {model.sizes.length > 0 && (
        <div className="model-sizes">
          {model.sizes.map(size => (
            <span key={size} className="size-badge">{size}</span>
          ))}
        </div>
      )}
      <div className="model-meta">
        <span>{model.pulls} Pulls</span>
        <span>Updated {model.updated}</span>
      </div>
    </div>
  );
}

function CreateAgentModal({ onClose, onBuild, initialConfig }) {
  const [selected, setSelected] = useState(initialConfig?.model || '');
  const [isOpen, setIsOpen] = useState(false);
  const [maxTokens, setMaxTokens] = useState(initialConfig?.maxTokens || '');
  const [multiModel, setMultiModel] = useState(initialConfig?.isMultiModel || false);
  const [selectedModels, setSelectedModels] = useState(initialConfig?.models || []);
  const [addModelOpen, setAddModelOpen] = useState(false);

  const selectedModel = MODELS.find(m => m.id === selected);
  const availableToAdd = MODELS.filter(m => !selectedModels.includes(m.id));

  const handleBuild = () => {
    if (multiModel) {
      onBuild({ isMultiModel: true, models: selectedModels, maxTokens });
    } else {
      onBuild({ isMultiModel: false, model: selected, maxTokens });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialConfig ? 'Edit Agent' : 'Create Agent'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <div className="form-group-header">
            <label>Select Model</label>
            <div className="toggle-row">
              <span className="toggle-label">multi-model agent</span>
              <button
                className={`toggle-switch ${multiModel ? 'on' : ''}`}
                onClick={() => { setMultiModel(o => !o); setSelected(''); setSelectedModels([]); }}
              />
            </div>
          </div>

          {multiModel ? (
            <div className="multi-model-list">
              {selectedModels.map((modelId, i) => {
                const m = MODELS.find(x => x.id === modelId);
                return (
                  <div key={i} className="multi-model-item">
                    <span className="multi-model-item-name">{m?.name}</span>
                    <button
                      className="multi-model-remove"
                      onClick={() => setSelectedModels(prev => prev.filter((_, j) => j !== i))}
                    >✕</button>
                  </div>
                );
              })}
              {availableToAdd.length > 0 && (
                <div className="custom-select">
                  <button
                    className="select-trigger add-model-trigger"
                    onClick={() => setAddModelOpen(o => !o)}
                  >
                    + Add model
                    <span className="chevron">{addModelOpen ? '▲' : '▼'}</span>
                  </button>
                  {addModelOpen && (
                    <div className="dropdown">
                      {availableToAdd.map(model => (
                        <div
                          key={model.id}
                          className="dropdown-item"
                          onClick={() => { setSelectedModels(prev => [...prev, model.id]); setAddModelOpen(false); }}
                        >
                          <ModelOption model={model} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="custom-select">
              <button
                className="select-trigger"
                onClick={() => setIsOpen(o => !o)}
              >
                {selectedModel ? selectedModel.name : 'Choose a model…'}
                <span className="chevron">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="dropdown">
                  {MODELS.map(model => (
                    <div
                      key={model.id}
                      className={`dropdown-item ${selected === model.id ? 'selected' : ''}`}
                      onClick={() => { setSelected(model.id); setIsOpen(false); }}
                    >
                      <ModelOption model={model} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group tokens-group">
          <label>Max Tokens</label>
          <input
            type="number"
            className="tokens-input"
            placeholder="e.g. 2048"
            min="1"
            value={maxTokens}
            onChange={e => setMaxTokens(e.target.value)}
          />
          <p className="tokens-hint">
            Tokens are the units a model reads and writes — roughly ¾ of a word each.
            This limit caps how long the model's response can be. Higher values allow
            longer outputs but use more memory and take longer to generate.
          </p>
        </div>

        <div className="modal-footer">
          <button className="build-btn" onClick={handleBuild}>
            {initialConfig ? 'Save' : 'Build'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatView({ agent, onBack }) {
  const isMulti = agent.isMultiModel;
  const models = isMulti ? agent.models : [agent.model];

  const [messagesByModel, setMessagesByModel] = useState(
    () => Object.fromEntries(models.map(m => [m, []]))
  );
  const [loadingByModel, setLoadingByModel] = useState(
    () => Object.fromEntries(models.map(m => [m, false]))
  );
  const [input, setInput] = useState('');
  const bottomRefs = useRef({});

  useEffect(() => {
    models.forEach(m => bottomRefs.current[m]?.scrollIntoView({ behavior: 'smooth' }));
  }, [messagesByModel]);

  const send = async () => {
    const text = input.trim();
    if (!text || Object.values(loadingByModel).some(Boolean)) return;

    const userMsg = { id: Date.now(), role: 'user', text };
    setMessagesByModel(prev => Object.fromEntries(models.map(m => [m, [...prev[m], userMsg]])));
    setInput('');
    setLoadingByModel(Object.fromEntries(models.map(m => [m, true])));

    await Promise.all(models.map(async (modelId) => {
      try {
        const res = await fetch('http://localhost:8000/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            message: text,
            max_tokens: agent.maxTokens ? parseInt(agent.maxTokens) : 2048,
          }),
        });
        const data = await res.json();
        const replyText = res.ok ? data.reply : `Error: ${data.detail}`;
        setMessagesByModel(prev => ({
          ...prev,
          [modelId]: [...prev[modelId], { id: Date.now() + Math.random(), role: 'assistant', text: replyText }],
        }));
      } catch {
        setMessagesByModel(prev => ({
          ...prev,
          [modelId]: [...prev[modelId], { id: Date.now() + Math.random(), role: 'assistant', text: 'Error: could not reach the server.' }],
        }));
      } finally {
        setLoadingByModel(prev => ({ ...prev, [modelId]: false }));
      }
    }));
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const anyLoading = Object.values(loadingByModel).some(Boolean);

  const renderColumn = (modelId, withDivider, isFirst) => (
    <div key={modelId} className={`chat-column${withDivider ? ' chat-column-divider' : ''}`}>
      {isMulti && (
        <div className="chat-column-header">
          {isFirst && <button className="back-btn" onClick={onBack}>←</button>}
          {modelId}
        </div>
      )}
      {!isMulti && <button className="back-btn chat-back-solo" onClick={onBack}>←</button>}
      <div className={`chat-messages${isMulti ? ' chat-messages-column' : ''}`}>
        {messagesByModel[modelId].length === 0 && (
          <p className="chat-empty">Send a message to start the conversation.</p>
        )}
        {messagesByModel[modelId].map(msg => (
          <div key={msg.id} className={`chat-bubble-row ${msg.role}`}>
            <div className={`chat-bubble ${msg.role}`}>{msg.text}</div>
          </div>
        ))}
        {loadingByModel[modelId] && (
          <div className="chat-bubble-row assistant">
            <div className="chat-bubble assistant chat-loading">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={el => { bottomRefs.current[modelId] = el; }} />
      </div>
    </div>
  );

  return (
    <div className="chat-view">
      <div className={isMulti ? 'chat-columns' : 'chat-single'}>
        {models.map((modelId, i) => renderColumn(modelId, i < models.length - 1, i === 0))}
      </div>

      <div className="chat-input-bar">
        <textarea
          className="chat-textarea"
          placeholder={isMulti ? `Send a message to all ${models.length} models` : 'Send a message'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <div className="chat-input-actions">
          <div className="chat-model-chip">
            {isMulti ? `${models.length} models` : (agent.model || '—')}
          </div>
          <button className="chat-send-btn" onClick={send} disabled={anyLoading}>↑</button>
        </div>
      </div>
    </div>
  );
}

const API = 'http://localhost:8000';

function toFrontend(agent) {
  return {
    id: agent.id,
    isMultiModel: agent.is_multi_model,
    model: agent.model,
    models: agent.models,
    maxTokens: agent.max_tokens,
  };
}

function toBackend(config) {
  return {
    is_multi_model: config.isMultiModel,
    model: config.model ?? null,
    models: config.models ?? null,
    max_tokens: config.maxTokens ? parseInt(config.maxTokens) : null,
  };
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);

  useEffect(() => {
    fetch(`${API}/agents`)
      .then(r => r.json())
      .then(data => setAgents(data.map(toFrontend)));
  }, []);

  const handleBuild = async (config) => {
    if (editingAgent) {
      const res = await fetch(`${API}/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBackend(config)),
      });
      const updated = await res.json();
      setAgents(prev => prev.map(a => a.id === editingAgent.id ? toFrontend(updated) : a));
      setEditingAgent(null);
    } else {
      const res = await fetch(`${API}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBackend(config)),
      });
      const created = await res.json();
      setAgents(prev => [...prev, toFrontend(created)]);
      setShowModal(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await fetch(`${API}/agents/${id}`, { method: 'DELETE' });
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  const handleEdit = (e, agent) => {
    e.stopPropagation();
    setEditingAgent(agent);
  };

  if (activeAgent) {
    return <ChatView agent={activeAgent} onBack={() => setActiveAgent(null)} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Agent Squad</h1>
        <button className="create-btn" onClick={() => setShowModal(true)}>
          + Create Agent
        </button>
      </header>

      <div className="agents-grid">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card" onClick={() => setActiveAgent(agent)}>
            {agent.isMultiModel && (
              <span className="agent-card-multi-badge">multi-model</span>
            )}
            <div className="agent-card-label">Model</div>
            <div className="agent-card-value">
              {agent.isMultiModel
                ? (agent.models.length ? agent.models.join(', ') : '—')
                : (agent.model || '—')}
            </div>
            <div className="agent-card-divider" />
            <div className="agent-card-label">Max Tokens</div>
            <div className="agent-card-value">{agent.maxTokens || '—'}</div>
            <div className="agent-card-divider" />
            <div className="agent-card-actions">
              <button className="card-action-btn edit-btn" onClick={e => handleEdit(e, agent)}>
                Edit
              </button>
              <button className="card-action-btn delete-btn" onClick={e => handleDelete(e, agent.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showModal || editingAgent) && (
        <CreateAgentModal
          onClose={() => { setShowModal(false); setEditingAgent(null); }}
          onBuild={handleBuild}
          initialConfig={editingAgent}
        />
      )}
    </div>
  );
}

export default App;
