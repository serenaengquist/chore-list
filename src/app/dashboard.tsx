'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getTodayDateString,
  shouldAdvanceCycle,
  advanceCycle,
  initializeCycle,
  getTodayRoom,
  selectFeaturedTasks,
  AppConfig,
} from '@/lib/roomOfDay';

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
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    room: '',
    recurrence: 'weekly',
    due_next: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Room of the Day state
  const [roomOfDayState, setRoomOfDayState] = useState<AppConfig | null>(null);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [featuredTasks, setFeaturedTasks] = useState<Chore[]>([]);
  const [todayRoom, setTodayRoom] = useState<string | null>(null);
  const [showRoomOverride, setShowRoomOverride] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchChores();
      await fetchRoomOfDay();
    };
    init();
  }, []);

  // Update featured tasks whenever room selection or chores change
  useEffect(() => {
    if (!todayRoom || chores.length === 0) {
      setFeaturedTasks([]);
      return;
    }

    // Get pending tasks for today's room, prioritize recurring tasks
    const roomTasks = chores
      .filter((c) => c.room === todayRoom && c.status === 'pending')
      .sort((a, b) => {
        // Recurring tasks first
        const aRecurring = a.recurrence !== 'one-off' ? 0 : 1;
        const bRecurring = b.recurrence !== 'one-off' ? 0 : 1;
        if (aRecurring !== bRecurring) return aRecurring - bRecurring;
        // Then by creation date
        return new Date(a.id).getTime() - new Date(b.id).getTime();
      });

    const selected = selectFeaturedTasks(roomTasks, 5);
    setFeaturedTasks(selected);
  }, [todayRoom, chores]);

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

  const fetchAvailableRooms = (choresList: Chore[]): string[] => {
    const rooms = new Set<string>();
    choresList.forEach((chore) => {
      if (chore.room) rooms.add(chore.room);
    });
    return Array.from(rooms).sort();
  };

  const fetchRoomOfDay = async () => {
    try {
      // Get app config
      const { data: config, error: configError } = await supabase
        .from('app_config')
        .select('*')
        .eq('owner', 'user')
        .single();

      // Gracefully skip if table doesn't exist (setup not complete)
      if (configError) {
        const errorMsg = JSON.stringify(configError);
        if (errorMsg.includes('app_config') || errorMsg.includes('relation') || configError.code === '42P01') {
          console.warn('app_config table not yet created. Run SETUP_ROOM_OF_DAY.sql in your Supabase dashboard.');
          return;
        }

        // Skip if no row found (not an error, just empty)
        if (configError.code !== 'PGRST116') {
          throw configError;
        }
      }

      let appConfig = config as AppConfig | null;

      // If no config exists, try to create one (may fail if table not created yet)
      if (!appConfig) {
        const today = getTodayDateString();
        const { data: newConfig, error: insertError } = await supabase
          .from('app_config')
          .insert([{ owner: 'user', cycle_last_advanced_date: today }])
          .select()
          .single();

        if (insertError) {
          const errorMsg = JSON.stringify(insertError);
          if (errorMsg.includes('app_config') || errorMsg.includes('relation')) {
            console.warn('app_config table not yet created. Run SETUP_ROOM_OF_DAY.sql in your Supabase dashboard.');
            return;
          }
          throw insertError;
        }
        appConfig = newConfig as AppConfig;
      }

      // Get available rooms from chores
      const currentChores = chores.length > 0 ? chores : await fetchChoresForRoomInit();
      const rooms = fetchAvailableRooms(currentChores);
      setAvailableRooms(rooms);

      // Initialize or update cycle based on current rooms
      let { newCycle, newPointer } = initializeCycle(
        rooms,
        appConfig.room_cycle || [],
        appConfig.cycle_pointer || 0
      );

      // Check if we need to advance the cycle (new day)
      if (shouldAdvanceCycle(appConfig.cycle_last_advanced_date)) {
        const advanced = advanceCycle(newCycle, newPointer);
        newCycle = advanced.newCycle;
        newPointer = advanced.newPointer;

        // Update DB with new cycle state
        await supabase
          .from('app_config')
          .update({
            room_cycle: newCycle,
            cycle_pointer: newPointer,
            cycle_last_advanced_date: getTodayDateString(),
          })
          .eq('owner', 'user');
      }

      // Determine today's room (considering override)
      const room = getTodayRoom(
        newCycle,
        newPointer,
        appConfig.display_override_date,
        appConfig.display_override_room
      );

      setRoomOfDayState({
        ...appConfig,
        room_cycle: newCycle,
        cycle_pointer: newPointer,
        cycle_last_advanced_date: getTodayDateString(),
      });
      setTodayRoom(room);
    } catch (err) {
      console.error('Error fetching room of day:', err);
    }
  };

  const fetchChoresForRoomInit = async (): Promise<Chore[]> => {
    const { data } = await supabase.from('chores').select('*');
    return data || [];
  };

  const handleRoomOverride = async (newRoom: string) => {
    try {
      const today = getTodayDateString();
      await supabase
        .from('app_config')
        .update({
          display_override_date: today,
          display_override_room: newRoom,
        })
        .eq('owner', 'user');

      setTodayRoom(newRoom);
      setShowRoomOverride(false);
    } catch (err) {
      console.error('Error setting room override:', err);
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

      if (editingChore) {
        // Update existing chore
        const { error: updateError } = await supabase
          .from('chores')
          .update({
            name: formData.name.trim(),
            room: formData.room.trim(),
            recurrence: formData.recurrence,
            due_next: formData.due_next || null,
            notes: formData.notes || null,
          })
          .eq('id', editingChore.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new chore
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
      }

      // Refresh chores and room of day
      await fetchChores();
      await fetchRoomOfDay();

      // Reset form and close modals
      setFormData({
        name: '',
        room: '',
        recurrence: 'weekly',
        due_next: '',
        notes: '',
      });
      setShowCreateForm(false);
      setEditingChore(null);
      setSelectedChore(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save chore');
      console.error('Error saving chore:', err);
    } finally {
      setCreating(false);
    }
  };

  const openEditForm = (chore: Chore) => {
    setEditingChore(chore);
    setFormData({
      name: chore.name,
      room: chore.room,
      recurrence: chore.recurrence,
      due_next: chore.due_next || '',
      notes: chore.notes || '',
    });
    setSelectedChore(null);
  };

  const handleDuplicate = async (chore: Chore) => {
    try {
      const { error: insertError } = await supabase
        .from('chores')
        .insert([
          {
            name: chore.name,
            room: chore.room,
            recurrence: chore.recurrence,
            due_next: chore.due_next || null,
            notes: chore.notes || null,
            status: 'pending',
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      await fetchChores();
      setSelectedChore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate chore');
      console.error('Error duplicating chore:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('chores')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchChores();
      setSelectedChore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chore');
      console.error('Error deleting chore:', err);
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

      {/* Room of the Day Section */}
      {!loading && availableRooms.length >= 2 && todayRoom && (
        <div className="card" style={{ borderColor: 'var(--color-voltage)', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-fg-muted)' }}>
                ROOM OF THE DAY
              </div>
              <h2 style={{ margin: '0', marginTop: 'var(--space-sm)', color: 'var(--color-voltage)' }}>
                {todayRoom}
              </h2>
            </div>
            <button
              onClick={() => setShowRoomOverride(!showRoomOverride)}
              style={{
                background: 'none',
                border: '1px solid var(--color-fg-muted)',
                color: 'var(--color-fg)',
                padding: 'var(--space-sm) var(--space-md)',
                cursor: 'pointer',
                fontSize: 'var(--text-body-sm)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Change
            </button>
          </div>

          {/* Room override dropdown */}
          {showRoomOverride && (
            <div style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px dashed var(--color-hairline)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {availableRooms.filter((r) => r !== todayRoom).map((room) => (
                  <button
                    key={room}
                    onClick={() => handleRoomOverride(room)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-fg)',
                      textAlign: 'left',
                      padding: 'var(--space-sm)',
                      cursor: 'pointer',
                      fontSize: 'var(--text-body-md)',
                    }}
                  >
                    → {room}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured tasks */}
          {featuredTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {featuredTasks.map((chore) => (
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
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-sunk)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
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
                  <div style={{ fontWeight: '500', textAlign: 'left' }}>
                    {chore.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textAlign: 'right' }}>
                    {chore.room}
                  </div>
                  <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textTransform: 'capitalize', textAlign: 'right' }}>
                    {chore.recurrence}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-fg-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
              No pending chores for {todayRoom} today
            </div>
          )}
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
            onClick={() => {
              setEditingChore(null);
              setFormData({
                name: '',
                room: '',
                recurrence: 'weekly',
                due_next: '',
                notes: '',
              });
              setShowCreateForm(true);
            }}
            style={{ padding: 'var(--space-md) var(--space-xl)' }}
          >
            + Add a Chore
          </button>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingChore) && (
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
          onClick={() => !creating && (setShowCreateForm(false), setEditingChore(null))}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ margin: 0 }}>{editingChore ? 'EDIT CHORE' : 'NEW CHORE'}</h2>
              <button
                onClick={() => !creating && (setShowCreateForm(false), setEditingChore(null))}
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
                  onClick={() => !creating && (setShowCreateForm(false), setEditingChore(null))}
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
                  {creating ? (editingChore ? 'Saving...' : 'Creating...') : (editingChore ? 'Save Changes' : 'Create Chore')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedChore && !editingChore && !showCreateForm && (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)', borderTop: '1px dashed var(--color-hairline)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button
                  className="btn-secondary"
                  onClick={() => openEditForm(selectedChore)}
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleDuplicate(selectedChore)}
                  style={{ flex: 1 }}
                >
                  Duplicate
                </button>
              </div>
              <button
                className="btn-secondary"
                onClick={() => handleDelete(selectedChore.id)}
                style={{ borderColor: 'var(--color-glitch-red)', color: 'var(--color-glitch-red)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
