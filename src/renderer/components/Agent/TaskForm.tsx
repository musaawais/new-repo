import React, { useState } from 'react';
import type { AgentTask, AgentTaskInput } from '../../store/types';
import { COUNTRIES } from '../../data/countries';

const api = (window as any).api;

// ── All supported proxy formats listed in the placeholder ─────────────────────
const PROXY_PLACEHOLDER = [
  '# Webshare / Rotating Residential format:',
  'host:port:username:password',
  '',
  '# Examples:',
  '84.247.60.125:6095:qufinnwc:zujxjezbbkm',
  '2.57.21.2:7239:qufinnwc:zujxjezbbkm',
  '',
  '# Other accepted formats:',
  'username:password@host:port',
  'http://username:password@host:port',
  'socks5://username:password@host:port',
  'host:port  (no auth)',
  'host port username password  (space-separated)',
].join('\n');

interface TaskFormProps {
  /** When provided the form runs in EDIT mode — all fields are pre-filled and
   *  submit calls updateTask instead of createTask. */
  initialTask?: AgentTask;
  onCreated?: (task: AgentTask) => void;
  onUpdated?: (task: AgentTask) => void;
  onCancel: () => void;
}

export function TaskForm({ initialTask, onCreated, onUpdated, onCancel }: TaskFormProps) {
  const isEdit = !!initialTask;

  const [form, setForm] = useState({
    name:              initialTask?.name              ?? '',
    keyword:           initialTask?.keyword           ?? '',
    directSearchUrl:   initialTask?.directSearchUrl   ?? '',
    urls:              initialTask?.urls?.join('\n')  ?? '',
    countryCode:       initialTask?.countryCode       ?? 'US',
    proxyList:         initialTask?.proxyList?.join('\n') ?? '',
    visitCount:        initialTask?.visitCount        ?? 5,
    deviceType:        (initialTask?.deviceType       ?? 'desktop') as 'desktop' | 'mobile' | 'tablet',
    timeOnPageMin:     initialTask?.timeOnPageMin     ?? 20,
    timeOnPageMax:     initialTask?.timeOnPageMax     ?? 60,
    scrollSpeed:       (initialTask?.scrollSpeed      ?? 'medium') as 'slow' | 'medium' | 'fast',
    clickInternalLinks: initialTask?.clickInternalLinks ?? false,
    maxInternalLinks:  initialTask?.maxInternalLinks  ?? 3,
  });

  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === form.countryCode);
  const set = (key: string, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    setError(null);
    const urlList   = form.urls.split('\n').map((u) => u.trim()).filter(Boolean);
    if (urlList.length === 0) { setError('Please enter at least one target URL.'); return; }
    const proxyList = form.proxyList
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('#'));

    setBusy(true);
    try {
      const input: AgentTaskInput = {
        name:               form.name.trim() || `Task ${new Date().toLocaleTimeString()}`,
        keyword:            form.keyword,
        directSearchUrl:    form.directSearchUrl.trim() || undefined,
        urls:               urlList,
        country:            selectedCountry?.name || 'United States',
        countryCode:        form.countryCode,
        proxyList,
        visitCount:         form.visitCount,
        deviceType:         form.deviceType,
        timeOnPageMin:      form.timeOnPageMin,
        timeOnPageMax:      form.timeOnPageMax,
        scrollSpeed:        form.scrollSpeed,
        clickInternalLinks: form.clickInternalLinks,
        maxInternalLinks:   form.maxInternalLinks,
      };

      if (isEdit && initialTask) {
        const updated: AgentTask = await api.agent.updateTask(initialTask.id, input);
        if (!updated) throw new Error('No response from main process');
        onUpdated?.(updated);
      } else {
        const task: AgentTask = await api.agent.createTask(input);
        if (!task) throw new Error('No response from main process');
        onCreated?.(task);
      }
    } catch (err: any) {
      setError(`${isEdit ? 'Update' : 'Create'} failed: ${err?.message ?? String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-3">
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
        {isEdit ? '✏️ Edit Agent Task' : 'New Agent Task'}
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171',
        }}>{error}</div>
      )}

      {/* Task name */}
      <div>
        <label className="form-label">Task Name <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></label>
        <input className="input-dark" placeholder="e.g. Boost homepage traffic"
          value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      {/* Keyword */}
      <div>
        <label className="form-label">
          Google Search Keyword{' '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>(agent searches this, clicks your URL)</span>
        </label>
        <input className="input-dark" placeholder="e.g. best homes info guide"
          value={form.keyword} onChange={(e) => set('keyword', e.target.value)} />
      </div>

      {/* Direct Search URL */}
      <div>
        <label className="form-label">
          Direct Search URL{' '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional — skips typing → fewer CAPTCHAs)</span>
        </label>
        <input className="input-dark"
          placeholder="https://www.google.com/search?q=homes+info+guide"
          value={form.directSearchUrl}
          onChange={(e) => set('directSearchUrl', e.target.value)} />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.5 }}>
          💡 Go to Google → search → copy URL from address bar → paste here.
          Skips typing simulation entirely (best CAPTCHA avoidance).
        </div>
      </div>

      {/* Target URLs */}
      <div>
        <label className="form-label">
          Target URLs <span style={{ color: '#f87171' }}>*</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>(one per line)</span>
        </label>
        <textarea className="input-dark" rows={3}
          placeholder={'https://example.com\nhttps://site2.com'}
          value={form.urls} onChange={(e) => set('urls', e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
      </div>

      {/* Country */}
      <div>
        <label className="form-label">Country / Location</label>
        <select className="input-dark" value={form.countryCode}
          onChange={(e) => set('countryCode', e.target.value)} style={{ appearance: 'auto' }}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Proxy list */}
      <div>
        <label className="form-label">
          Proxy List{' '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>(one per line — tested before each visit)</span>
        </label>
        <textarea className="input-dark" rows={5}
          placeholder={PROXY_PLACEHOLDER}
          value={form.proxyList} onChange={(e) => set('proxyList', e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.5, fontFamily: 'monospace', fontSize: 11 }} />
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.6 }}>
          <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Supported formats:</strong><br />
          <code style={{ color: 'rgba(255,255,255,0.5)' }}>host:port:user:pass</code> · {' '}
          <code style={{ color: 'rgba(255,255,255,0.5)' }}>user:pass@host:port</code> · {' '}
          <code style={{ color: 'rgba(255,255,255,0.5)' }}>http://user:pass@host:port</code> · {' '}
          <code style={{ color: 'rgba(255,255,255,0.5)' }}>socks5://user:pass@host:port</code><br />
          Leave empty to use Free VPN (if on) or your real IP.
          Proxy is tested <em>before each visit</em> — if it fails, the visit is skipped (never leaks your real IP).
        </div>
      </div>

      {/* Visit count */}
      <div>
        <label className="form-label">Visits per URL</label>
        <div className="flex items-center gap-3">
          <input type="range" min={1} max={100} value={form.visitCount}
            onChange={(e) => set('visitCount', parseInt(e.target.value))}
            style={{ flex: 1, accentColor: '#6366f1' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', minWidth: 28, textAlign: 'right' }}>
            {form.visitCount}
          </span>
        </div>
      </div>

      {/* Device type */}
      <div>
        <label className="form-label">Device Type</label>
        <div className="flex gap-2">
          {(['desktop', 'mobile', 'tablet'] as const).map((d) => (
            <button key={d} onClick={() => set('deviceType', d)} style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${form.deviceType === d ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
              background: form.deviceType === d ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: form.deviceType === d ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
              textTransform: 'capitalize',
            }}>
              {d === 'desktop' ? '🖥️' : d === 'mobile' ? '📱' : '📟'} {d}
            </button>
          ))}
        </div>
      </div>

      {/* Time on page */}
      <div>
        <label className="form-label">
          Time on Page: <span style={{ color: '#a5b4fc' }}>{form.timeOnPageMin}–{form.timeOnPageMax}s</span>
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Min (s)</div>
            <input type="number" className="input-dark" min={5} max={300} value={form.timeOnPageMin}
              onChange={(e) => set('timeOnPageMin', Math.max(5, parseInt(e.target.value) || 20))} />
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Max (s)</div>
            <input type="number" className="input-dark" min={5} max={300} value={form.timeOnPageMax}
              onChange={(e) => set('timeOnPageMax', Math.max(form.timeOnPageMin + 5, parseInt(e.target.value) || 60))} />
          </div>
        </div>
      </div>

      {/* Scroll speed */}
      <div>
        <label className="form-label">Scroll Speed</label>
        <div className="flex gap-2">
          {(['slow', 'medium', 'fast'] as const).map((s) => (
            <button key={s} onClick={() => set('scrollSpeed', s)} style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${form.scrollSpeed === s ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
              background: form.scrollSpeed === s ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: form.scrollSpeed === s ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
              textTransform: 'capitalize',
            }}>
              {s === 'slow' ? '🐢' : s === 'medium' ? '🚶' : '🐇'} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Internal links */}
      <div className="glass rounded-lg p-3 flex flex-col gap-2">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          <input type="checkbox" checked={form.clickInternalLinks}
            onChange={(e) => set('clickInternalLinks', e.target.checked)}
            style={{ accentColor: '#6366f1' }} />
          Browse internal links (extends session time &amp; pages viewed)
        </label>
        {form.clickInternalLinks && (
          <div>
            <label className="form-label">Max internal pages per visit</label>
            <input type="number" className="input-dark" min={1} max={20}
              value={form.maxInternalLinks}
              onChange={(e) => set('maxInternalLinks', Math.max(1, parseInt(e.target.value) || 3))} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <button className="btn-ghost flex-1" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn-primary flex-1" onClick={handleSubmit} disabled={busy}>
          {busy ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? '💾 Save Changes' : 'Create Task')}
        </button>
      </div>
    </div>
  );
}
