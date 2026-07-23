import React, { useState } from 'react';
import type { AgentTask } from '../../store/types';
import { COUNTRIES } from '../../data/countries';

const api = (window as any).api;

interface TaskCardProps {
  task: AgentTask;
  onUpdate: (task: AgentTask) => void;
  onDelete: (id: string) => void;
  onEdit?: (task: AgentTask) => void;
}

function StatusBadge({ status }: { status: AgentTask['status'] }) {
  const map: Record<string, { cls: string; label: string }> = {
    idle:      { cls: 'badge-idle',      label: 'Ready'     },
    running:   { cls: 'badge-running',   label: 'Running'   },
    completed: { cls: 'badge-completed', label: 'Completed' },
    error:     { cls: 'badge-error',     label: 'Error'     },
    paused:    { cls: 'badge-paused',    label: 'Paused'    },
  };
  const { cls, label } = map[status] || { cls: 'badge-idle', label: status };
  return (
    <span className={`badge ${cls}`}>
      {status === 'running' && <span className="pulse-dot" style={{ background: '#4ade80' }} />}
      {label}
    </span>
  );
}

export function TaskCard({ task, onUpdate, onDelete, onEdit }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const country    = COUNTRIES.find((c) => c.code === task.countryCode);
  const deviceIcon = task.deviceType === 'desktop' ? '🖥️' : task.deviceType === 'mobile' ? '📱' : '📟';

  const handleStart = async () => { await api.agent.startTask(task.id); };
  const handleStop  = async () => { await api.agent.stopTask(task.id); };

  const handleDelete = async () => {
    if (task.status === 'running') return;
    setDeleting(true);
    await api.agent.deleteTask(task.id);
    onDelete(task.id);
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
              {task.name}
            </span>
            <StatusBadge status={task.status} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
            {country?.flag ?? '🌐'} {task.country} · {deviceIcon} {task.deviceType} ·{' '}
            {task.urls.length} URL{task.urls.length !== 1 ? 's' : ''} · ×{task.visitCount}
          </div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{
            color: 'rgba(255,255,255,0.3)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
            marginTop: 2,
          }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Progress bar */}
      {(task.status === 'running' || task.status === 'completed') && (
        <>
          <div className="progress-bar mx-3 mb-1">
            <div className="progress-fill" style={{ width: `${task.progress}%` }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingLeft: 12, paddingBottom: 8 }}>
            {task.completedVisits}/{task.totalVisits} visits · {task.progress}%
          </div>
        </>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-white/[0.06] p-3 flex flex-col gap-3">
          {/* Info rows */}
          <div className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            {task.keyword && (
              <div style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Keyword: </span>{task.keyword}
              </div>
            )}
            {task.directSearchUrl && (
              <div style={{ color: 'rgba(255,255,255,0.55)', wordBreak: 'break-all' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Direct URL: </span>
                <span style={{ fontSize: 10 }}>{task.directSearchUrl}</span>
              </div>
            )}
            <div style={{ color: 'rgba(255,255,255,0.55)' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Time/page: </span>
              {task.timeOnPageMin}–{task.timeOnPageMax}s
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Scroll: </span>{task.scrollSpeed}
            </div>
            {task.clickInternalLinks && (
              <div style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Internal links: </span>
                up to {task.maxInternalLinks}
              </div>
            )}
            {task.proxyList && task.proxyList.length > 0 && (
              <div style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Proxies: </span>
                {task.proxyList.length} entries (rotating)
              </div>
            )}
          </div>

          {/* URLs */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: '0.05em' }}>
              URLS ({task.urls.length})
            </div>
            <div className="flex flex-col gap-1">
              {task.urls.map((url, i) => (
                <div key={i} style={{
                  fontSize: 11, color: '#a5b4fc',
                  background: 'rgba(99,102,241,0.08)',
                  borderRadius: 6, padding: '4px 8px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={url}>{url}</div>
              ))}
            </div>
          </div>

          {/* Logs */}
          {task.logs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: '0.05em' }}>
                ACTIVITY LOG
              </div>
              <div className="log-console">
                {task.logs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {task.status !== 'running' && (
              <button className="btn-primary flex-1" onClick={handleStart}>
                {task.status === 'completed' ? '▶ Run Again' : '▶ Start'}
              </button>
            )}
            {task.status === 'running' && (
              <button className="btn-danger flex-1" onClick={handleStop}>⏹ Stop</button>
            )}
            {task.status !== 'running' && onEdit && (
              <button
                className="btn-ghost"
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                style={{ color: '#a5b4fc' }}
                title="Edit this task"
              >
                ✏️ Edit
              </button>
            )}
            <button
              className="btn-ghost"
              onClick={handleDelete}
              disabled={deleting || task.status === 'running'}
              style={{ color: '#f87171' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
