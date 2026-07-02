'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Chore {
  id: string;
  name: string;
  room: string;
  assigned_to: string;
  status: 'pending' | 'done';
  due_date?: string;
  recurrence?: string;
}

export default function Dashboard() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  useEffect(() => {
    fetchChores();
  }, []);

  const fetchChores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, use mock data until Supabase tables are created
      const mockChores: Chore[] = [
        {
          id: '1',
          name: 'Take out trash',
          room: 'Kitchen',
          assigned_to: 'Alex',
          status: 'pending',
          due_date: '2026-07-03',
          recurrence: 'weekly',
        },
        {
          id: '2',
          name: 'Clean bathroom',
          room: 'Bathroom',
          assigned_to: 'Jordan',
          status: 'pending',
          due_date: '2026-07-05',
          recurrence: 'weekly',
        },
        {
          id: '3',
          name: 'Vacuum living room',
          room: 'Living Room',
          assigned_to: 'Morgan',
          status: 'done',
          due_date: '2026-07-02',
          recurrence: 'weekly',
        },
        {
          id: '4',
          name: 'Wash dishes',
          room: 'Kitchen',
          assigned_to: 'Alex',
          status: 'pending',
          due_date: '2026-07-02',
          recurrence: 'daily',
        },
        {
          id: '5',
          name: 'Do laundry',
          room: 'Laundry',
          assigned_to: 'Jordan',
          status: 'pending',
          due_date: '2026-07-04',
          recurrence: 'weekly',
        },
      ];

      setChores(mockChores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chores');
    } finally {
      setLoading(false);
    }
  };

  const filteredChores = chores.filter((chore) => {
    if (filter === 'pending') return chore.status === 'pending';
    if (filter === 'done') return chore.status === 'done';
    return true;
  });

  const pendingCount = chores.filter((c) => c.status === 'pending').length;
  const doneCount = chores.filter((c) => c.status === 'done').length;

  const toggleDone = (id: string) => {
    setChores((prev) =>
      prev.map((chore) =>
        chore.id === id
          ? { ...chore, status: chore.status === 'pending' ? 'done' : 'pending' }
          : chore
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xl)', paddingBlock: 'var(--space-3xl)' }}>
      {/* Header */}
      <div>
        <h1>CHORE BOARD</h1>
        <p className="text-muted" style={{ marginTop: 'var(--space-sm)' }}>
          See what needs doing and who's handling it
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
        <div className="card">
          <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-mute)', marginBottom: 'var(--space-md)' }}>
            PENDING
          </div>
          <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 'bold', color: 'var(--color-voltage)' }}>
            {pendingCount}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-mute)', marginBottom: 'var(--space-md)' }}>
            COMPLETED
          </div>
          <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 'bold', color: 'var(--color-glitch-green)' }}>
            {doneCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'done'] as const).map((f) => (
          <button
            key={f}
            className={f === filter ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'uppercase' }}
          >
            {f === 'all' ? 'All Chores' : f === 'pending' ? 'Pending' : 'Done'}
          </button>
        ))}
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
      {!loading && !error && filteredChores.length === 0 && (
        <div className="card" style={{ textAlign: 'center', paddingBlock: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>📋</div>
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>No {filter !== 'all' ? filter : ''} chores</h3>
          <p className="text-muted">
            {filter === 'pending' && 'Everything is done! Way to go.'}
            {filter === 'done' && 'Nothing completed yet.'}
            {filter === 'all' && 'Add your first chore to get started.'}
          </p>
        </div>
      )}

      {/* Chore List */}
      {!loading && !error && filteredChores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredChores.map((chore) => (
            <div
              key={chore.id}
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 'var(--space-lg)',
                alignItems: 'center',
                opacity: chore.status === 'done' ? 0.7 : 1,
              }}
            >
              {/* Chore Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <h3 style={{ margin: 0 }}>
                    {chore.status === 'done' && <span style={{ textDecoration: 'line-through' }}>✓ </span>}
                    {chore.name}
                  </h3>
                  {chore.status === 'pending' && (
                    <span className="chip" style={{ backgroundColor: 'var(--color-voltage)', color: 'var(--color-ink)', borderColor: 'var(--color-voltage)', fontWeight: 'bold', padding: '4px 10px' }}>
                      PENDING
                    </span>
                  )}
                  {chore.status === 'done' && (
                    <span className="chip" style={{ backgroundColor: 'var(--color-glitch-green)', color: 'white', borderColor: 'var(--color-glitch-green)', fontWeight: 'bold', padding: '4px 10px' }}>
                      DONE
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 'var(--space-xl)', fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>ROOM:</span> {chore.room}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>ASSIGNED:</span> {chore.assigned_to}
                  </div>
                  {chore.due_date && (
                    <div>
                      <span style={{ fontWeight: 'bold' }}>DUE:</span> {new Date(chore.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => toggleDone(chore.id)}
                className={chore.status === 'pending' ? 'btn-primary' : 'btn-secondary'}
                style={{ whiteSpace: 'nowrap' }}
              >
                {chore.status === 'pending' ? 'Mark Done' : 'Undo'}
              </button>
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
    </div>
  );
}
