'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Chore {
  id: string;
  name: string;
  room: string;
  status: 'pending' | 'done';
  due_next?: string;
  recurrence: 'daily' | 'weekly' | 'one-off';
  notes?: string;
}

interface CreateFormData {
  name: string;
  room: string;
  recurrence: 'daily' | 'weekly' | 'one-off';
  due_next?: string;
  notes?: string;
}

export default function Dashboard() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    room: '',
    recurrence: 'weekly',
    due_next: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchChores();
  }, []);

  const fetchChores = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('chores')
        .select('*')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setChores(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chores');
      console.error('Error fetching chores:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const chore = chores.find((c) => c.id === id);
    if (!chore) return;

    const newStatus = chore.status === 'pending' ? 'done' : 'pending';

    try {
      const { error: updateError } = await supabase
        .from('chores')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      setChores((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: newStatus } : c
        )
      );
    } catch (err) {
      console.error('Error updating chore:', err);
      setError(err instanceof Error ? err.message : 'Failed to update chore');
    }
  };

  const handleRowClick = (chore: Chore, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).type === 'checkbox') {
      return;
    }
    setSelectedChore(chore);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Chore name is required');
      return;
    }

    if (!formData.room.trim()) {
      setFormError('Room is required');
      return;
    }

    try {
      setCreating(true);

      const { error: insertError } = await supabase
        .from('chores')
        .insert([
          {
            name: formData.name.trim(),
            room: formData.room.trim(),
            recurrence: formData.recurrence,
            due_next: formData.due_next || null,
            notes: formData.notes || null,
            status: 'pending',
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      // Refresh chores
      await fetchChores();

      // Reset form and close modal
      setFormData({
        name: '',
        room: '',
        recurrence: 'weekly',
        due_next: '',
        notes: '',
      });
      setShowCreateForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create chore');
      console.error('Error creating chore:', err);
    } finally {
      setCreating(false);
    }
  };

  const sortedChores = [...chores].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'done') return -1;
    if (a.status === 'done' && b.status === 'pending') return 1;
    return 0;
  });

  const pendingCount = chores.filter((c) => c.status === 'pending').length;
  const doneCount = chores.filter((c) => c.status === 'done').length;

  const gridStyle = {
    gridTemplateColumns: '44px 1fr 150px 150px',
    gap: 'var(--space-lg)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xl)', paddingBlock: 'var(--space-3xl)' }}>
      {/* Header */}
      <div>
        <h1>CHORE BOARD</h1>
        <p className="text-muted" style={{ marginTop: 'var(--space-sm)' }}>
          {pendingCount} pending · {doneCount} done
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-mute)' }}>
          Loading chores...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--color-glitch-red)', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ color: 'var(--color-glitch-red)', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>
            Error
          </div>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)' }}>
            {error}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && chores.length === 0 && (
        <div className="card" style={{ textAlign: 'center', paddingBlock: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>📋</div>
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>No chores yet</h3>
          <p className="text-muted">Add your first chore to get started.</p>
        </div>
      )}

      {/* Chore Checklist */}
      {!loading && !error && sortedChores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Header Row */}
          <div
            style={{
              display: 'grid',
              ...gridStyle,
              paddingBlock: 'var(--space-md)',
              paddingInline: 'var(--space-lg)',
              borderBottom: 'var(--border-hairline)',
              fontSize: 'var(--text-label)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wider)',
              color: 'var(--color-fg-muted)',
              fontWeight: 'bold',
            }}
          >
            <div style={{ textAlign: 'left' }}></div>
            <div style={{ textAlign: 'left' }}>CHORE</div>
            <div style={{ textAlign: 'right' }}>ROOM</div>
            <div style={{ textAlign: 'right' }}>RECURRENCE</div>
          </div>

          {/* Chore Rows */}
          {sortedChores.map((chore) => (
            <div
              key={chore.id}
              onClick={(e) => handleRowClick(chore, e)}
              style={{
                display: 'grid',
                ...gridStyle,
                paddingBlock: 'var(--space-md)',
                paddingInline: 'var(--space-lg)',
                borderBottom: '1px solid var(--color-surface-sunk)',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 80ms linear',
                backgroundColor: chore.status === 'done' ? 'var(--color-surface-sunk)' : 'transparent',
                opacity: chore.status === 'done' ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (chore.status === 'pending') {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-sunk)';
                }
              }}
              onMouseLeave={(e) => {
                if (chore.status === 'pending') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={chore.status === 'done'}
                onChange={(e) => toggleDone(chore.id, e as any)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: 'var(--color-voltage)',
                }}
              />

              {/* Chore Name */}
              <div
                style={{
                  textDecoration: chore.status === 'done' ? 'line-through' : 'none',
                  fontWeight: chore.status === 'pending' ? '500' : '400',
                  textAlign: 'left',
                }}
              >
                {chore.name}
              </div>

              {/* Room */}
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textAlign: 'right' }}>
                {chore.room}
              </div>

              {/* Recurrence */}
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textTransform: 'capitalize', textAlign: 'right' }}>
                {chore.recurrence}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Chore CTA */}
      {!loading && !error && (
        <div style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
            style={{ padding: 'var(--space-md) var(--space-xl)' }}
          >
            + Add a Chore
          </button>
        </div>
      )}

      {/* Create Chore Modal */}
      {showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
          onClick={() => !creating && setShowCreateForm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ margin: 0 }}>NEW CHORE</h2>
              <button
                onClick={() => !creating && setShowCreateForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-fg)',
                  padding: 0,
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            {/* Error */}
            {formError && (
              <div className="card" style={{ marginBottom: 'var(--space-lg)', borderColor: 'var(--color-glitch-red)', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ color: 'var(--color-glitch-red)', fontSize: 'var(--text-body-sm)' }}>
                  {formError}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {/* Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Chore Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Wash dishes"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                  }}
                />
              </div>

              {/* Room Field */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Room *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Kitchen, Bathroom"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                  }}
                />
              </div>

              {/* Recurrence Field */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Recurrence
                </label>
                <select
                  value={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as 'daily' | 'weekly' | 'one-off' })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-fg)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="one-off">One-off</option>
                </select>
              </div>

              {/* Due Date Field */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Due Next
                </label>
                <input
                  type="date"
                  value={formData.due_next}
                  onChange={(e) => setFormData({ ...formData, due_next: e.target.value })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                  }}
                />
              </div>

              {/* Notes Field */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Notes
                </label>
                <textarea
                  placeholder="Add any instructions or context..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '10px 13px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-body-md)',
                    minHeight: '80px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-lg)', borderTop: '1px dashed var(--color-hairline)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                  style={{ flex: 1 }}
                >
                  {creating ? 'Creating...' : 'Create Chore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedChore && !showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)',
          }}
          onClick={() => setSelectedChore(null)}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ margin: 0 }}>{selectedChore.name}</h2>
              <button
                onClick={() => setSelectedChore(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-fg)',
                  padding: 0,
                  lineHeight: '1',
                }}
              >
                ✕
              </button>
            </div>

            {/* Checkbox in Detail */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <input
                type="checkbox"
                checked={selectedChore.status === 'done'}
                onChange={async (e) => {
                  const newStatus = selectedChore.status === 'pending' ? 'done' : 'pending';
                  try {
                    const { error: updateError } = await supabase
                      .from('chores')
                      .update({ status: newStatus })
                      .eq('id', selectedChore.id);

                    if (updateError) throw updateError;

                    setChores((prev) =>
                      prev.map((c) => (c.id === selectedChore.id ? { ...c, status: newStatus } : c))
                    );
                    setSelectedChore({ ...selectedChore, status: newStatus });
                  } catch (err) {
                    console.error('Error updating chore:', err);
                  }
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  accentColor: 'var(--color-voltage)',
                }}
              />
              <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)' }}>
                {selectedChore.status === 'pending' ? 'Mark as done' : 'Mark as pending'}
              </span>
            </div>

            {/* Detail Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Room
                </label>
                <div style={{ fontSize: 'var(--text-body-md)' }}>{selectedChore.room}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Recurrence
                </label>
                <div style={{ fontSize: 'var(--text-body-md)', textTransform: 'capitalize' }}>{selectedChore.recurrence}</div>
              </div>

              {selectedChore.due_next && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                    Due Next
                  </label>
                  <div style={{ fontSize: 'var(--text-body-md)' }}>
                    {new Date(selectedChore.due_next).toLocaleDateString()}
                  </div>
                </div>
              )}

              {selectedChore.notes && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                    Notes
                  </label>
                  <div style={{ fontSize: 'var(--text-body-md)', fontFamily: 'var(--font-prose)', lineHeight: '1.7' }}>
                    {selectedChore.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)', borderTop: '1px dashed var(--color-hairline)' }}>
              <button className="btn-secondary" style={{ flex: 1 }}>
                Duplicate
              </button>
              <button className="btn-secondary" style={{ flex: 1 }}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
