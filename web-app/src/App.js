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

function CreateRagModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const handleCreate = async () => {
    if (!name.trim()) return;
    const res = await fetch(`${API}/rags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const created = await res.json();
    onCreate(created);
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Knowledge Base</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            className="tokens-input"
            placeholder="e.g. Product Docs"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button className="build-btn" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}

function RagDetailView({ rag, onBack }) {
  const [ingestText, setIngestText] = useState('');
  const [ingestStatus, setIngestStatus] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileStatus, setFileStatus] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleIngest = async () => {
    if (!ingestText.trim()) return;
    setIngesting(true);
    try {
      const res = await fetch(`${API}/rags/${rag.id}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ingestText }),
      });
      if (!res.ok) {
        const err = await res.text();
        setIngestStatus(`Error: ${err}`);
      } else {
        const data = await res.json();
        setIngestStatus(`${data.chunks_added} chunks added`);
        setIngestText('');
      }
    } catch (e) {
      setIngestStatus(`Error: could not reach the server.`);
    } finally {
      setIngesting(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploadingFile(true);
    setFileStatus('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${API}/rags/${rag.id}/ingest-file`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        setFileStatus(`Error: ${err.detail}`);
      } else {
        const data = await res.json();
        setFileStatus(`${data.chunks_added} chunks added from ${data.filename}`);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (e) {
      setFileStatus('Error: could not reach the server.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setQuerying(true);
    const res = await fetch(`${API}/rags/${rag.id}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, k: 4 }),
    });
    const data = await res.json();
    setResults(data);
    setQuerying(false);
  };

  return (
    <div className="chat-view">
      <div className="chat-single">
        <div className="chat-column">
          <button className="back-btn chat-back-solo" onClick={onBack}>←</button>
          <div className="chat-messages">
            <h3 style={{ margin: '0 0 16px' }}>{rag.name}</h3>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={{ fontWeight: 600 }}>Ingest Text</label>
              <textarea
                className="chat-textarea"
                placeholder="Paste text to add to this knowledge base…"
                value={ingestText}
                onChange={e => setIngestText(e.target.value)}
                rows={5}
                style={{ marginTop: 8, marginBottom: 8 }}
              />
              <button className="build-btn" onClick={handleIngest} disabled={ingesting}>
                {ingesting ? 'Ingesting…' : 'Ingest'}
              </button>
              {ingestStatus && <p style={{ marginTop: 8, color: '#6b7280' }}>{ingestStatus}</p>}
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={{ fontWeight: 600 }}>Upload File</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: 8,
                  marginBottom: 8,
                  border: `2px dashed ${dragOver ? '#6366f1' : '#2a2a3a'}`,
                  borderRadius: 8,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: dragOver ? '#6366f1' : '#6b7280',
                  background: dragOver ? '#1e1e3a' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                {selectedFile
                  ? <span style={{ color: '#e5e7eb' }}>{selectedFile.name}</span>
                  : <span>Drop a .txt or .pdf file here, or click to browse</span>
                }
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                style={{ display: 'none' }}
                onChange={e => setSelectedFile(e.target.files[0] || null)}
              />
              <button className="build-btn" onClick={handleFileUpload} disabled={uploadingFile || !selectedFile}>
                {uploadingFile ? 'Uploading…' : 'Upload & Ingest'}
              </button>
              {fileStatus && <p style={{ marginTop: 8, color: '#6b7280' }}>{fileStatus}</p>}
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Query</label>
              <input
                type="text"
                className="tokens-input"
                placeholder="Ask a question to test retrieval…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                style={{ marginTop: 8, marginBottom: 8 }}
              />
              <button className="build-btn" onClick={handleQuery} disabled={querying}>
                {querying ? 'Searching…' : 'Search'}
              </button>
              {results.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {results.map((r, i) => (
                    <div key={i} className="chat-bubble assistant" style={{ marginBottom: 8 }}>
                      {r.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAgentModal({ onClose, onBuild, initialConfig, rags }) {
  const [selected, setSelected] = useState(initialConfig?.model || '');
  const [isOpen, setIsOpen] = useState(false);
  const [maxTokens, setMaxTokens] = useState(initialConfig?.maxTokens || '');
  const [multiModel, setMultiModel] = useState(initialConfig?.isMultiModel || false);
  const [selectedModels, setSelectedModels] = useState(initialConfig?.models || []);
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [ragId, setRagId] = useState(initialConfig?.ragId || null);

  const selectedModel = MODELS.find(m => m.id === selected);
  const availableToAdd = MODELS.filter(m => !selectedModels.includes(m.id));

  const handleBuild = () => {
    if (multiModel) {
      onBuild({ isMultiModel: true, models: selectedModels, maxTokens, ragId });
    } else {
      onBuild({ isMultiModel: false, model: selected, maxTokens, ragId });
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
            rag_id: agent.ragId ?? null,
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
    ragId: agent.rag_id ?? null,
  };
}

function toBackend(config) {
  return {
    is_multi_model: config.isMultiModel,
    model: config.model ?? null,
    models: config.models ?? null,
    max_tokens: config.maxTokens ? parseInt(config.maxTokens) : null,
    rag_id: config.ragId ?? null,
  };
}

function CreateRagPairingModal({ onClose, agents, kbs, onCreated }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedKb, setSelectedKb] = useState(null);

  const handleCreate = async () => {
    if (!selectedAgent || !selectedKb) return;
    const res = await fetch(`${API}/rag-pairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: selectedAgent.id, kb_id: selectedKb.id }),
    });
    const created = await res.json();
    onCreated(created);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Create RAG</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label>Select Agent</label>
          {agents.length === 0
            ? <p style={{ color: '#6b7280', marginTop: 8 }}>No agents available. Create an agent first.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {agents.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAgent(a)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `2px solid ${selectedAgent?.id === a.id ? '#6366f1' : '#2a2a3a'}`,
                      cursor: 'pointer',
                      background: selectedAgent?.id === a.id ? '#1e1e3a' : 'transparent',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{a.isMultiModel ? a.models?.join(', ') : a.model}</span>
                    {a.maxTokens && <span style={{ color: '#6b7280', marginLeft: 8 }}>{a.maxTokens} tokens</span>}
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Select Knowledge Base</label>
          {kbs.length === 0
            ? <p style={{ color: '#6b7280', marginTop: 8 }}>No knowledge bases available. Create one first.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {kbs.map(kb => (
                  <div
                    key={kb.id}
                    onClick={() => setSelectedKb(kb)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `2px solid ${selectedKb?.id === kb.id ? '#6366f1' : '#2a2a3a'}`,
                      cursor: 'pointer',
                      background: selectedKb?.id === kb.id ? '#1e1e3a' : 'transparent',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{kb.name}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="modal-footer">
          <button
            className="build-btn"
            onClick={handleCreate}
            disabled={!selectedAgent || !selectedKb}
          >
            Create RAG
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [rags, setRags] = useState([]);
  const [ragPairs, setRagPairs] = useState([]);
  const [showRagModal, setShowRagModal] = useState(false);
  const [showCreateRagModal, setShowCreateRagModal] = useState(false);
  const [activeRag, setActiveRag] = useState(null);

  useEffect(() => {
    fetch(`${API}/agents`).then(r => r.json()).then(data => setAgents(data.map(toFrontend)));
    fetch(`${API}/rags`).then(r => r.json()).then(setRags);
    fetch(`${API}/rag-pairs`).then(r => r.json()).then(setRagPairs);
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

  const handleDeleteRag = async (e, id) => {
    e.stopPropagation();
    await fetch(`${API}/rags/${id}`, { method: 'DELETE' });
    setRags(prev => prev.filter(r => r.id !== id));
    setAgents(prev => prev.map(a => a.ragId === id ? { ...a, ragId: null } : a));
  };

  const handleDeleteRagPair = async (e, id) => {
    e.stopPropagation();
    await fetch(`${API}/rag-pairs/${id}`, { method: 'DELETE' });
    setRagPairs(prev => prev.filter(p => p.id !== id));
  };

  if (activeRag) {
    return <RagDetailView rag={activeRag} onBack={() => setActiveRag(null)} />;
  }

  if (activeAgent) {
    return <ChatView agent={activeAgent} onBack={() => setActiveAgent(null)} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Agent Squad</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="create-btn" onClick={() => setShowRagModal(true)}>
            + Create Knowledge Base
          </button>
          <button className="create-btn" onClick={() => setShowCreateRagModal(true)}>
            + Create RAG
          </button>
          <button className="create-btn" onClick={() => setShowModal(true)}>
            + Create Agent
          </button>
        </div>
      </header>

      {agents.length > 0 && <div className="section-heading">Models</div>}
      <div className="agents-grid">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card" onClick={() => setActiveAgent(agent)}>
            {agent.isMultiModel && (
              <span className="agent-card-multi-badge">multi-model</span>
            )}
            <div className="agent-card-label">Model</div>
            <div className="agent-card-value">
              {agent.isMultiModel
                ? (agent.models?.length ? agent.models.join(', ') : '—')
                : (agent.model || '—')}
            </div>
            <div className="agent-card-divider" />
            <div className="agent-card-label">Max Tokens</div>
            <div className="agent-card-value">{agent.maxTokens || '—'}</div>
            <div className="agent-card-divider" />
            <div className="agent-card-actions">
              <button className="card-action-btn edit-btn" onClick={e => handleEdit(e, agent)}>Edit</button>
              <button className="card-action-btn delete-btn" onClick={e => handleDelete(e, agent.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {ragPairs.length > 0 && (
        <>
        <div className="section-heading">RAGs</div>
        <div className="agents-grid">
          {ragPairs.map(pair => (
            <div
              key={pair.id}
              className="agent-card"
              onClick={() => setActiveAgent({
                id: pair.agent_id,
                isMultiModel: pair.agent.is_multi_model,
                model: pair.agent.model,
                models: pair.agent.models,
                maxTokens: pair.agent.max_tokens,
                ragId: pair.kb_id,
              })}
            >
              <span className="agent-card-multi-badge">RAG</span>
              <div className="agent-card-label">Model</div>
              <div className="agent-card-value">
                {pair.agent.is_multi_model
                  ? (pair.agent.models?.join(', ') || '—')
                  : (pair.agent.model || '—')}
              </div>
              <div className="agent-card-divider" />
              <div className="agent-card-label">Knowledge Base</div>
              <div className="agent-card-value">{pair.kb.name}</div>
              <div className="agent-card-divider" />
              <div className="agent-card-actions">
                <button className="card-action-btn delete-btn" onClick={e => handleDeleteRagPair(e, pair.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {rags.length > 0 && (
        <>
        <div className="section-heading">Knowledge Bases</div>
        <div className="agents-grid">
          {rags.map(rag => (
            <div key={rag.id} className="agent-card" onClick={() => setActiveRag(rag)}>
              <div className="agent-card-label">Knowledge Base</div>
              <div className="agent-card-value">{rag.name}</div>
              <div className="agent-card-divider" />
              <div className="agent-card-actions">
                <button className="card-action-btn delete-btn" onClick={e => handleDeleteRag(e, rag.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {showRagModal && (
        <CreateRagModal
          onClose={() => setShowRagModal(false)}
          onCreate={rag => setRags(prev => [...prev, rag])}
        />
      )}

      {showCreateRagModal && (
        <CreateRagPairingModal
          onClose={() => setShowCreateRagModal(false)}
          agents={agents}
          kbs={rags}
          onCreated={pair => setRagPairs(prev => [...prev, pair])}
        />
      )}

      {(showModal || editingAgent) && (
        <CreateAgentModal
          onClose={() => { setShowModal(false); setEditingAgent(null); }}
          onBuild={handleBuild}
          initialConfig={editingAgent}
          rags={rags}
        />
      )}
    </div>
  );
}

export default App;
