'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Chore {
  id: string;
  name: string;
  room: string;
  assigned_to: string | string[];
  status: 'pending' | 'done';
  due_date?: string;
  due_next?: string;
  recurrence: 'daily' | 'weekly' | 'one-off';
  notes?: string;
}

export default function Dashboard() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);

  useEffect(() => {
    fetchChores();
  }, []);

  const fetchChores = async () => {
    try {
      setLoading(true);
      setError(null);

      const mockChores: Chore[] = [
        {
          id: '1',
          name: 'Take out trash',
          room: 'Kitchen',
          assigned_to: 'Alex',
          status: 'pending',
          due_next: '2026-07-03',
          recurrence: 'weekly',
          notes: 'Bin goes out Tuesday nights',
        },
        {
          id: '2',
          name: 'Clean bathroom',
          room: 'Bathroom',
          assigned_to: 'Jordan',
          status: 'pending',
          due_next: '2026-07-05',
          recurrence: 'weekly',
          notes: 'Includes toilet, sink, mirror, floor',
        },
        {
          id: '3',
          name: 'Vacuum living room',
          room: 'Living Room',
          assigned_to: 'Morgan',
          status: 'done',
          due_next: '2026-07-09',
          recurrence: 'weekly',
          notes: 'Focus on under couch cushions',
        },
        {
          id: '4',
          name: 'Wash dishes',
          room: 'Kitchen',
          assigned_to: ['Alex', 'Morgan'],
          status: 'pending',
          due_next: '2026-07-02',
          recurrence: 'daily',
          notes: 'Load dishwasher or hand wash',
        },
        {
          id: '5',
          name: 'Do laundry',
          room: 'Laundry',
          assigned_to: 'Jordan',
          status: 'pending',
          due_next: '2026-07-04',
          recurrence: 'weekly',
          notes: 'Check pockets, use cold water',
        },
      ];

      setChores(mockChores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chores');
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setChores((prev) =>
      prev.map((chore) =>
        chore.id === id
          ? { ...chore, status: chore.status === 'pending' ? 'done' : 'pending' }
          : chore
      )
    );
  };

  // Sort: pending first, done last
  const sortedChores = [...chores].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'done') return -1;
    if (a.status === 'done' && b.status === 'pending') return 1;
    return 0;
  });

  const pendingCount = chores.filter((c) => c.status === 'pending').length;
  const doneCount = chores.filter((c) => c.status === 'done').length;

  const getAssigneeLabel = (assigned: string | string[]) => {
    if (Array.isArray(assigned)) {
      return assigned.join(', ');
    }
    return assigned;
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
              gridTemplateColumns: '44px 1fr auto auto auto',
              gap: 'var(--space-md)',
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
            <div></div>
            <div>CHORE</div>
            <div>ROOM</div>
            <div>RECURRENCE</div>
            <div>ASSIGNED</div>
          </div>

          {/* Chore Rows */}
          {sortedChores.map((chore) => (
            <div
              key={chore.id}
              onClick={() => setSelectedChore(chore)}
              style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr auto auto auto',
                gap: 'var(--space-md)',
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
                }}
              >
                {chore.name}
              </div>

              {/* Room */}
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap' }}>
                {chore.room}
              </div>

              {/* Recurrence */}
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {chore.recurrence}
              </div>

              {/* Assignee */}
              <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', whiteSpace: 'nowrap' }}>
                {getAssigneeLabel(chore.assigned_to)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Chore CTA */}
      {!loading && !error && (
        <div style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>
          <button className="btn-primary" style={{ padding: 'var(--space-md) var(--space-xl)' }}>
            + Add a Chore
          </button>
        </div>
      )}

      {/* Detail Modal/Drawer */}
      {selectedChore && (
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
                onChange={(e) => {
                  toggleDone(selectedChore.id);
                  setSelectedChore({ ...selectedChore, status: selectedChore.status === 'pending' ? 'done' : 'pending' });
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
                  Due Next
                </label>
                <div style={{ fontSize: 'var(--text-body-md)' }}>
                  {selectedChore.due_next ? new Date(selectedChore.due_next).toLocaleDateString() : 'No date'}
                </div>
              </div>

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

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)', marginBottom: 'var(--space-sm)' }}>
                  Assigned To
                </label>
                <div style={{ fontSize: 'var(--text-body-md)' }}>
                  {getAssigneeLabel(selectedChore.assigned_to)}
                </div>
              </div>

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
